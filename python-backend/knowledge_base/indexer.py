"""
Knowledge Base Indexer - Build and manage search index for knowledge base files.

This module provides fast company lookup and file metadata indexing to speed up
the precise search process. Instead of scanning directories on every search,
we build a persistent index that can be loaded quickly.

Index Structure:
{
    "version": "1.0",
    "build_time": "2026-03-28T12:00:00",
    "stats": {
        "company_count": 500,
        "file_count": 2000
    },
    "company_index": {
        "紫金矿业集团股份有限公司": {"stock_code": "601899.SH", "dir_path": "..."},
        "紫金矿业": ["601899.SH"],  # Short name index
        "601899": "紫金矿业集团股份有限公司"  # Stock code index
    },
    "file_index": {
        "紫金矿业_601899.SH": {
            "files": [
                {"filename": "history.jsonl", "line_index": [...]}
            ]
        }
    }
}
"""

import os
import json
import logging
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)

INDEX_VERSION = "1.0"


@dataclass
class IndexStats:
    """Statistics about the index"""
    company_count: int = 0
    file_count: int = 0
    total_size_kb: float = 0.0
    build_time_seconds: float = 0.0


@dataclass
class FileInfo:
    """Information about a single file"""
    filename: str
    file_type: str
    priority: int = 0
    size_kb: float = 0.0
    last_modified: str = ""
    content_hash: str = ""
    # For JSONL files
    line_index: List[Dict[str, Any]] = field(default_factory=list)
    record_count: int = 0


@dataclass
class CompanyInfo:
    """Information about a company"""
    stock_code: str
    dir_path: str
    file_count: int = 0
    latest_update: str = ""
    files: List[FileInfo] = field(default_factory=list)


