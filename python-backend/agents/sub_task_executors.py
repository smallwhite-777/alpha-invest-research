# Sub-Task Executors
# Specialized agents for different task types
# Each executor focuses on extracting specific types of information

import os
import json
import logging
import tempfile
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.task_types import SubTask, TaskType
from knowledge_base.precise_searcher import PreciseSearcher
from utils.company_resolver import get_company_resolver

logger = logging.getLogger(__name__)


@dataclass
class ExecutorResult:
    """Result from a sub-task executor"""
    task_id: str
    task_type: str
    status: str  # "success", "failed", "partial"
    data: Dict[str, Any] = field(default_factory=dict)
    source_files: List[str] = field(default_factory=list)
    confidence: float = 0.0
    error: Optional[str] = None
    raw_extracts: List[Dict] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return asdict(self)


class BaseExecutor:
    """Base class for all executors"""

    def __init__(self):
        from config import (
            RESEARCH_REPORTS_DIR, NEWS_DIR,
            FINANCIAL_REPORTS_DIR, DAILY_QUOTE_DIR
        )
        self.searcher = PreciseSearcher(
            research_reports_dir=RESEARCH_REPORTS_DIR,
            news_dir=NEWS_DIR,
            financial_reports_dir=FINANCIAL_REPORTS_DIR,
            daily_quote_dir=DAILY_QUOTE_DIR
        )
        self.company_resolver = get_company_resolver()

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        """Execute a sub-task"""
        raise NotImplementedError

    def _search_knowledge_base(self, keywords: List[str], entity: str,
                                stock_code: Optional[str] = None,
                                max_files: int = 5) -> List[Dict]:
        """Search knowledge base with expanded keywords"""
        # Expand company names
        all_keywords = list(keywords)
        if entity:
            variants = self.company_resolver.get_all_variants(entity)
            all_keywords.extend(variants)
        if stock_code:
            all_keywords.append(stock_code)
            all_keywords.append(f"{stock_code}.SH")
            all_keywords.append(f"{stock_code}.SZ")

        # Remove duplicates
        all_keywords = list(set(all_keywords))

        # Search using the correct API
        results, stats = self.searcher.search(
            keywords=all_keywords,
            max_results=max_files
        )

        # Convert FileSearchResult to dict format
        dict_results = []
        for r in results:
            dict_results.append({
                "file_path": r.file_path,
                "company_name": r.company_name,
                "stock_code": r.stock_code,
                "source_type": r.source_type,
                "content": r.extracted_content,
                "broker": r.broker,
                "date": r.date,
                "line_matches": [
                    {"line_number": m.line_number, "line_content": m.line_content, "keyword": m.keyword}
                    for m in r.line_matches
                ]
            })

        return dict_results

    def _extract_year_value_pairs(self, content: str, keywords: List[str]) -> List[Dict]:
        """Extract year-value pairs from content"""
        import re

        extracts = []
        lines = content.split('\n')

        for line in lines:
            for keyword in keywords:
                if keyword in line:
                    # Try to extract year and value
                    year_matches = re.findall(r'(20\d{2})', line)

                    # Extract numbers that are NOT years (these are the actual values)
                    # Look for patterns like: keyword: 123.45, keyword为123.45, etc.
                    value_patterns = [
                        rf'{keyword}[：:]\s*([\d,]+\.?\d*)',  # keyword: 123.45
                        rf'{keyword}[为是]\s*([\d,]+\.?\d*)',  # keyword为123.45
                        rf'([\d,]+\.?\d*)\s*{keyword}',  # 123.45 keyword
                    ]

                    values = []
                    for pattern in value_patterns:
                        matches = re.findall(pattern, line)
                        values.extend(matches)

                    # Also look for numbers with units (亿, 万, %)
                    unit_pattern = rf'([\d,]+\.?\d*)\s*(亿|万|%)?'
                    unit_matches = re.findall(unit_pattern, line)

                    # Filter out years from values
                    filtered_values = []
                    for v in values:
                        if v and v not in ['20' + str(y) for y in range(10, 30)]:
                            filtered_values.append(v)

                    for match in unit_matches:
                        val, unit = match
                        if val and val not in ['20' + str(y) for y in range(10, 30)]:
                            if unit:
                                filtered_values.append(f"{val}{unit}")
                            else:
                                filtered_values.append(val)

                    if year_matches and filtered_values:
                        extracts.append({
                            "keyword": keyword,
                            "line": line.strip(),
                            "years": year_matches,
                            "values": filtered_values[:5]  # First 5 values
                        })

        return extracts


