# Precise Searcher - Keyword-based line number search with offset/limit reading
# Implements the workflow: parallel search -> file prioritization -> keyword line search -> precise reading

import os
import re
import json
import time
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

logger = logging.getLogger(__name__)

# Try to import index manager (optional dependency)
try:
    from knowledge_base.index_manager import get_index_manager, IndexManager
    INDEX_AVAILABLE = True
except ImportError:
    INDEX_AVAILABLE = False
    IndexManager = None

# ============== CONFIGURATION ==============
MAX_PARALLEL_SEARCHES = 5       # Parallel file searches
MAX_LINE_CONTEXT = 100          # Lines to read around keyword match (increased for financial data)
MAX_TOTAL_LINES = 300           # Max lines to extract per file (increased)
KEYWORD_MATCH_WINDOW = 10       # Lines before/after keyword match (increased)
FILE_PRIORITY_WEIGHTS = {
    'analysis_whitepaper.md': 10,       # Highest priority - structured analysis
    'deep_research_report': 8,          # Deep research reports
    'deep_research_prompt': 6,          # Research prompts
    'history.jsonl': 5,                 # Historical reports
    '.txt': 5,                          # Financial reports (txt) - increased priority
    '.md': 2,                           # Markdown files
}


@dataclass
class LineMatch:
    """Represents a keyword match in a specific line"""
    line_number: int
    line_content: str
    keyword: str
    context_start: int = 0
    context_end: int = 0
    byte_offset: int = 0  # ========== Bug Fix 1: 添加字节偏移量，支持精准读取 ==========


@dataclass
class FileSearchResult:
    """Result from searching a single file"""
    file_path: str
    company_name: str
    stock_code: str
    source_type: str
    line_matches: List[LineMatch]
    extracted_content: str
    priority_score: float
    broker: Optional[str] = None
    date: Optional[str] = None


@dataclass
class PreciseSearchStats:
    """Statistics for precise search operation"""
    start_time: float = field(default_factory=time.time)
    discovery_duration: float = 0
    keyword_search_duration: float = 0
    extraction_duration: float = 0
    total_duration: float = 0
    files_discovered: int = 0
    files_searched: int = 0
    keyword_matches: int = 0
    cross_validated: bool = False