class KnowledgeIndexer:
    """
    Knowledge Base Indexer

    Builds and manages a search index for the knowledge base files.
    The index enables fast company lookup and file discovery without
    scanning directories on every search.
    """

    # File priority weights (higher = more important)
    FILE_PRIORITY = {
        'analysis_whitepaper.md': 10,
        'deep_research_report': 8,
        'deep_research_prompt': 6,
        'history.jsonl': 5,
        '.txt': 5,
        '.md': 2,
    }

    def __init__(
        self,
        research_reports_dir: Path,
        financial_reports_dir: Optional[Path] = None,
        index_path: Optional[Path] = None
    ):
        self.research_reports_dir = Path(research_reports_dir)
        self.financial_reports_dir = Path(financial_reports_dir) if financial_reports_dir else None

        # Default index path
        if index_path is None:
            index_path = self.research_reports_dir.parent / "data" / "knowledge_index.json"
        self.index_path = Path(index_path)

        # Ensure data directory exists
        self.index_path.parent.mkdir(parents=True, exist_ok=True)

        # Index data
        self.company_index: Dict[str, Any] = {}
        self.file_index: Dict[str, CompanyInfo] = {}
        self.stats = IndexStats()

    def build_full_index(self) -> Dict[str, Any]:
        """
        Build complete index from scratch.

        Returns:
            Complete index dictionary ready for serialization
        """
        start_time = datetime.now()
        logger.info(f"Starting index build from {self.research_reports_dir}")

        # Reset index
        self.company_index = {}
        self.file_index = {}

        # Process Research Reports
        if self.research_reports_dir.exists():
            self._process_research_reports()

        # Process Financial Reports
        if self.financial_reports_dir and self.financial_reports_dir.exists():
            self._process_financial_reports()

        # Calculate stats
        build_time = (datetime.now() - start_time).total_seconds()
        self.stats.company_count = len(self.file_index)
        self.stats.file_count = sum(len(c.files) for c in self.file_index.values())
        self.stats.build_time_seconds = build_time

        logger.info(f"Index built: {self.stats.company_count} companies, "
                   f"{self.stats.file_count} files in {build_time:.2f}s")

        # Build final index structure
        index = {
            "version": INDEX_VERSION,
            "build_time": datetime.now().isoformat(),
            "stats": asdict(self.stats),
            "company_index": self.company_index,
            "file_index": self._serialize_file_index()
        }

        return index

    def _process_research_reports(self):
        """Process Research Reports directory"""
        try:
            dirs = os.listdir(self.research_reports_dir)
            total = len([d for d in dirs if (self.research_reports_dir / d).is_dir()])
            processed = 0

            for company_dir in dirs:
                company_path = self.research_reports_dir / company_dir
                if not company_path.is_dir():
                    continue

                processed += 1
                if processed % 50 == 0:
                    logger.info(f"Processing: {processed}/{total} companies")

                self._process_company_directory(company_path, "research")

            logger.info(f"Processed {processed} research report directories")
        except Exception as e:
            logger.error(f"Error processing research reports: {e}")

    def _process_financial_reports(self):
        """Process Financial Reports directory"""
        if not self.financial_reports_dir:
            return

        try:
            for company_dir in os.listdir(self.financial_reports_dir):
                company_path = self.financial_reports_dir / company_dir
                if not company_path.is_dir():
                    continue

                self._process_company_directory(company_path, "financial")
        except Exception as e:
            logger.error(f"Error processing financial reports: {e}")

    def _process_company_directory(self, company_path: Path, source: str):
        """
        Process a single company directory and add to index.

        Args:
            company_path: Path to company directory
            source: "research" or "financial"
        """
        company_dir = company_path.name

        # Parse company name and stock code
        # Research: "公司名称_股票代码"
        # Financial: "公司名称-股票代码"
        if source == "research":
            parts = company_dir.rsplit("_", 1)
        else:
            parts = company_dir.rsplit("-", 1)

        company_name = parts[0] if len(parts) >= 1 else company_dir
        stock_code = parts[1] if len(parts) >= 2 else ""

        # Get directory modification time
        try:
            dir_mtime = datetime.fromtimestamp(company_path.stat().st_mtime).strftime("%Y-%m-%d")
        except:
            dir_mtime = ""

        # Build company index entries
        # 1. Full name -> info
        if company_name not in self.company_index or isinstance(self.company_index.get(company_name), list):
            self.company_index[company_name] = {
                "stock_code": stock_code,
                "dir_path": str(company_path.relative_to(self.research_reports_dir.parent)),
                "source": source
            }

        # 2. Short name index (for quick lookup)
        short_name = self._extract_short_name(company_name)
        if short_name and short_name != company_name:
            if short_name not in self.company_index:
                self.company_index[short_name] = []
            if isinstance(self.company_index[short_name], list) and stock_code not in self.company_index[short_name]:
                self.company_index[short_name].append(stock_code)

        # 3. Stock code -> company name
        if stock_code:
            # Full code (e.g., "601899.SH")
            self.company_index[stock_code] = company_name
            # Numeric code only (e.g., "601899")
            numeric_code = stock_code.split(".")[0] if "." in stock_code else stock_code
            if numeric_code != stock_code:
                self.company_index[numeric_code] = company_name

        # Process files in directory
        files = self._process_files(company_path, company_name, stock_code, source)

        # Store in file index
        if company_name in self.file_index:
            # Merge files if company already exists
            existing = self.file_index[company_name]
            existing.files.extend(files)
            existing.file_count = len(existing.files)
        else:
            self.file_index[company_name] = CompanyInfo(
                stock_code=stock_code,
                dir_path=str(company_path),
                file_count=len(files),
                latest_update=dir_mtime,
                files=files
            )

    def _process_files(
        self,
        company_path: Path,
        company_name: str,
        stock_code: str,
        source: str
    ) -> List[FileInfo]:
        """Process all files in a company directory"""
        files = []

        try:
            for filename in os.listdir(company_path):
                file_path = company_path / filename

                # Skip directories
                if not file_path.is_file():
                    continue

                # Get file info
                file_info = self._get_file_info(file_path, filename, source)
                if file_info:
                    files.append(file_info)

        except OSError as e:
            logger.debug(f"Error reading directory {company_path}: {e}")

        return files

    def _get_file_info(self, file_path: Path, filename: str, source: str) -> Optional[FileInfo]:
        """Get information about a single file"""
        try:
            stat = file_path.stat()
            size_kb = stat.st_size / 1024
            last_modified = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d")

            # Determine file type and priority
            file_type, priority = self._get_file_type_and_priority(filename)

            # Build line index for JSONL files
            line_index = []
            record_count = 0

            if filename == 'history.jsonl':
                line_index, record_count = self._build_jsonl_line_index(file_path)

            # Calculate content hash (first 1KB only for speed)
            content_hash = self._calculate_file_hash(file_path)

            return FileInfo(
                filename=filename,
                file_type=file_type,
                priority=priority,
                size_kb=round(size_kb, 2),
                last_modified=last_modified,
                content_hash=content_hash,
                line_index=line_index,
                record_count=record_count
            )
        except Exception as e:
            logger.debug(f"Error processing file {file_path}: {e}")
            return None

    def _get_file_type_and_priority(self, filename: str) -> Tuple[str, int]:
        """Determine file type and priority score"""
        # Check exact matches first
        if filename in self.FILE_PRIORITY:
            return filename, self.FILE_PRIORITY[filename]

        # Check prefixes
        for prefix, priority in self.FILE_PRIORITY.items():
            if not prefix.startswith('.'):
                if filename.startswith(prefix):
                    return prefix, priority

        # Check extensions
        ext = Path(filename).suffix
        if ext in self.FILE_PRIORITY:
            return ext, self.FILE_PRIORITY[ext]

        return "other", 1

    def _build_jsonl_line_index(self, jsonl_path: Path) -> Tuple[List[Dict], int]:
        """
        Build line index for JSONL file.

        Each entry contains:
        - line: line number
        - offset: byte offset (for fast seeking)
        - date: record date (if available)
        - broker: broker name (if available)
        """
        line_index = []
        record_count = 0

        try:
            with open(jsonl_path, 'r', encoding='utf-8', errors='ignore') as f:
                offset = 0
                for line_num, line in enumerate(f):
                    if not line.strip():
                        offset += len(line.encode('utf-8'))
                        continue

                    try:
                        record = json.loads(line)
                        line_index.append({
                            "line": line_num,
                            "offset": offset,
                            "date": record.get("date", ""),
                            "broker": record.get("broker", ""),
                            "ticker": record.get("ticker", "")
                        })
                        record_count += 1
                    except json.JSONDecodeError:
                        pass

                    offset += len(line.encode('utf-8'))

                    # Limit index size for very large files
                    if len(line_index) > 100:
                        break

        except Exception as e:
            logger.debug(f"Error building JSONL index for {jsonl_path}: {e}")

        return line_index, record_count

    def _calculate_file_hash(self, file_path: Path, sample_size: int = 1024) -> str:
        """Calculate hash of file content (sample only for speed)"""
        try:
            with open(file_path, 'rb') as f:
                sample = f.read(sample_size)
                return hashlib.md5(sample).hexdigest()[:8]
        except:
            return ""

    def _extract_short_name(self, company_name: str) -> str:
        """
        Extract short name from full company name.

        Examples:
        - "紫金矿业集团股份有限公司" -> "紫金矿业"
        - "贵州茅台酒股份有限公司" -> "贵州茅台"
        """
        # Common suffixes to remove
        suffixes = [
            "集团股份有限公司", "股份有限公司", "集团有限公司",
            "集团股份公司", "股份公司", "有限公司", "集团"
        ]

        for suffix in suffixes:
            if company_name.endswith(suffix):
                return company_name[:-len(suffix)]

        # If no suffix matched, try to extract first 4 chars for Chinese names
        if len(company_name) >= 4 and all('\u4e00' <= c <= '\u9fff' for c in company_name[:4]):
            return company_name[:4]

        return company_name

    def _serialize_file_index(self) -> Dict[str, Any]:
        """Serialize file index for JSON storage"""
        result = {}
        for company_name, info in self.file_index.items():
            result[company_name] = {
                "stock_code": info.stock_code,
                "dir_path": info.dir_path,
                "file_count": info.file_count,
                "latest_update": info.latest_update,
                "files": [asdict(f) for f in info.files]
            }
        return result

    def save_index(self, index: Optional[Dict] = None) -> bool:
        """Save index to file"""
        if index is None:
            index = {
                "version": INDEX_VERSION,
                "build_time": datetime.now().isoformat(),
                "stats": asdict(self.stats),
                "company_index": self.company_index,
                "file_index": self._serialize_file_index()
            }

        try:
            with open(self.index_path, 'w', encoding='utf-8') as f:
                json.dump(index, f, ensure_ascii=False, indent=2)

            logger.info(f"Index saved to {self.index_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving index: {e}")
            return False

    def load_index(self) -> Optional[Dict[str, Any]]:
        """Load index from file"""
        if not self.index_path.exists():
            logger.info(f"Index file not found: {self.index_path}")
            return None

        try:
            with open(self.index_path, 'r', encoding='utf-8') as f:
                index = json.load(f)

            # Validate version
            if index.get("version") != INDEX_VERSION:
                logger.warning(f"Index version mismatch: {index.get('version')} != {INDEX_VERSION}")
                return None

            # Load into memory
            self.company_index = index.get("company_index", {})
            self.stats = IndexStats(**index.get("stats", {}))

            logger.info(f"Index loaded: {self.stats.company_count} companies, "
                       f"{self.stats.file_count} files")
            return index

        except Exception as e:
            logger.error(f"Error loading index: {e}")
            return None

    def get_company_by_keyword(self, keyword: str) -> List[Dict[str, Any]]:
        """
        Fast company lookup by keyword.

        Args:
            keyword: Company name, short name, or stock code

        Returns:
            List of matching company info
        """
        keyword_lower = keyword.lower()
        matches = []

        # 1. Direct match on company name
        if keyword in self.company_index:
            info = self.company_index[keyword]
            if isinstance(info, dict):
                matches.append({
                    "company_name": keyword,
                    "stock_code": info.get("stock_code", ""),
                    "dir_path": info.get("dir_path", ""),
                    "match_type": "exact"
                })
            elif isinstance(info, list):
                # Short name matched, get all stock codes
                for code in info:
                    full_name = self.company_index.get(code, "")
                    if full_name and isinstance(full_name, str):
                        matches.append({
                            "company_name": full_name,
                            "stock_code": code,
                            "match_type": "short_name"
                        })

        # 2. Stock code match
        if keyword.isdigit() and len(keyword) == 6:
            full_name = self.company_index.get(keyword, "")
            if full_name and isinstance(full_name, str):
                # Get company info
                company_info = self.file_index.get(full_name, {})
                matches.append({
                    "company_name": full_name,
                    "stock_code": keyword,
                    "dir_path": company_info.dir_path if hasattr(company_info, 'dir_path') else "",
                    "match_type": "stock_code"
                })

        # 3. Partial match (slower, only if no exact match)
        if not matches:
            for name, info in self.company_index.items():
                if keyword_lower in name.lower():
                    if isinstance(info, dict):
                        matches.append({
                            "company_name": name,
                            "stock_code": info.get("stock_code", ""),
                            "dir_path": info.get("dir_path", ""),
                            "match_type": "partial"
                        })

        return matches


