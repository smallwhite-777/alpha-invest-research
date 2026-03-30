# Local Search Agent - Enhanced with Precise Search
# Implements keyword-based line number search with offset/limit reading

import sys
import time
import logging
import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

sys.path.insert(0, str(Path(__file__).parent.parent))

from knowledge_base.precise_searcher import (
    PreciseSearcher, FileSearchResult, LineMatch,
    create_precise_searcher
)
from knowledge_base.structurer import InfoStructurer, StructuredInfo
from agents.intent_agent import IntentResult, IntentType

logger = logging.getLogger(__name__)


@dataclass
class MetricValue:
    """Extracted metric value with source"""
    name: str
    value: str
    unit: str
    year: str
    source: str
    confidence: float


class SearchAgent:
    """
    Enhanced Search Agent with precise keyword-based search.

    Workflow:
    1. Intent Analysis -> Extract keywords, entities, year filter
    2. Parallel File Discovery -> Find relevant files by name/path
    3. File Prioritization -> Rank files by type and relevance
    4. Keyword Line Search -> Find line numbers containing keywords (grep-like)
    5. Precise Extraction -> Read only relevant lines with offset/limit
    6. Cross-Validation -> Verify data from multiple sources
    """

    def __init__(
        self,
        research_reports_dir: Optional[Path] = None,
        news_dir: Optional[Path] = None,
        financial_reports_dir: Optional[Path] = None,
        daily_quote_dir: Optional[Path] = None,
        max_results: int = 10
    ):
        """
        Initialize SearchAgent with PreciseSearcher.

        Args:
            research_reports_dir: Path to research reports directory
            news_dir: Path to news directory
            financial_reports_dir: Path to financial reports directory
            daily_quote_dir: Path to daily quote CSV directory
            max_results: Maximum results to return
        """
        self.precise_searcher = create_precise_searcher(
            research_reports_dir=research_reports_dir,
            news_dir=news_dir,
            financial_reports_dir=financial_reports_dir,
            daily_quote_dir=daily_quote_dir
        )
        self.structurer = InfoStructurer()
        self.max_results = max_results

        logger.info(f"SearchAgent initialized with PreciseSearcher, max_results={max_results}")

    def search(
        self,
        intent_result: IntentResult,
        strategy: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search knowledge base based on intent result using precise search.

        Args:
            intent_result: Result from IntentAgent
            strategy: Optional search strategy override

        Returns:
            Dict with structured_info, context, sources, search_stats
        """
        start_time = time.time()

        # Extract search parameters from intent
        keywords = self._extract_keywords(intent_result)
        year_filter = self._extract_year_filter(intent_result)
        source_types = self._get_source_types(intent_result, strategy)

        logger.info(f"Precise search: keywords={keywords}, year={year_filter}, sources={source_types}")

        # Execute precise search
        search_results, stats = self.precise_searcher.search(
            keywords=keywords,
            max_results=self.max_results,
            source_types=source_types,
            year_filter=year_filter
        )

        # Extract and structure content
        structured_infos = self._structure_results(search_results)

        # Extract key metrics if financial analysis
        metrics = []
        if intent_result.intent in [IntentType.FINANCIAL_ANALYSIS, IntentType.COMPANY_ANALYSIS]:
            metrics = self._extract_financial_metrics(search_results, year_filter)

        # Build context with metrics included
        context = self._build_enhanced_context(structured_infos, metrics, keywords, search_results)

        # Build sources list
        sources = self._build_sources_list(search_results)

        duration = time.time() - start_time
        logger.info(f"Search completed in {duration:.2f}s, found {len(search_results)} results, "
                   f"{len(metrics)} metrics extracted")

        return {
            "structured_info": structured_infos,
            "context": context,
            "sources": sources,
            "metrics": metrics,
            "search_stats": {
                "total_results": len(search_results),
                "keywords_used": keywords,
                "year_filter": year_filter,
                "duration_seconds": round(duration, 2),
                "keyword_matches": stats.keyword_matches,
                "files_searched": stats.files_searched,
                "cross_validated": stats.cross_validated
            }
        }

    def _extract_keywords(self, intent_result: IntentResult) -> List[str]:
        """Extract and expand keywords from intent"""
        keywords = list(set(intent_result.keywords + intent_result.entities))

        # If no keywords/entities, try to use company name and stock code as fallback
        if not keywords:
            if intent_result.company_name:
                keywords.append(intent_result.company_name)
            if intent_result.stock_code:
                keywords.append(intent_result.stock_code)

        # Add related terms for company analysis
        company_name = intent_result.company_name
        stock_code = intent_result.stock_code

        if company_name:
            # Add company name variations
            keywords.append(company_name)

            # Common abbreviations
            abbreviations = {
                '紫金矿业': ['紫金', '紫金矿业', '601899'],
                '宁德时代': ['宁德', '宁德时代', '300750'],
                '比亚迪': ['比亚迪', 'BYD', '002594'],
                '贵州茅台': ['茅台', '贵州茅台', '600519'],
                # Test case companies
                '三一重工': ['三一', '三一重工', '600031', '600031.SH'],
                '恒立液压': ['恒立', '恒立液压', '601100', '601100.SH'],
                '牧原股份': ['牧原', '牧原股份', '002714', '002714.SZ'],
                '爱尔眼科': ['爱尔', '爱尔眼科', '300015', '300015.SZ'],
                '徐工机械': ['徐工', '徐工机械', '000425', '000425.SZ', '425'],
            }

            if company_name in abbreviations:
                keywords.extend(abbreviations[company_name])

        if stock_code:
            keywords.append(stock_code)

        # Deduplicate
        return list(set(keywords))

    def _extract_year_filter(self, intent_result: IntentResult) -> Optional[str]:
        """Extract year filter from intent"""
        # Check for year in entities
        for entity in intent_result.entities:
            if entity.isdigit() and len(entity) == 4:
                return entity

        # Check for year in original query
        query = intent_result.original_query
        year_match = re.search(r'\b(20\d{2})\b', query)
        if year_match:
            return year_match.group(1)

        # Default to most recent years for financial data
        if intent_result.intent in [IntentType.FINANCIAL_ANALYSIS, IntentType.COMPANY_ANALYSIS]:
            return "2024"  # Prefer most recent year

        return None

    def _get_source_types(
        self,
        intent_result: IntentResult,
        strategy: Optional[Dict[str, Any]]
    ) -> Optional[List[str]]:
        """Determine source types based on intent"""
        if strategy and 'source_types' in strategy:
            return strategy['source_types']

        intent_to_sources = {
            IntentType.FINANCIAL_ANALYSIS: ['financial', 'research'],
            IntentType.COMPANY_ANALYSIS: ['research', 'financial'],
            IntentType.INDUSTRY_ANALYSIS: ['research', 'news'],
            IntentType.COMPARISON: ['research', 'financial'],
            IntentType.TREND_PREDICTION: ['research', 'news'],
            IntentType.VALUATION: ['research', 'financial'],
            IntentType.RISK_ASSESSMENT: ['research', 'financial', 'news'],
            IntentType.GENERAL_QUESTION: ['research', 'news'],
        }

        return intent_to_sources.get(intent_result.intent)

    def _structure_results(self, search_results: List[FileSearchResult]) -> List[StructuredInfo]:
        """Structure search results into StructuredInfo objects"""
        structured = []

        for result in search_results:
            # For JSONL files, extract the specific records
            if result.source_type == 'history_jsonl':
                infos = self._structure_jsonl_result(result)
                structured.extend(infos)
            else:
                info = self.structurer.structure_content(
                    content=result.extracted_content,
                    company_name=result.company_name,
                    stock_code=result.stock_code,
                    source=result.file_path,
                    broker=result.broker,
                    date=result.date
                )
                structured.append(info)

        return structured

    def _structure_jsonl_result(self, result: FileSearchResult) -> List[StructuredInfo]:
        """Structure JSONL results by extracting specific records"""
        infos = []

        for line_match in result.line_matches[:5]:  # Limit to 5 records
            record = self.precise_searcher.extract_jsonl_record(
                result.file_path,
                line_match.line_number
            )

            if record:
                content = record.get('content', '')[:3000]  # Limit content
                source_file = record.get('source_file', '')

                info = self.structurer.structure_content(
                    content=content,
                    company_name=result.company_name,
                    stock_code=result.stock_code,
                    source=f"{result.file_path}::{source_file}",
                    broker=record.get('broker', ''),
                    date=record.get('date', '')
                )
                infos.append(info)

        return infos

    def _extract_financial_metrics(
        self,
        search_results: List[FileSearchResult],
        year_filter: Optional[str]
    ) -> List[MetricValue]:
        """
        Extract financial metrics from search results.
        Uses regex patterns to find numeric values.
        """
        metrics = []

        # Metric patterns with Chinese and English names
        metric_patterns = {
            '营业收入': [
                r'营业收入[：:\s]*([\d,.]+)\s*(亿|万)?元?',
                r'营收[：:\s]*([\d,.]+)\s*(亿|万)?',
                r'主营业务收入[：:\s]*([\d,.]+)\s*(亿|万)?',
            ],
            '净利润': [
                r'净利润[：:\s]*([\d,.]+)\s*(亿|万)?元?',
                r'归母净利润[：:\s]*([\d,.]+)\s*(亿|万)?',
            ],
            '毛利率': [
                r'毛利率[：:\s]*([\d.]+)\s*%?',
                r'综合毛利率[：:\s]*([\d.]+)\s*%?',
            ],
            '净利率': [
                r'净利率[：:\s]*([\d.]+)\s*%?',
                r'销售净利率[：:\s]*([\d.]+)\s*%?',
            ],
            'ROE': [
                r'ROE[：:\s]*([\d.]+)\s*%?',
                r'净资产收益率[：:\s]*([\d.]+)\s*%?',
            ],
            '总资产': [
                r'总资产[：:\s]*([\d,.]+)\s*(亿|万)?元?',
                r'资产总计[：:\s]*([\d,.]+)\s*(亿|万)?',
            ],
            '每股收益': [
                r'每股收益[：:\s]*([\d.]+)\s*元?',
                r'EPS[：:\s]*([\d.]+)',
            ],
            'PE': [
                r'PE[（(]TTM[)）]?[：:\s]*([\d.]+)',
                r'市盈率[：:\s]*([\d.]+)',
            ],
            'PB': [
                r'PB[：:\s]*([\d.]+)',
                r'市净率[：:\s]*([\d.]+)',
            ],
            '矿产铜': [
                r'矿产铜[（(]?万吨[)）]?[：:\s]*([\d,.]+)',
                r'矿产铜[：:\s]*([\d,.]+)\s*万吨',
                r'铜产量[：:\s]*([\d,.]+)\s*万吨',
            ],
            '矿产金': [
                r'矿产金[（(]?吨[)）]?[：:\s]*([\d,.]+)',
                r'矿产金[：:\s]*([\d,.]+)\s*吨',
                r'金产量[：:\s]*([\d,.]+)\s*吨',
                r'黄金产量[：:\s]*([\d,.]+)\s*吨',
            ],
            '矿产银': [
                r'矿产银[（(]?吨[)）]?[：:\s]*([\d,.]+)',
                r'矿产银[：:\s]*([\d,.]+)\s*吨',
                r'银产量[：:\s]*([\d,.]+)\s*吨',
            ],
            '矿产锌': [
                r'矿产锌[（(]?万吨[)）]?[：:\s]*([\d,.]+)',
                r'矿产锌[：:\s]*([\d,.]+)\s*万吨',
                r'锌产量[：:\s]*([\d,.]+)\s*万吨',
            ],
            '经营性现金流': [
                r'经营性现金流[：:\s]*([\d,.]+)\s*(亿|万)?',
                r'经营活动现金流[：:\s]*([\d,.]+)\s*(亿|万)?',
            ],
            '资产负债率': [
                r'资产负债率[：:\s]*([\d.]+)\s*%?',
            ],
        }

        extracted_values = {}  # metric_name -> {value, year, source}

        for result in search_results:
            content = result.extracted_content

            for metric_name, patterns in metric_patterns.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        value = match.group(1)
                        unit = match.group(2) if len(match.groups()) > 1 else ''

                        # Try to find year near the value
                        context = content[max(0, match.start()-100):match.end()+100]
                        year_match = re.search(r'(20\d{2})', context)
                        year = year_match.group(1) if year_match else (result.date or year_filter or '')

                        # Store the best value for each metric
                        if metric_name not in extracted_values or year > extracted_values[metric_name]['year']:
                            extracted_values[metric_name] = {
                                'value': value,
                                'unit': unit,
                                'year': year,
                                'source': result.file_path
                            }

        # Convert to MetricValue objects
        for metric_name, data in extracted_values.items():
            metrics.append(MetricValue(
                name=metric_name,
                value=data['value'],
                unit=data['unit'],
                year=data['year'],
                source=data['source'],
                confidence=0.8 if data['year'] else 0.5
            ))

        return metrics

    def _build_enhanced_context(
        self,
        structured_infos: List[StructuredInfo],
        metrics: List[MetricValue],
        keywords: List[str],
        raw_results: Optional[List[FileSearchResult]] = None
    ) -> str:
        """Build enhanced context with metrics and raw content"""
        context_parts = []

        # Add metrics summary first (high priority)
        if metrics:
            context_parts.append("## 关键财务指标\n")
            for metric in metrics:
                context_parts.append(f"- {metric.name}: {metric.value}{metric.unit} ({metric.year})")

            context_parts.append("\n")

        # Add raw content from financial reports if available
        if raw_results:
            for result in raw_results:
                if result.source_type == 'financial_report' and result.extracted_content:
                    context_parts.append(f"\n## 财务报告数据 ({result.date})\n")
                    # Take first 2000 chars of financial report
                    content = result.extracted_content[:2000]
                    context_parts.append(content)

        # Add structured content
        for i, info in enumerate(structured_infos[:5]):  # Limit to 5 sources
            context_parts.append(f"\n### 来源 {i+1}: {info.company_name}")
            if info.broker:
                context_parts.append(f" ({info.broker}, {info.date})")

            # Use summary and key_points instead of content
            if info.summary:
                context_parts.append(f"\n{info.summary[:1500]}")
            elif info.key_points:
                context_parts.append(f"\n" + "\n".join(f"- {p}" for p in info.key_points[:10]))
            elif info.financial_data:
                # Include financial data if available
                context_parts.append(f"\n财务数据: {info.financial_data}")

        context = '\n'.join(context_parts)

        # Truncate if too long
        if len(context) > 8000:
            context = context[:8000] + "\n\n... (内容已截断)"

        return context

    def _build_sources_list(self, search_results: List[FileSearchResult]) -> List[Dict]:
        """Build a list of sources for citation"""
        sources = []

        for result in search_results:
            source = {
                "display": self._format_source_display(result),
                "company_name": result.company_name,
                "stock_code": result.stock_code,
                "source_type": result.source_type,
                "broker": result.broker,
                "date": result.date,
                "file_path": result.file_path,
                "keyword_matches": len(result.line_matches)
            }
            sources.append(source)

        return sources

    def _format_source_display(self, result: FileSearchResult) -> str:
        """Format a source for display"""
        parts = []
        if result.company_name:
            parts.append(result.company_name)
        if result.stock_code:
            parts.append(f"({result.stock_code})")
        if result.broker:
            parts.append(f"- {result.broker}")
        if result.date:
            parts.append(f", {result.date}")

        source_type_map = {
            'analysis_whitepaper': '深度分析白皮书',
            'deep_research': '深度研报',
            'history_jsonl': '历史研报记录',
            'financial_report': '财务报告',
            'news': '新闻资讯',
        }

        type_display = source_type_map.get(result.source_type, result.source_type)
        parts.append(f" [{type_display}]")

        return "".join(parts)

    def search_by_company(
        self,
        company_name: str,
        stock_code: Optional[str] = None,
        year: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search by specific company name with optional year filter.

        Args:
            company_name: Company name
            stock_code: Stock code
            year: Year filter

        Returns:
            Search results dict
        """
        keywords = [company_name]
        if stock_code:
            keywords.append(stock_code)

        search_results, stats = self.precise_searcher.search(
            keywords=keywords,
            max_results=self.max_results,
            year_filter=year
        )

        structured_infos = self._structure_results(search_results)
        metrics = self._extract_financial_metrics(search_results, year)
        context = self._build_enhanced_context(structured_infos, metrics, keywords)

        return {
            "structured_info": structured_infos,
            "context": context,
            "sources": self._build_sources_list(search_results),
            "metrics": metrics,
            "search_stats": {
                "total_results": len(search_results),
                "duration_seconds": stats.total_duration,
                "keyword_matches": stats.keyword_matches
            }
        }

    def get_available_companies(self) -> Dict[str, str]:
        """Get list of available companies in knowledge base"""
        return self.precise_searcher.company_mapping.copy()