class PreciseSearcher:
    """
    Precise file searcher with keyword-based line number search.

    Workflow:
    1. Parallel file discovery by name/path matching
    2. File prioritization based on file type and relevance
    3. Keyword-based line number search (grep-like)
    4. Precise reading with offset/limit around matched lines
    5. Cross-validation of data from multiple sources
    """

    def __init__(
        self,
        research_reports_dir: Optional[Path] = None,
        news_dir: Optional[Path] = None,
        financial_reports_dir: Optional[Path] = None,
        daily_quote_dir: Optional[Path] = None,
        max_parallel: int = MAX_PARALLEL_SEARCHES,
        use_index: bool = True
    ):
        self.research_reports_dir = Path(research_reports_dir) if research_reports_dir else None
        self.news_dir = Path(news_dir) if news_dir else None
        self.financial_reports_dir = Path(financial_reports_dir) if financial_reports_dir else None
        self.daily_quote_dir = Path(daily_quote_dir) if daily_quote_dir else None
        self.max_parallel = max_parallel
        self.use_index = use_index and INDEX_AVAILABLE

        # Build company mapping
        self.company_mapping: Dict[str, str] = {}

        # Try to use index first
        self._index_manager: Optional[IndexManager] = None
        if self.use_index:
            try:
                self._index_manager = get_index_manager(
                    research_reports_dir=self.research_reports_dir,
                    financial_reports_dir=self.financial_reports_dir
                )
                if self._index_manager.load():
                    logger.info("Using indexed company mapping")
                    self._build_company_mapping_from_index()
                else:
                    logger.info("Index not available, falling back to directory scan")
                    self._build_company_mapping()
            except Exception as e:
                logger.warning(f"Failed to load index: {e}, falling back to directory scan")
                self._build_company_mapping()
        else:
            self._build_company_mapping()

        logger.info(f"PreciseSearcher initialized with {len(self.company_mapping)} companies")

    def _build_company_mapping(self):
        """Build mapping from company names to stock codes"""
        # From Research Reports
        if self.research_reports_dir and self.research_reports_dir.exists():
            for item in os.listdir(self.research_reports_dir):
                item_path = self.research_reports_dir / item
                if item_path.is_dir():
                    parts = item.rsplit("_", 1)
                    if len(parts) == 2:
                        self.company_mapping[parts[0]] = parts[1]

        # From Financial Reports
        if self.financial_reports_dir and self.financial_reports_dir.exists():
            for item in os.listdir(self.financial_reports_dir):
                item_path = self.financial_reports_dir / item
                if item_path.is_dir():
                    parts = item.rsplit("-", 1)
                    if len(parts) == 2 and parts[0] not in self.company_mapping:
                        self.company_mapping[parts[0]] = parts[1]

    def _build_company_mapping_from_index(self):
        """Build company mapping from pre-built index (fast)"""
        if not self._index_manager or not self._index_manager.is_loaded:
            self._build_company_mapping()
            return

        company_index = self._index_manager.company_index

        for name, info in company_index.items():
            if isinstance(info, dict) and "stock_code" in info:
                # Full company name -> stock code
                self.company_mapping[name] = info.get("stock_code", "")

    def _discover_files_indexed(
        self,
        keywords: List[str],
        source_types: Optional[List[str]],
        year_filter: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Phase 1: Discover files using index (fast path).
        Falls back to directory scan if index not available.
        """
        if not self._index_manager or not self._index_manager.is_loaded:
            return self._discover_files(keywords, source_types, year_filter)

        discovered = []
        keywords_lower = [k.lower() for k in keywords]
        company_index = self._index_manager.company_index
        file_index = self._index_manager.file_index

        # Find matching companies using index
        for kw in keywords_lower:
            # Use index to find companies
            matches = self._index_manager.search_companies(kw)

            for match in matches:
                company_name = match.get("company_name", "")
                if not company_name:
                    continue

                # Get files for this company
                company_files = file_index.get(company_name, {})
                dir_path = company_files.get("dir_path", "")
                stock_code = company_files.get("stock_code", match.get("stock_code", ""))

                if not dir_path:
                    continue

                # Determine source directory
                if "research" in dir_path.lower() or "reserach" in dir_path.lower():
                    base_dir = self.research_reports_dir
                    source = "research"
                else:
                    base_dir = self.financial_reports_dir
                    source = "financial"

                if not base_dir:
                    continue

                full_dir = base_dir.parent / dir_path if not Path(dir_path).is_absolute() else Path(dir_path)
                if not full_dir.exists():
                    continue

                # Get match score
                match_score = 15 if match.get("match_type") == "stock_code" else 10

                # Process files
                for file_info in company_files.get("files", []):
                    filename = file_info.get("filename", "")
                    file_type = file_info.get("file_type", "")
                    priority = file_info.get("priority", 5)

                    # Year filter
                    if year_filter:
                        file_date = file_info.get("last_modified", "")
                        if year_filter not in filename and year_filter not in file_date:
                            continue

                    discovered.append({
                        'path': str(full_dir / filename),
                        'company_name': company_name,
                        'stock_code': stock_code,
                        'source_type': file_type,
                        'base_score': match_score + priority,
                        'is_jsonl': filename == 'history.jsonl',
                        'date': file_info.get("last_modified", "")
                    })

        return discovered

    def search(
        self,
        keywords: List[str],
        max_results: int = 5,
        source_types: Optional[List[str]] = None,
        year_filter: Optional[str] = None
    ) -> Tuple[List[FileSearchResult], PreciseSearchStats]:
        """
        Execute precise search with keyword-based line number search.

        Args:
            keywords: List of search keywords
            max_results: Maximum results to return
            source_types: Filter by source types
            year_filter: Filter by year (e.g., "2023", "2024")

        Returns:
            Tuple of (search results, statistics)
        """
        stats = PreciseSearchStats()
        results = []

        try:
            # Phase 1: Parallel file discovery (use index if available)
            discovery_start = time.time()
            if self._index_manager and self._index_manager.is_loaded:
                discovered_files = self._discover_files_indexed(keywords, source_types, year_filter)
            else:
                discovered_files = self._discover_files(keywords, source_types, year_filter)
            stats.discovery_duration = time.time() - discovery_start
            stats.files_discovered = len(discovered_files)

            logger.info(f"Phase 1: Discovered {stats.files_discovered} files in {stats.discovery_duration:.2f}s")

            # Phase 2: File prioritization
            prioritized_files = self._prioritize_files(discovered_files, keywords)

            # Phase 3: Parallel keyword-based line search
            search_start = time.time()
            search_results = self._parallel_keyword_search(prioritized_files[:20], keywords)  # Limit to top 20 files
            stats.keyword_search_duration = time.time() - search_start
            stats.files_searched = len(search_results)

            logger.info(f"Phase 2: Keyword search completed in {stats.keyword_search_duration:.2f}s")

            # Phase 4: Precise content extraction
            extraction_start = time.time()
            for file_result in search_results:
                if file_result.line_matches:
                    extracted = self._extract_content_around_matches(
                        file_result.file_path,
                        file_result.line_matches
                    )
                    file_result.extracted_content = extracted
                    stats.keyword_matches += len(file_result.line_matches)

            stats.extraction_duration = time.time() - extraction_start

            # Phase 5: Cross-validation
            results = self._cross_validate_results(search_results, keywords)
            stats.cross_validated = True

            # Sort by priority and limit results
            results.sort(key=lambda x: x.priority_score, reverse=True)
            results = results[:max_results]

        except Exception as e:
            logger.error(f"Search error: {e}")

        finally:
            stats.total_duration = time.time() - stats.start_time
            logger.info(f"Search completed: {stats.files_discovered} discovered, "
                       f"{stats.files_searched} searched, {stats.keyword_matches} matches in {stats.total_duration:.2f}s")

        return results, stats

    def _discover_files(
        self,
        keywords: List[str],
        source_types: Optional[List[str]],
        year_filter: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Phase 1: Discover files by name/path matching (parallel)
        """
        discovered = []
        keywords_lower = [k.lower() for k in keywords]

        with ThreadPoolExecutor(max_workers=self.max_parallel) as executor:
            futures = []

            # Search Research Reports
            if self.research_reports_dir and self.research_reports_dir.exists():
                if source_types is None or 'research' in source_types:
                    futures.append(executor.submit(
                        self._discover_research_reports,
                        keywords_lower, year_filter
                    ))

            # Search Financial Reports
            if self.financial_reports_dir and self.financial_reports_dir.exists():
                if source_types is None or 'financial' in source_types:
                    futures.append(executor.submit(
                        self._discover_financial_reports,
                        keywords_lower, year_filter
                    ))

            # Search News
            if self.news_dir and self.news_dir.exists():
                if source_types is None or 'news' in source_types:
                    futures.append(executor.submit(
                        self._discover_news,
                        keywords_lower
                    ))

            # Collect results
            for future in as_completed(futures):
                try:
                    result = future.result()
                    discovered.extend(result)
                except Exception as e:
                    logger.warning(f"Discovery error: {e}")

        return discovered

    def _discover_research_reports(
        self,
        keywords_lower: List[str],
        year_filter: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Discover files in Research Reports directory"""
        discovered = []

        try:
            for company_dir in os.listdir(self.research_reports_dir):
                company_path = self.research_reports_dir / company_dir
                if not company_path.is_dir():
                    continue

                dir_lower = company_dir.lower()
                matched = False
                match_score = 0

                for kw in keywords_lower:
                    if kw in dir_lower:
                        match_score += 10
                        matched = True
                    # Stock code match
                    if kw.isdigit() and len(kw) == 6 and kw in company_dir:
                        match_score += 15
                        matched = True

                if not matched:
                    continue

                parts = company_dir.rsplit("_", 1)
                company_name = parts[0] if len(parts) == 2 else company_dir
                stock_code = parts[1] if len(parts) == 2 else ""

                try:
                    files = os.listdir(company_path)

                    # Analysis whitepaper - highest priority
                    if 'analysis_whitepaper.md' in files:
                        discovered.append({
                            'path': str(company_path / 'analysis_whitepaper.md'),
                            'company_name': company_name,
                            'stock_code': stock_code,
                            'source_type': 'analysis_whitepaper',
                            'base_score': match_score + FILE_PRIORITY_WEIGHTS['analysis_whitepaper.md']
                        })

                    # Deep research reports
                    for f in files:
                        if f.startswith('deep_research_report') and f.endswith('.md'):
                            # Extract date from filename
                            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', f)
                            file_date = date_match.group(1) if date_match else None

                            # Year filter
                            if year_filter and file_date:
                                if year_filter not in file_date:
                                    continue

                            discovered.append({
                                'path': str(company_path / f),
                                'company_name': company_name,
                                'stock_code': stock_code,
                                'source_type': 'deep_research',
                                'date': file_date,
                                'base_score': match_score + FILE_PRIORITY_WEIGHTS['deep_research_report']
                            })

                    # History.jsonl - contains all historical reports
                    if 'history.jsonl' in files:
                        discovered.append({
                            'path': str(company_path / 'history.jsonl'),
                            'company_name': company_name,
                            'stock_code': stock_code,
                            'source_type': 'history_jsonl',
                            'base_score': match_score + FILE_PRIORITY_WEIGHTS['history.jsonl'],
                            'is_jsonl': True
                        })

                except OSError:
                    pass

        except Exception as e:
            logger.warning(f"Error discovering research reports: {e}")

        return discovered

    def _discover_financial_reports(
        self,
        keywords_lower: List[str],
        year_filter: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Discover files in Financial Reports directory"""
        discovered = []

        try:
            for company_dir in os.listdir(self.financial_reports_dir):
                company_path = self.financial_reports_dir / company_dir
                if not company_path.is_dir():
                    continue

                dir_lower = company_dir.lower()
                matched = False
                match_score = 0

                for kw in keywords_lower:
                    if kw in dir_lower:
                        match_score += 10
                        matched = True

                if not matched:
                    continue

                parts = company_dir.rsplit("-", 1)
                company_name = parts[0] if len(parts) == 2 else company_dir
                stock_code = parts[1] if len(parts) == 2 else ""

                try:
                    files = sorted([f for f in os.listdir(company_path) if f.endswith('.txt')], reverse=True)

                    # ========== Bug Fix 2: 去掉只取一年的限制 ==========
                    # 如果有year_filter，只取该年份；否则取最近3年
                    if year_filter:
                        for f in files:
                            if year_filter in f:
                                discovered.append({
                                    'path': str(company_path / f),
                                    'company_name': company_name,
                                    'stock_code': stock_code,
                                    'source_type': 'financial_report',
                                    'date': f.split('-')[-1].replace('.txt', ''),
                                    'base_score': match_score + FILE_PRIORITY_WEIGHTS['.txt']
                                })
                                break  # 只取该年份的一个文件
                    else:
                        # 没有指定年份时，取最近3年的文件
                        for f in files[:3]:
                            discovered.append({
                                'path': str(company_path / f),
                                'company_name': company_name,
                                'stock_code': stock_code,
                                'source_type': 'financial_report',
                                'date': f.split('-')[-1].replace('.txt', ''),
                                'base_score': match_score + FILE_PRIORITY_WEIGHTS['.txt']
                            })

                except OSError:
                    pass

        except Exception as e:
            logger.warning(f"Error discovering financial reports: {e}")

        return discovered

    def _discover_news(self, keywords_lower: List[str]) -> List[Dict[str, Any]]:
        """Discover files in News directory"""
        discovered = []
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
                    matched = False
                    match_score = 0

                    for kw in keywords_lower:
                        if kw in filename_lower:
                            match_score += 5
                            matched = True

                    if matched:
                        broker_map = {
                            'markdown': '中金',
                            'markdownhuatai': '华泰',
                            'articles': '文章'
                        }
                        discovered.append({
                            'path': str(subfolder_path / filename),
                            'company_name': filename.replace('.md', '')[:50],
                            'stock_code': '',
                            'source_type': 'news',
                            'broker': broker_map.get(subfolder, subfolder),
                            'base_score': match_score + FILE_PRIORITY_WEIGHTS['.md']
                        })
            except OSError:
                pass

        return discovered[:20]  # Limit news

    def _prioritize_files(
        self,
        discovered_files: List[Dict[str, Any]],
        keywords: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Phase 2: Prioritize files based on relevance
        """
        # Sort by base score (higher is better)
        prioritized = sorted(discovered_files, key=lambda x: x.get('base_score', 0), reverse=True)
        return prioritized

    def _parallel_keyword_search(
        self,
        files: List[Dict[str, Any]],
        keywords: List[str]
    ) -> List[FileSearchResult]:
        """
        Phase 3: Parallel keyword-based line number search
        """
        results = []

        with ThreadPoolExecutor(max_workers=self.max_parallel) as executor:
            future_to_file = {
                executor.submit(self._search_file_keywords, f, keywords): f
                for f in files
            }

            for future in as_completed(future_to_file):
                file_info = future_to_file[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                except Exception as e:
                    logger.debug(f"Keyword search error for {file_info['path']}: {e}")

        return results

    def _search_file_keywords(
        self,
        file_info: Dict[str, Any],
        keywords: List[str]
    ) -> Optional[FileSearchResult]:
        """
        Search for keywords in a file and return line numbers with byte offsets.
        This is the core grep-like functionality.
        """
        file_path = Path(file_info['path'])

        if not file_path.exists():
            return None

        line_matches = []
        keywords_lower = [k.lower() for k in keywords]

        try:
            # Handle JSONL files specially
            if file_info.get('is_jsonl'):
                return self._search_jsonl_file(file_info, keywords_lower)

            # Regular file search with byte offset tracking
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                byte_offset = 0  # ========== Bug Fix 1: 跟踪字节偏移量 ==========
                for line_num, line in enumerate(f):
                    line_lower = line.lower()

                    for kw in keywords_lower:
                        if kw in line_lower:
                            # Calculate context window
                            context_start = max(0, line_num - KEYWORD_MATCH_WINDOW)
                            context_end = line_num + KEYWORD_MATCH_WINDOW + 1

                            line_matches.append(LineMatch(
                                line_number=line_num,
                                line_content=line.strip()[:200],  # Limit line content
                                keyword=kw,
                                context_start=context_start,
                                context_end=context_end,
                                byte_offset=byte_offset  # 记录该行的字节偏移量
                            ))
                            break  # Only count first keyword match per line

                    # Update byte offset for next line
                    byte_offset += len(line.encode('utf-8'))

        except Exception as e:
            logger.debug(f"Error reading {file_path}: {e}")
            return None

        if not line_matches:
            return None

        return FileSearchResult(
            file_path=str(file_path),
            company_name=file_info.get('company_name', ''),
            stock_code=file_info.get('stock_code', ''),
            source_type=file_info.get('source_type', ''),
            line_matches=line_matches,
            extracted_content='',  # Will be filled later
            priority_score=file_info.get('base_score', 0) + len(line_matches),
            broker=file_info.get('broker'),
            date=file_info.get('date')
        )

    def _search_jsonl_file(
        self,
        file_info: Dict[str, Any],
        keywords_lower: List[str]
    ) -> Optional[FileSearchResult]:
        """
        Search JSONL file (history.jsonl) for keywords.
        Each line is a separate JSON record.
        ========== Bug Fix 1: 添加字节偏移量跟踪 ==========
        """
        file_path = Path(file_info['path'])
        line_matches = []

        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                byte_offset = 0  # 跟踪字节偏移量
                for line_num, line in enumerate(f):
                    if not line.strip():
                        byte_offset += len(line.encode('utf-8'))
                        continue

                    try:
                        record = json.loads(line)
                        content = record.get('content', '')
                        source_file = record.get('source_file', '')
                        date = record.get('date', '')
                        broker = record.get('broker', '')

                        # Search in content and source_file
                        search_text = (content + ' ' + source_file).lower()

                        for kw in keywords_lower:
                            if kw in search_text:
                                line_matches.append(LineMatch(
                                    line_number=line_num,
                                    line_content=f"[{date}] {broker} - {source_file[:100]}",
                                    keyword=kw,
                                    context_start=line_num,
                                    context_end=line_num + 1,
                                    byte_offset=byte_offset  # 记录字节偏移量
                                ))
                                break

                        byte_offset += len(line.encode('utf-8'))

                    except json.JSONDecodeError:
                        byte_offset += len(line.encode('utf-8'))
                        continue

        except Exception as e:
            logger.debug(f"Error reading JSONL {file_path}: {e}")
            return None

        if not line_matches:
            return None

        return FileSearchResult(
            file_path=str(file_path),
            company_name=file_info.get('company_name', ''),
            stock_code=file_info.get('stock_code', ''),
            source_type='history_jsonl',
            line_matches=line_matches,
            extracted_content='',
            priority_score=file_info.get('base_score', 0) + len(line_matches) * 2,
            broker=file_info.get('broker'),
            date=file_info.get('date')
        )

    def _extract_content_around_matches(
        self,
        file_path: str,
        line_matches: List[LineMatch]
    ) -> str:
        """
        Phase 4: Extract content around matched lines using byte offset seeking.
        ========== Bug Fix 1: 使用字节偏移量精准读取，避免从头读取整个文件 ==========
        """
        if not line_matches:
            return ''

        # Merge overlapping context windows
        merged_ranges = self._merge_line_ranges(line_matches)

        extracted_parts = []
        path = Path(file_path)

        try:
            # ========== Bug Fix 1: 构建行号到字节偏移量的映射 ==========
            line_byte_index = self._build_line_byte_index(path, merged_ranges)

            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                for start_line, end_line in merged_ranges[:5]:  # Limit to 5 ranges
                    # 使用字节偏移量直接跳转
                    start_byte = line_byte_index.get(start_line, 0)
                    f.seek(start_byte)

                    # 读取指定范围的行
                    lines = []
                    current_line = start_line
                    while current_line < end_line:
                        line = f.readline()
                        if not line:  # EOF
                            break
                        lines.append(line.rstrip())
                        current_line += 1

                    if lines:
                        extracted_parts.append(f"--- Line {start_line}-{end_line} ---\n" + '\n'.join(lines))

                    # 提高限制，允许提取更多内容
                    if sum(len(p) for p in extracted_parts) > 50000:  # 从10000提高到50000
                        break

        except Exception as e:
            logger.debug(f"Error extracting from {file_path}: {e}")

        return '\n\n'.join(extracted_parts)

    def _build_line_byte_index(
        self,
        file_path: Path,
        line_ranges: List[Tuple[int, int]]
    ) -> Dict[int, int]:
        """
        ========== Bug Fix 1: 构建需要提取的行的字节偏移量索引 ==========
        只构建需要的行的索引，避免读取整个文件
        """
        if not line_ranges:
            return {}

        # 找出需要索引的最小和最大行号
        min_line = min(start for start, _ in line_ranges)
        max_line = max(end for _, end in line_ranges)

        # 确保从0开始（或从最小行开始）
        min_line = max(0, min_line)

        line_byte_index: Dict[int, int] = {}
        current_byte = 0

        try:
            with open(file_path, 'rb') as f:
                line_num = 0
                while line_num <= max_line:
                    line_byte_index[line_num] = current_byte
                    line = f.readline()
                    if not line:  # EOF
                        break
                    current_byte += len(line)
                    line_num += 1
        except Exception as e:
            logger.debug(f"Error building line index for {file_path}: {e}")

        return line_byte_index

    def _merge_line_ranges(self, line_matches: List[LineMatch]) -> List[Tuple[int, int]]:
        """Merge overlapping line ranges"""
        if not line_matches:
            return []

        # Sort by start line
        ranges = sorted(
            [(m.context_start, m.context_end) for m in line_matches],
            key=lambda x: x[0]
        )

        merged = [ranges[0]]
        for start, end in ranges[1:]:
            last_start, last_end = merged[-1]
            if start <= last_end + 10:  # Merge if close enough
                merged[-1] = (last_start, max(last_end, end))
            else:
                merged.append((start, end))

        return merged

    def _read_lines_range(self, file_obj, start_line: int, end_line: int) -> str:
        """
        Read a specific range of lines from a file.
        Uses line-by-line reading to avoid memory issues with large files.
        """
        lines = []
        current_line = 0

        # Seek to approximate position if file is large
        # For simplicity, we iterate line by line
        file_obj.seek(0)  # Reset to start

        for line in file_obj:
            if current_line >= start_line and current_line < end_line:
                lines.append(line.rstrip())
            current_line += 1
            if current_line >= end_line:
                break

        return '\n'.join(lines)

    def _cross_validate_results(
        self,
        results: List[FileSearchResult],
        keywords: List[str]
    ) -> List[FileSearchResult]:
        """
        Phase 5: Cross-validate results from multiple sources.
        Boost results that appear in multiple sources.
        """
        if len(results) <= 1:
            return results

        # Group results by company
        company_results: Dict[str, List[FileSearchResult]] = {}
        for r in results:
            key = r.company_name or r.stock_code
            if key not in company_results:
                company_results[key] = []
            company_results[key].append(r)

        # Cross-validate: boost if data appears in multiple sources
        for company, company_result_list in company_results.items():
            source_types = set(r.source_type for r in company_result_list)

            # If company has data from multiple sources, boost all results
            if len(source_types) > 1:
                for r in company_result_list:
                    r.priority_score += 5  # Cross-validation bonus
                    logger.debug(f"Cross-validated {company} from {source_types}")

        return results

    def extract_jsonl_record(self, file_path: str, line_number: int) -> Optional[Dict[str, Any]]:
        """
        Extract a specific record from JSONL file by line number.
        Used for precise record extraction.
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                for i, line in enumerate(f):
                    if i == line_number and line.strip():
                        return json.loads(line)
        except Exception as e:
            logger.debug(f"Error extracting JSONL record: {e}")

        return None

    def search_financial_metrics(
        self,
        company_name: str,
        stock_code: Optional[str] = None,
        year: Optional[str] = None,
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Specialized search for financial metrics.

        Args:
            company_name: Company name
            stock_code: Stock code
            year: Target year
            metrics: List of metrics to find (e.g., ["营收", "利润", "ROE"])

        Returns:
            Dict with found metrics and their values
        """
        keywords = [company_name]
        if stock_code:
            keywords.append(stock_code)
        if year:
            keywords.append(year)
        if metrics:
            keywords.extend(metrics)

        results, stats = self.search(
            keywords=keywords,
            max_results=10,
            source_types=['financial', 'research'],
            year_filter=year
        )

        # Extract numeric values for metrics
        found_metrics = {}
        metric_patterns = {
            '营收': r'营收[：:\s]*([\d.]+亿?万?)',
            '利润': r'净利润[：:\s]*([\d.]+亿?万?)',
            'ROE': r'ROE[：:\s]*([\d.]+%?)',
            '毛利率': r'毛利率[：:\s]*([\d.]+%?)',
            '净利率': r'净利率[：:\s]*([\d.]+%?)',
            'PE': r'PE[：:\s]*([\d.]+)',
            'PB': r'PB[：:\s]*([\d.]+)',
        }

        for result in results:
            content = result.extracted_content
            for metric, pattern in metric_patterns.items():
                if metrics and metric not in metrics:
                    continue
                match = re.search(pattern, content)
                if match:
                    found_metrics[metric] = {
                        'value': match.group(1),
                        'source': result.file_path,
                        'date': result.date
                    }

        return {
            'metrics': found_metrics,
            'sources': results,
            'stats': {
                'total_duration_ms': stats.total_duration * 1000,
                'files_searched': stats.files_searched,
                'cross_validated': stats.cross_validated
            }
        }


# Factory function
def create_precise_searcher(
    research_reports_dir: Optional[Path] = None,
    news_dir: Optional[Path] = None,
    financial_reports_dir: Optional[Path] = None,
    daily_quote_dir: Optional[Path] = None
) -> PreciseSearcher:
    """Create a PreciseSearcher instance"""
    return PreciseSearcher(
        research_reports_dir=research_reports_dir,
        news_dir=news_dir,
        financial_reports_dir=financial_reports_dir,
        daily_quote_dir=daily_quote_dir
    )