def create_indexer(
    research_reports_dir: Optional[Path] = None,
    financial_reports_dir: Optional[Path] = None,
    index_path: Optional[Path] = None
) -> KnowledgeIndexer:
    """Factory function to create an indexer"""
    from config import RESEARCH_REPORTS_DIR, FINANCIAL_REPORTS_DIR, BASE_DIR

    if research_reports_dir is None:
        research_reports_dir = RESEARCH_REPORTS_DIR
    if financial_reports_dir is None:
        financial_reports_dir = FINANCIAL_REPORTS_DIR
    if index_path is None:
        index_path = BASE_DIR / "python-backend" / "data" / "knowledge_index.json"

    return KnowledgeIndexer(
        research_reports_dir=research_reports_dir,
        financial_reports_dir=financial_reports_dir,
        index_path=index_path
    )


if __name__ == "__main__":
    # CLI for building index
    import sys

    print("=" * 50)
    print("Knowledge Base Indexer")
    print("=" * 50)

    indexer = create_indexer()

    # Build index
    print("\nBuilding index...")
    index = indexer.build_full_index()

    # Save index
    print("\nSaving index...")
    if indexer.save_index(index):
        print(f"\nIndex built successfully!")
        print(f"  Companies: {indexer.stats.company_count}")
        print(f"  Files: {indexer.stats.file_count}")
        print(f"  Time: {indexer.stats.build_time_seconds:.2f}s")
        print(f"  Path: {indexer.index_path}")
    else:
        print("\nFailed to save index!")
        sys.exit(1)