class FinancialDataExecutor(BaseExecutor):
    """
    T1: Core financial data extraction
    Extracts: 营业收入, 净利润, 总资产, 净资产, 每股收益, ROE, 现金流, 资产负债率
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T1] Executing financial data extraction for {entity}")

        # Keywords for financial data
        financial_keywords = [
            "营业收入", "主营业务收入", "营收",
            "净利润", "归母净利润", "扣非净利润",
            "总资产", "净资产", "归属母公司股东权益",
            "每股收益", "基本每股收益", "稀释每股收益",
            "ROE", "净资产收益率", "加权平均净资产收益率",
            "经营现金流", "经营活动产生的现金流量净额",
            "资产负债率", "负债合计"
        ]

        # Add task-specific keywords
        financial_keywords.extend(task.keywords)

        # Search knowledge base
        search_results = self._search_knowledge_base(
            keywords=financial_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=10
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        # Extract financial data
        financial_data = {}
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            # Extract from tables
            table_extracts = self._extract_from_tables(content, financial_keywords)
            raw_extracts.extend(table_extracts)

            # Extract from inline text
            inline_extracts = self._extract_from_inline(content, financial_keywords)
            raw_extracts.extend(inline_extracts)

            # Merge extracted data
            for extract in raw_extracts:
                keyword = extract.get("keyword")
                value = extract.get("value")
                year = extract.get("year")

                if value and year:
                    if keyword not in financial_data:
                        financial_data[keyword] = {}
                    financial_data[keyword][year] = value
                elif value:
                    if keyword not in financial_data:
                        financial_data[keyword] = {}
                    if "latest" not in financial_data[keyword] or not financial_data[keyword].get("latest"):
                        financial_data[keyword]["latest"] = value

        # Calculate confidence
        expected_keywords = ["营业收入", "净利润"]
        found_count = sum(1 for kw in expected_keywords if kw in financial_data and financial_data[kw])
        confidence = found_count / len(expected_keywords) if expected_keywords else 0

        # If we have any data, boost confidence
        if financial_data:
            confidence = max(confidence, 0.5)

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=financial_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:30]
        )

    def _extract_from_tables(self, content: str, keywords: List[str]) -> List[Dict]:
        """Extract financial data from markdown tables"""
        import re

        extracts = []
        lines = content.split('\n')

        # Find table rows
        in_table = False
        header_years = []

        for i, line in enumerate(lines):
            # Detect table start
            if '|' in line and '---' not in line:
                cells = [c.strip() for c in line.split('|') if c.strip()]

                # Check if this is a header row with years
                if not in_table:
                    years_in_row = re.findall(r'(20\d{2})', line)
                    if years_in_row:
                        header_years = years_in_row
                        in_table = True
                        continue

                # Check for keywords in this row
                for cell_idx, cell in enumerate(cells):
                    for keyword in keywords:
                        if keyword in cell:
                            # Try to extract values from subsequent cells
                            for j, value_cell in enumerate(cells[cell_idx+1:], 1):
                                if j <= len(header_years):
                                    # Extract number with unit
                                    value_match = re.search(r'([\d,]+\.?\d*)\s*(亿|万|%)?', value_cell)
                                    if value_match:
                                        num = value_match.group(1)
                                        unit = value_match.group(2) or ""
                                        if num and not num.startswith('20'):  # Not a year
                                            year_idx = j - 1
                                            if year_idx < len(header_years):
                                                extracts.append({
                                                    "keyword": keyword,
                                                    "value": f"{num}{unit}",
                                                    "year": header_years[year_idx],
                                                    "source": "table"
                                                })
                            break

            elif '---' in line:
                continue
            else:
                in_table = False
                header_years = []

        return extracts

    def _extract_from_inline(self, content: str, keywords: List[str]) -> List[Dict]:
        """Extract financial data from inline text"""
        import re

        extracts = []
        lines = content.split('\n')

        # Patterns for inline financial data
        patterns = [
            # 营业收入1,200亿元, 营收为1500亿
            (rf'(营业收入|营收|主营业务收入)[为是约]?\s*([\d,]+\.?\d*)\s*(亿|万)?元'),
            # 净利润72亿元
            (rf'(净利润|归母净利润)[为是约]?\s*([\d,]+\.?\d*)\s*(亿|万)?元'),
            # ROE为4%
            (rf'(ROE|净资产收益率)[为是约]?\s*([\d,]+\.?\d*)\s*(%)?'),
            # 毛利率24%
            (rf'(毛利率|净利率)[为是约]?\s*([\d,]+\.?\d*)\s*(%)?'),
            # 从约1,200亿元增长至约1,500亿元
            (rf'(营业|营收|收入).*?([\d,]+\.?\d*)\s*(亿|万)?元.*?增长.*?([\d,]+\.?\d*)\s*(亿|万)?元'),
        ]

        for line in lines:
            # Find year in line
            year_match = re.search(r'(20\d{2})', line)
            year = year_match.group(1) if year_match else None

            for pattern in patterns:
                matches = re.findall(pattern, line)
                for match in matches:
                    if isinstance(match, tuple):
                        # Extract keyword, value, unit
                        keyword = match[0] if match[0] else None
                        value = match[1] if len(match) > 1 else None
                        unit = match[2] if len(match) > 2 else ""

                        if keyword and value and keyword in keywords:
                            # Filter out year-like values
                            if not value.startswith('20') or len(value) > 4:
                                extracts.append({
                                    "keyword": keyword,
                                    "value": f"{value}{unit}",
                                    "year": year,
                                    "source": "inline"
                                })

        return extracts


class ProfitabilityExecutor(BaseExecutor):
    """
    T2: Profitability analysis
    Extracts: 毛利率, 净利率, 费用率, 盈利变化趋势
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T2] Executing profitability analysis for {entity}")

        profitability_keywords = [
            "毛利率", "销售毛利率",
            "净利率", "销售净利率",
            "销售费用率", "管理费用率", "财务费用率",
            "期间费用率", "三项费用率",
            "毛利润", "营业利润", "利润总额",
            "毛利率变化", "同比", "环比"
        ]

        profitability_keywords.extend(task.keywords)

        search_results = self._search_knowledge_base(
            keywords=profitability_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=8
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        profitability_data = {}
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            extracts = self._extract_year_value_pairs(content, profitability_keywords)
            raw_extracts.extend(extracts)

            for extract in extracts:
                keyword = extract["keyword"]
                years = extract.get("years", [])
                values = extract.get("values", [])

                if years and values:
                    for i, year in enumerate(years):
                        if i < len(values):
                            if keyword not in profitability_data:
                                profitability_data[keyword] = {}
                            try:
                                clean_value = values[i].replace(',', '')
                                profitability_data[keyword][year] = clean_value
                            except:
                                pass

        # Check for trend analysis
        if "同比" in str(raw_extracts) or "环比" in str(raw_extracts):
            profitability_data["trend_analysis_available"] = True

        expected_keywords = ["毛利率", "净利率"]
        found_count = sum(1 for kw in expected_keywords if kw in profitability_data)
        confidence = found_count / len(expected_keywords)

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=profitability_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:20]
        )


