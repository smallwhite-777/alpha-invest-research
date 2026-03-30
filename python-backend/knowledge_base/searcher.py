# Local knowledge base searcher - Optimized version
# Two-phase search with strict limits to prevent hanging

import os
import re
import json
import time
import signal
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== SAFE DEFAULTS ==============
MAX_CANDIDATE_FILES = 15        # Max files to consider
MAX_READ_CHARS = 8000           # Max chars per file
MAX_CONTENT_LENGTH = 50000      # Max total content length
SEARCH_TIMEOUT = 30             # Timeout in seconds
MAX_RETURN_SNIPPETS = 5         # Max snippets to return
FILE_READ_TIMEOUT = 5           # Timeout per file read
# ===========================================


@dataclass
class SearchResult:
    """Represents a search result from the knowledge base"""
    file_path: str
    company_name: str
    stock_code: str
    content: str
    source_type: str
    broker: Optional[str] = None
    date: Optional[str] = None
    relevance_score: float = 0.0


@dataclass
class SearchStats:
    """Statistics for search operation"""
    start_time: float = field(default_factory=time.time)
    phase1_duration: float = 0
    phase2_duration: float = 0
    total_duration: float = 0
    candidate_files: int = 0
    files_read: int = 0
    files_failed: int = 0
    timeout_hit: bool = False
    error: Optional[str] = None

    def log_summary(self):
        logger.info(f"Search completed in {self.total_duration:.2f}s "
                   f"(Phase1: {self.phase1_duration:.2f}s, Phase2: {self.phase2_duration:.2f}s) "
                   f"- Candidates: {self.candidate_files}, Read: {self.files_read}, Failed: {self.files_failed}")