class CashflowExecutor(BaseExecutor):
    """
    T3: Cash flow analysis
    Extracts: 经营性现金流, 投资现金流, 筹资现金流, 自由现金流
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T3] Executing cash flow analysis for {entity}")

        cashflow_keywords = [
            "经营活动现金流", "经营活动产生的现金流量净额",
            "投资活动现金流", "投资活动产生的现金流量净额",
            "筹资活动现金流", "筹资活动产生的现金流量净额",
            "自由现金流", "现金及现金等价物净增加额",
            "期末现金及现金等价物余额",
            "销售商品提供劳务收到的现金"
        ]

        cashflow_keywords.extend(task.keywords)

        search_results = self._search_knowledge_base(
            keywords=cashflow_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=8
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        cashflow_data = {}
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            extracts = self._extract_year_value_pairs(content, cashflow_keywords)
            raw_extracts.extend(extracts)

            for extract in extracts:
                keyword = extract["keyword"]
                years = extract.get("years", [])
                values = extract.get("values", [])

                if years and values:
                    for i, year in enumerate(years):
                        if i < len(values):
                            if keyword not in cashflow_data:
                                cashflow_data[keyword] = {}
                            try:
                                clean_value = values[i].replace(',', '')
                                cashflow_data[keyword][year] = clean_value
                            except:
                                pass

        # Analyze cash flow quality
        if "经营活动产生的现金流量净额" in cashflow_data:
            cashflow_data["cashflow_quality_analyzed"] = True

        expected_keywords = ["经营活动现金流", "投资活动现金流"]
        found_count = sum(1 for kw in expected_keywords if any(kw in k for k in cashflow_data.keys()))
        confidence = found_count / len(expected_keywords)

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=cashflow_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:20]
        )


class BusinessStructureExecutor(BaseExecutor):
    """
    T4: Business structure analysis
    Extracts: 分产品/分行业收入构成, 占比变化
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T4] Executing business structure analysis for {entity}")

        structure_keywords = [
            "主营业务", "主营业务收入",
            "分产品", "分行业", "分地区",
            "收入构成", "业务收入", "产品收入",
            "占比", "收入占比", "比重",
            "第一大", "第二大", "主要产品"
        ]

        structure_keywords.extend(task.keywords)

        search_results = self._search_knowledge_base(
            keywords=structure_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=8
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        structure_data = {
            "business_segments": [],
            "product_breakdown": {},
            "regional_breakdown": {}
        }
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            # Extract business segment info
            lines = content.split('\n')
            for line in lines:
                if any(kw in line for kw in ["分产品", "分行业", "主营业务"]):
                    if "%" in line or "亿" in line or "万" in line:
                        raw_extracts.append({
                            "line": line.strip(),
                            "type": "business_segment"
                        })

                        # Try to parse segment name and percentage
                        import re
                        pct_match = re.search(r'(\d+\.?\d*)%', line)
                        if pct_match:
                            segment_info = {
                                "line": line.strip(),
                                "percentage": pct_match.group(1)
                            }
                            if segment_info not in structure_data["business_segments"]:
                                structure_data["business_segments"].append(segment_info)

        confidence = 0.6 if structure_data["business_segments"] else 0.3

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=structure_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:20]
        )