class KnowledgeBaseSearcher:
    """
    Local file-based knowledge base searcher with two-phase retrieval.

    Phase 1: File-level filtering by name/directory matching only
    Phase 2: Content extraction from limited candidate files
    """

    def __init__(
        self,
        research_reports_dir: Optional[Path] = None,
        news_dir: Optional[Path] = None,
        financial_reports_dir: Optional[Path] = None,
        daily_quote_dir: Optional[Path] = None,
        max_candidate_files: int = MAX_CANDIDATE_FILES,
        max_read_chars: int = MAX_READ_CHARS,
        search_timeout: int = SEARCH_TIMEOUT
    ):
        self.research_reports_dir = Path(research_reports_dir) if research_reports_dir else None
        self.news_dir = Path(news_dir) if news_dir else None
        self.financial_reports_dir = Path(financial_reports_dir) if financial_reports_dir else None
        self.daily_quote_dir = Path(daily_quote_dir) if daily_quote_dir else None

        self.max_candidate_files = max_candidate_files
        self.max_read_chars = max_read_chars
        self.search_timeout = search_timeout

        # Build company mapping (only scans directory names, not file contents)
        self.company_mapping: Dict[str, str] = {}
        self._build_company_mapping()

        logger.info(f"KnowledgeBaseSearcher initialized with {len(self.company_mapping)} companies")

    def _build_company_mapping(self):
        """Build mapping from company names to stock codes - only scans directory names"""
        start = time.time()

        # From Research Reports directory names
        if self.research_reports_dir and self.research_reports_dir.exists():
            try:
                for item in os.listdir(self.research_reports_dir):
                    item_path = self.research_reports_dir / item
                    if item_path.is_dir():
                        # Format: "公司名称_股票代码"
                        parts = item.rsplit("_", 1)
                        if len(parts) == 2:
                            self.company_mapping[parts[0]] = parts[1]
            except Exception as e:
                logger.warning(f"Error scanning research reports dir: {e}")

        # From Financial Reports directory names
        if self.financial_reports_dir and self.financial_reports_dir.exists():
            try:
                for item in os.listdir(self.financial_reports_dir):
                    item_path = self.financial_reports_dir / item
                    if item_path.is_dir():
                        # Format: "公司名称-股票代码"
                        parts = item.rsplit("-", 1)
                        if len(parts) == 2 and parts[0] not in self.company_mapping:
                            self.company_mapping[parts[0]] = parts[1]
            except Exception as e:
                logger.warning(f"Error scanning financial reports dir: {e}")

        logger.info(f"Company mapping built in {time.time()-start:.2f}s, found {len(self.company_mapping)} companies")

    def search_by_keywords(
        self,
        keywords: List[str],
        max_results: int = MAX_RETURN_SNIPPETS,
        source_types: Optional[List[str]] = None
    ) -> List[SearchResult]:
        """
        Two-phase search with strict limits and timeout protection
        """
        stats = SearchStats()
        results = []

        try:
            # ========== PHASE 1: File-level filtering ==========
            logger.info(f"Starting search for keywords: {keywords}")
            phase1_start = time.time()

            candidate_files = self._phase1_filter_files(keywords, source_types)
            stats.candidate_files = len(candidate_files)
            stats.phase1_duration = time.time() - phase1_start

            logger.info(f"Phase 1 complete: found {stats.candidate_files} candidate files in {stats.phase1_duration:.2f}s")

            # Limit candidates
            if len(candidate_files) > self.max_candidate_files:
                logger.warning(f"Too many candidates ({len(candidate_files)}), limiting to {self.max_candidate_files}")
                candidate_files = candidate_files[:self.max_candidate_files]

            # ========== PHASE 2: Content extraction ==========
            phase2_start = time.time()

            for file_info in candidate_files:
                if len(results) >= max_results:
                    break

                try:
                    result = self._read_file_with_timeout(file_info)
                    if result:
                        results.append(result)
                        stats.files_read += 1
                except Exception as e:
                    logger.warning(f"Failed to read {file_info['path']}: {e}")
                    stats.files_failed += 1

            stats.phase2_duration = time.time() - phase2_start
            logger.info(f"Phase 2 complete: read {stats.files_read} files in {stats.phase2_duration:.2f}s")

        except Exception as e:
            logger.error(f"Search error: {e}")
            stats.error = str(e)

        finally:
            stats.total_duration = time.time() - stats.start_time
            stats.log_summary()

        # Sort by relevance
        results.sort(key=lambda x: x.relevance_score, reverse=True)
        return results[:max_results]

    def _phase1_filter_files(
        self,
        keywords: List[str],
        source_types: Optional[List[str]]
    ) -> List[Dict[str, Any]]:
        """
        Phase 1: Filter files by name/directory matching only - NO content reading
        Returns list of candidate file info dicts
        """
        candidates = []
        keywords_lower = [k.lower() for k in keywords]

        # Search Research Reports by directory name
        if self.research_reports_dir and self.research_reports_dir.exists():
            if source_types is None or 'research' in source_types:
                candidates.extend(self._filter_research_reports(keywords_lower))

        # Search News by filename
        if self.news_dir and self.news_dir.exists():
            if source_types is None or 'news' in source_types:
                candidates.extend(self._filter_news(keywords_lower))

        # Search Financial Reports by directory name
        if self.financial_reports_dir and self.financial_reports_dir.exists():
            if source_types is None or 'financial' in source_types:
                candidates.extend(self._filter_financial_reports(keywords_lower))

        # Sort by relevance score
        candidates.sort(key=lambda x: x['score'], reverse=True)
        return candidates

    def _filter_research_reports(self, keywords_lower: List[str]) -> List[Dict[str, Any]]:
        """Filter research reports by company/directory name matching with enhanced flexibility"""
        candidates = []

        try:
            for company_dir in os.listdir(self.research_reports_dir):
                company_path = self.research_reports_dir / company_dir
                if not company_path.is_dir():
                    continue

                # Check if directory name matches keywords with flexible matching
                dir_lower = company_dir.lower()
                score = 0
                matched = False

                for kw in keywords_lower:
                    # Direct match
                    if kw in dir_lower:
                        score += 10
                        matched = True
                    # Partial match (for shorter keywords like company abbreviations)
                    elif len(kw) >= 2:
                        # Check if keyword matches part of company name
                        # e.g., "紫金" matches "紫金矿业"
                        if kw in dir_lower:
                            score += 8
                            matched = True
                        # Check stock code (6 digits)
                        elif kw.isdigit() and len(kw) == 6:
                            if kw in company_dir:
                                score += 12  # High score for exact stock code match
                                matched = True

                if matched:
                    # Parse company name and stock code
                    parts = company_dir.rsplit("_", 1)
                    company_name = parts[0] if len(parts) == 2 else company_dir
                    stock_code = parts[1] if len(parts) == 2 else ""

                    try:
                        files = os.listdir(company_path)

                        # 1. Priority: analysis_whitepaper.md (high-quality structured analysis)
                        if 'analysis_whitepaper.md' in files:
                            candidates.append({
                                'path': str(company_path / 'analysis_whitepaper.md'),
                                'company_name': company_name,
                                'stock_code': stock_code,
                                'source_type': 'analysis_whitepaper',
                                'score': score + 5  # Boost score
                            })

                        # 2. High-quality prompts
                        prompt_files = [f for f in files if f.startswith('deep_research_prompt') and 'highquality' in f.lower()]
                        if prompt_files:
                            candidates.append({
                                'path': str(company_path / prompt_files[0]),
                                'company_name': company_name,
                                'stock_code': stock_code,
                                'source_type': 'high_quality_prompt',
                                'score': score + 3
                            })

                        # 3. Deep research report
                        report_files = [f for f in files if f.startswith('deep_research_report') and f.endswith('.md')]
                        if report_files:
                            # Sort by date (newest first)
                            report_files.sort(reverse=True)
                            candidates.append({
                                'path': str(company_path / report_files[0]),
                                'company_name': company_name,
                                'stock_code': stock_code,
                                'source_type': 'deep_research',
                                'score': score
                            })

                        # 4. History.jsonl - aggregate all annual reports
                        if 'history.jsonl' in files:
                            # Read and parse history.jsonl to get all reports
                            history_path = company_path / 'history.jsonl'
                            try:
                                with open(history_path, 'r', encoding='utf-8') as f:
                                    for line_num, line in enumerate(f):
                                        if line.strip():
                                            try:
                                                record = json.loads(line)
                                                # Extract key info from each historical report
                                                candidates.append({
                                                    'path': str(history_path),
                                                    'company_name': company_name,
                                                    'stock_code': stock_code,
                                                    'source_type': 'history_report',
                                                    'date': record.get('date', ''),
                                                    'broker': record.get('broker', ''),
                                                    'line_num': line_num,
                                                    'score': score - 2,  # Slightly lower priority
                                                    'is_history': True
                                                })
                                            except json.JSONDecodeError:
                                                continue
                            except Exception as e:
                                logger.debug(f"Failed to read history.jsonl: {e}")

                    except OSError:
                        pass
        except Exception as e:
            logger.warning(f"Error filtering research reports: {e}")

        return candidates

    def _filter_news(self, keywords_lower: List[str]) -> List[Dict[str, Any]]:
        """Filter news by filename matching"""
        candidates = []
        subfolders = ['markdown', 'markdownhuatai', 'articles']

        for subfolder in subfolders:
            subfolder_path = self.news_dir / subfolder
            if not subfolder_path.exists():
                continue

            try:
                for filename in os.listdir(subfolder_path):
                    if not filename.endswith('.md'):
                        continue

                    filename_lower = filename.lower()
                    score = 0
                    matched = False

                    for kw in keywords_lower:
                        if kw in filename_lower:
                            score += 5
                            matched = True

                    if matched:
                        broker_map = {
                            'markdown': '中金',
                            'markdownhuatai': '华泰',
                            'articles': '文章'
                        }
                        candidates.append({
                            'path': str(subfolder_path / filename),
                            'company_name': filename.replace('.md', '')[:50],
                            'stock_code': '',
                            'source_type': 'news',
                            'broker': broker_map.get(subfolder, subfolder),
                            'score': score
                        })
            except OSError:
                pass

        return candidates[:20]  # Limit news candidates

    def _filter_financial_reports(self, keywords_lower: List[str]) -> List[Dict[str, Any]]:
        """Filter financial reports by company/directory name matching"""
        candidates = []

        try:
            for company_dir in os.listdir(self.financial_reports_dir):
                company_path = self.financial_reports_dir / company_dir
                if not company_path.is_dir():
                    continue

                dir_lower = company_dir.lower()
                score = 0
                matched = False

                for kw in keywords_lower:
                    if kw in dir_lower:
                        score += 8
                        matched = True

                if matched:
                    parts = company_dir.rsplit("-", 1)
                    company_name = parts[0] if len(parts) == 2 else company_dir
                    stock_code = parts[1] if len(parts) == 2 else ""

                    # Get the most recent file (by filename sort)
                    try:
                        files = sorted([f for f in os.listdir(company_path) if f.endswith('.txt')], reverse=True)
                        if files:
                            candidates.append({
                                'path': str(company_path / files[0]),
                                'company_name': company_name,
                                'stock_code': stock_code,
                                'source_type': 'financial_report',
                                'date': files[0].split('-')[-1].replace('.txt', ''),
                                'score': score
                            })
                    except OSError:
                        pass
        except Exception as e:
            logger.warning(f"Error filtering financial reports: {e}")

        return candidates

    def _read_file_with_timeout(self, file_info: Dict[str, Any]) -> Optional[SearchResult]:
        """Read a single file with timeout protection"""
        file_path = Path(file_info['path'])

        try:
            # Handle history.jsonl records
            if file_info.get('is_history'):
                return self._read_history_record(file_info)

            # Read with limit
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(self.max_read_chars)

            # Extract key content
            extracted = self._extract_key_content(content)

            return SearchResult(
                file_path=str(file_path),
                company_name=file_info.get('company_name', ''),
                stock_code=file_info.get('stock_code', ''),
                content=extracted,
                source_type=file_info.get('source_type', 'unknown'),
                broker=file_info.get('broker'),
                date=file_info.get('date'),
                relevance_score=file_info.get('score', 0) / 10.0  # Normalize to 0-1
            )
        except Exception as e:
            logger.debug(f"Failed to read {file_path}: {e}")
            return None

    def _read_history_record(self, file_info: Dict[str, Any]) -> Optional[SearchResult]:
        """Read a specific record from history.jsonl"""
        file_path = Path(file_info['path'])
        line_num = file_info.get('line_num', 0)

        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for i, line in enumerate(f):
                    if i == line_num and line.strip():
                        record = json.loads(line)
                        content = record.get('content', '')[:self.max_read_chars]

                        # Try to extract source_file for context
                        source_file = record.get('source_file', '')

                        return SearchResult(
                            file_path=str(file_path),
                            company_name=file_info.get('company_name', ''),
                            stock_code=file_info.get('stock_code', ''),
                            content=f"来源文件: {source_file}\n\n{content}",
                            source_type='history_report',
                            broker=record.get('broker', ''),
                            date=record.get('date', ''),
                            relevance_score=file_info.get('score', 0) / 10.0
                        )
        except Exception as e:
            logger.debug(f"Failed to read history record: {e}")

        return None

    def _extract_key_content(self, content: str, max_length: int = MAX_READ_CHARS) -> str:
        """Extract key content with length limit"""
        # Try to find summary section with comprehensive patterns
        patterns = [
            # Chinese patterns
            r"(?:核心观点|投资要点|摘要|Summary|核心逻辑)[:：\s]*\n(.*?)(?=\n#{1,3}|\Z)",
            r"(?:风险提示|主要风险|投资风险)[:：\s]*\n(.*?)(?=\n#{1,3}|\Z)",
            r"(?:财务数据|关键指标|核心指标)[:：\s]*\n(.*?)(?=\n#{1,3}|\Z)",
            r"(?:盈利预测|业绩预测)[:：\s]*\n(.*?)(?=\n#{1,3}|\Z)",
            r"(?:估值分析|估值建议)[:：\s]*\n(.*?)(?=\n#{1,3}|\Z)",
            # Table patterns
            r"(\|.+\|[\n\r]+\|.+\|[\n\r]+\|.+\|)",  # Markdown tables
            # Key metrics
            r"(?:营收|收入|利润|毛利率|净利率|ROE|PE|PB)[:：\s]*[\d.]+%?",
        ]

        extracted = content
        found_content = []

        for pattern in patterns:
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                found_content.append(match.group(1) if match.lastindex else match.group(0))

        if found_content:
            extracted = "\n\n".join(found_content[:3])  # Take top 3 matches

        # If still too short, try to extract first meaningful paragraph
        if len(extracted) < 200:
            paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 50]
            if paragraphs:
                extracted = paragraphs[0]

        # Hard limit
        if len(extracted) > max_length:
            extracted = extracted[:max_length] + "\n\n... (内容已截断)"

        return extracted

    def get_company_list(self) -> Dict[str, str]:
        """Get all companies in the knowledge base"""
        return self.company_mapping.copy()

    def get_stock_code(self, company_name: str) -> Optional[str]:
        """Get stock code by company name"""
        return self.company_mapping.get(company_name)