class ManagementAnalysisExecutor(BaseExecutor):
    """
    T5: Management analysis
    Extracts: 管理层讨论, 经营总结, 未来规划, 风险提示
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T5] Executing management analysis for {entity}")

        management_keywords = [
            "管理层讨论", "管理层分析与讨论",
            "经营总结", "经营情况讨论与分析",
            "未来规划", "发展战略", "发展计划",
            "风险提示", "可能面临", "不确定性",
            "核心竞争力", "竞争优势"
        ]

        management_keywords.extend(task.keywords)

        search_results = self._search_knowledge_base(
            keywords=management_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=8
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        management_data = {
            "management_discussion": [],
            "future_outlook": [],
            "risks": []
        }
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            lines = content.split('\n')

            current_section = None
            for i, line in enumerate(lines):
                # Detect section
                if "管理层讨论" in line or "经营情况讨论" in line:
                    current_section = "management_discussion"
                elif "未来" in line and ("规划" in line or "展望" in line):
                    current_section = "future_outlook"
                elif "风险" in line:
                    current_section = "risks"

                # Collect content
                if current_section and len(line.strip()) > 20:
                    section_data = {
                        "content": line.strip()[:500]  # Limit length
                    }
                    if section_data not in management_data[current_section]:
                        management_data[current_section].append(section_data)

                    raw_extracts.append({
                        "section": current_section,
                        "content": line.strip()[:200]
                    })

                    if len(management_data[current_section]) >= 3:
                        current_section = None  # Reset after collecting enough

        # Limit results
        for key in management_data:
            management_data[key] = management_data[key][:5]

        confidence = 0.7 if any(management_data.values()) else 0.3

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=management_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:20]
        )


class ValuationExecutor(BaseExecutor):
    """
    T6: Valuation analysis
    Extracts: PE, PB, PS, PEG, 估值分位数
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T6] Executing valuation analysis for {entity}")

        valuation_keywords = [
            "PE", "市盈率", "滚动市盈率", "静态市盈率",
            "PB", "市净率",
            "PS", "市销率",
            "PEG",
            "估值", "估值分位", "历史分位",
            "市值", "总市值", "流通市值",
            "合理估值", "目标价"
        ]

        valuation_keywords.extend(task.keywords)

        search_results = self._search_knowledge_base(
            keywords=valuation_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=8
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        valuation_data = {}
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            extracts = self._extract_year_value_pairs(content, valuation_keywords)
            raw_extracts.extend(extracts)

            # Extract PE/PB values
            import re
            for keyword in ["PE", "PB", "市盈率", "市净率"]:
                pattern = rf'{keyword}[：:]\s*[\d.]+|{keyword}.*?(\d+\.?\d*)'
                matches = re.findall(pattern, content)
                if matches:
                    if keyword not in valuation_data:
                        valuation_data[keyword] = []
                    for match in matches:
                        if isinstance(match, tuple):
                            match = match[0] if match[0] else match[1] if len(match) > 1 else None
                        if match:
                            valuation_data[keyword].append(match)

        expected_keywords = ["PE", "PB"]
        found_count = sum(1 for kw in expected_keywords if kw in valuation_data)
        confidence = found_count / len(expected_keywords)

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=valuation_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:20]
        )


class RiskAnalysisExecutor(BaseExecutor):
    """
    T7: Risk analysis
    Extracts: 经营风险, 财务风险, 行业风险
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T7] Executing risk analysis for {entity}")

        risk_keywords = [
            "风险", "风险因素", "风险提示",
            "经营风险", "财务风险", "市场风险",
            "可能面临", "不确定性", "隐患",
            "挑战", "压力", "下滑"
        ]

        risk_keywords.extend(task.keywords)

        search_results = self._search_knowledge_base(
            keywords=risk_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=8
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        risk_data = {
            "operational_risks": [],
            "financial_risks": [],
            "industry_risks": [],
            "other_risks": []
        }
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            lines = content.split('\n')
            for line in lines:
                if "风险" in line and len(line.strip()) > 10:
                    risk_item = {"content": line.strip()[:300]}

                    # Categorize risk
                    if any(kw in line for kw in ["经营", "生产", "销售", "市场"]):
                        if risk_item not in risk_data["operational_risks"]:
                            risk_data["operational_risks"].append(risk_item)
                    elif any(kw in line for kw in ["财务", "资金", "负债", "应收"]):
                        if risk_item not in risk_data["financial_risks"]:
                            risk_data["financial_risks"].append(risk_item)
                    elif any(kw in line for kw in ["行业", "政策", "竞争"]):
                        if risk_item not in risk_data["industry_risks"]:
                            risk_data["industry_risks"].append(risk_item)
                    else:
                        if risk_item not in risk_data["other_risks"]:
                            risk_data["other_risks"].append(risk_item)

                    raw_extracts.append({"content": line.strip()[:200]})

        # Limit results
        for key in risk_data:
            risk_data[key] = risk_data[key][:5]

        confidence = 0.7 if any(risk_data.values()) else 0.3

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=risk_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:20]
        )


class IndustryComparisonExecutor(BaseExecutor):
    """
    T8: Industry comparison
    Extracts: 行业平均, 可比公司, 估值水平
    """

    def execute(self, task: SubTask, entity: str, stock_code: Optional[str] = None) -> ExecutorResult:
        logger.info(f"[T8] Executing industry comparison for {entity}")

        comparison_keywords = [
            "行业平均", "行业水平", "同行业",
            "可比公司", "竞争对手", "同业",
            "估值水平", "行业估值", "估值对比",
            "市场份额", "市占率", "行业排名"
        ]

        comparison_keywords.extend(task.keywords)

        search_results = self._search_knowledge_base(
            keywords=comparison_keywords,
            entity=entity,
            stock_code=stock_code,
            max_files=8
        )

        if not search_results:
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error="No relevant files found"
            )

        comparison_data = {
            "industry_avg_metrics": [],
            "peer_comparison": [],
            "market_position": []
        }
        source_files = []
        raw_extracts = []

        for result in search_results:
            source_files.append(result.get("file_path", ""))
            content = result.get("content", "")

            lines = content.split('\n')
            for line in lines:
                if any(kw in line for kw in comparison_keywords):
                    item = {"content": line.strip()[:300]}
                    raw_extracts.append(item)

                    if "行业" in line and ("平均" in line or "水平" in line):
                        comparison_data["industry_avg_metrics"].append(item)
                    elif "可比" in line or "同业" in line:
                        comparison_data["peer_comparison"].append(item)
                    elif "市场份额" in line or "市占率" in line:
                        comparison_data["market_position"].append(item)

        # Limit results
        for key in comparison_data:
            comparison_data[key] = comparison_data[key][:5]

        confidence = 0.6 if any(comparison_data.values()) else 0.3

        return ExecutorResult(
            task_id=task.id,
            task_type=task.task_type.value,
            status="success" if confidence > 0.5 else "partial",
            data=comparison_data,
            source_files=source_files[:5],
            confidence=confidence,
            raw_extracts=raw_extracts[:20]
        )


# Executor factory
EXECUTOR_MAP = {
    TaskType.FINANCIAL_DATA: FinancialDataExecutor,
    TaskType.PROFITABILITY: ProfitabilityExecutor,
    TaskType.CASHFLOW: CashflowExecutor,
    TaskType.BUSINESS_STRUCTURE: BusinessStructureExecutor,
    TaskType.MANAGEMENT_ANALYSIS: ManagementAnalysisExecutor,
    TaskType.VALUATION: ValuationExecutor,
    TaskType.RISK_ANALYSIS: RiskAnalysisExecutor,
    TaskType.INDUSTRY_COMPARISON: IndustryComparisonExecutor,
}


def get_executor(task_type: TaskType) -> BaseExecutor:
    """Get the appropriate executor for a task type"""
    executor_class = EXECUTOR_MAP.get(task_type)
    if not executor_class:
        logger.warning(f"No specific executor for {task_type}, using BaseExecutor")
        return BaseExecutor()
    return executor_class()


# Test code
if __name__ == "__main__":
    from agents.task_types import SubTask, TaskType

    print("=" * 60)
    print("Sub-Task Executors Test")
    print("=" * 60)

    # Test financial data executor
    executor = FinancialDataExecutor()
    test_task = SubTask(
        id="T1",
        name="核心财务数据提取",
        description="提取主要财务数据",
        task_type=TaskType.FINANCIAL_DATA,
        target_years=["2023", "2024"]
    )

    result = executor.execute(test_task, "中煤能源", "601898")

    print(f"\nTask: {result.task_id} - {result.task_type}")
    print(f"Status: {result.status}")
    print(f"Confidence: {result.confidence}")
    print(f"Source files: {len(result.source_files)}")
    print(f"Data keys: {list(result.data.keys())[:5]}")
    print(f"Raw extracts: {len(result.raw_extracts)}")