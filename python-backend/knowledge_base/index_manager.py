"""
Index Manager - Manage knowledge base index lifecycle.

Handles:
- Loading index on startup
- Checking for updates
- Incremental index updates
- Thread-safe index access
"""

import os
import json
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Global index manager instance
_index_manager: Optional['IndexManager'] = None
_index_lock = threading.Lock()


class IndexManager:
    """
    Index Manager for knowledge base index.

    Provides thread-safe access to the index and handles
    automatic updates when files change.
    """

    def __init__(
        self,
        research_reports_dir: Path,
        financial_reports_dir: Optional[Path],
        index_path: Path,
        auto_update: bool = True
    ):
        self.research_reports_dir = Path(research_reports_dir)
        self.financial_reports_dir = Path(financial_reports_dir) if financial_reports_dir else None
        self.index_path = Path(index_path)

        self.auto_update = auto_update
        self._index: Optional[Dict[str, Any]] = None
        self._loaded = False
        self._last_check: Optional[datetime] = None

    @property
    def is_loaded(self) -> bool:
        """Check if index is loaded"""
        return self._loaded and self._index is not None

    @property
    def index(self) -> Dict[str, Any]:
        """Get index, loading if necessary"""
        if not self.is_loaded:
            self.load()
        return self._index or {}

    @property
    def company_index(self) -> Dict[str, Any]:
        """Get company index"""
        return self.index.get("company_index", {})

    @property
    def file_index(self) -> Dict[str, Any]:
        """Get file index"""
        return self.index.get("file_index", {})

    def load(self, force: bool = False) -> bool:
        """
        Load index from file.

        Args:
            force: Force reload even if already loaded

        Returns:
            True if loaded successfully
        """
        with _index_lock:
            if self._loaded and not force:
                return True

            if not self.index_path.exists():
                logger.info(f"Index file not found: {self.index_path}")
                # Try to build index
                return self._build_and_load()

            try:
                with open(self.index_path, 'r', encoding='utf-8') as f:
                    self._index = json.load(f)

                self._loaded = True
                self._last_check = datetime.now()

                stats = self._index.get("stats", {})
                logger.info(f"Index loaded: {stats.get('company_count', 0)} companies, "
                           f"{stats.get('file_count', 0)} files")

                return True

            except Exception as e:
                logger.error(f"Error loading index: {e}")
                return False

    def _build_and_load(self) -> bool:
        """Build index and load it"""
        try:
            from knowledge_base.indexer import KnowledgeIndexer

            logger.info("Building index...")
            indexer = KnowledgeIndexer(
                research_reports_dir=self.research_reports_dir,
                financial_reports_dir=self.financial_reports_dir,
                index_path=self.index_path
            )

            index = indexer.build_full_index()
            if indexer.save_index(index):
                self._index = index
                self._loaded = True
                self._last_check = datetime.now()
                logger.info("Index built and loaded successfully")
                return True

        except Exception as e:
            logger.error(f"Error building index: {e}")

        return False

    def check_and_update(self) -> bool:
        """
        Check for changes and update index if needed.

        Returns:
            True if index was updated
        """
        if not self.auto_update:
            return False

        with _index_lock:
            try:
                # Check for new directories
                current_companies = self._get_current_company_count()

                if self._index:
                    stats = self._index.get("stats", {})
                    indexed_companies = stats.get("company_count", 0)

                    if current_companies > indexed_companies:
                        logger.info(f"New companies detected: {current_companies} > {indexed_companies}")
                        return self._build_and_load()

                # Check for file modifications (sample a few directories)
                if self._has_file_modifications():
                    logger.info("File modifications detected")
                    return self._build_and_load()

                self._last_check = datetime.now()
                return False

            except Exception as e:
                logger.error(f"Error checking for updates: {e}")
                return False

    def _get_current_company_count(self) -> int:
        """Get current number of company directories"""
        count = 0

        if self.research_reports_dir.exists():
            count += len([d for d in os.listdir(self.research_reports_dir)
                         if (self.research_reports_dir / d).is_dir()])

        if self.financial_reports_dir and self.financial_reports_dir.exists():
            count += len([d for d in os.listdir(self.financial_reports_dir)
                         if (self.financial_reports_dir / d).is_dir()])

        return count

    def _has_file_modifications(self) -> bool:
        """Check if any files have been modified since index was built"""
        if not self._index:
            return False

        index_time = self._index.get("build_time", "")
        if not index_time:
            return False

        try:
            index_dt = datetime.fromisoformat(index_time)
        except:
            return False

        # Sample a few directories to check modification times
        sample_dirs = []

        if self.research_reports_dir.exists():
            dirs = [self.research_reports_dir / d
                   for d in os.listdir(self.research_reports_dir)[:5]]
            sample_dirs.extend(d for d in dirs if d.is_dir())

        for dir_path in sample_dirs:
            try:
                mtime = datetime.fromtimestamp(dir_path.stat().st_mtime)
                if mtime > index_dt:
                    return True
            except:
                continue

        return False

    def search_companies(self, keyword: str) -> List[Dict[str, Any]]:
        """
        Search for companies by keyword.

        Uses the index for fast lookup.

        Args:
            keyword: Company name, short name, or stock code

        Returns:
            List of matching companies
        """
        if not self.is_loaded:
            self.load()

        matches = []
        keyword_lower = keyword.lower()
        company_index = self.company_index
        file_index = self.file_index

        # 1. Direct match on company name
        if keyword in company_index:
            info = company_index[keyword]
            if isinstance(info, dict):
                matches.append({
                    "company_name": keyword,
                    "stock_code": info.get("stock_code", ""),
                    "dir_path": info.get("dir_path", ""),
                    "match_type": "exact"
                })
            elif isinstance(info, list):
                # Short name matched
                for code in info:
                    full_name = company_index.get(code, "")
                    if full_name and isinstance(full_name, str):
                        matches.append({
                            "company_name": full_name,
                            "stock_code": code,
                            "match_type": "short_name"
                        })

        # 2. Stock code match
        if keyword.isdigit() and len(keyword) == 6:
            full_name = company_index.get(keyword, "")
            if full_name and isinstance(full_name, str):
                company_info = file_index.get(full_name, {})
                matches.append({
                    "company_name": full_name,
                    "stock_code": keyword,
                    "dir_path": company_info.get("dir_path", ""),
                    "match_type": "stock_code"
                })

        # 3. Partial match (only if no exact match)
        if not matches:
            for name, info in company_index.items():
                if keyword_lower in name.lower():
                    if isinstance(info, dict):
                        matches.append({
                            "company_name": name,
                            "stock_code": info.get("stock_code", ""),
                            "dir_path": info.get("dir_path", ""),
                            "match_type": "partial"
                        })
                        # Limit partial matches
                        if len(matches) >= 10:
                            break

        return matches

    def get_company_files(self, company_name: str) -> List[Dict[str, Any]]:
        """
        Get files for a company.

        Args:
            company_name: Company name

        Returns:
            List of file info dictionaries
        """
        if not self.is_loaded:
            self.load()

        company_info = self.file_index.get(company_name, {})
        return company_info.get("files", [])

    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        if not self.is_loaded:
            self.load()

        return self._index.get("stats", {}) if self._index else {}


def get_index_manager(
    research_reports_dir: Optional[Path] = None,
    financial_reports_dir: Optional[Path] = None,
    index_path: Optional[Path] = None,
    auto_update: bool = True
) -> IndexManager:
    """
    Get or create the global index manager.

    This is a singleton pattern to ensure only one index is loaded.
    """
    global _index_manager

    with _index_lock:
        if _index_manager is None:
            # Import config for defaults
            from config import RESEARCH_REPORTS_DIR, FINANCIAL_REPORTS_DIR, BASE_DIR

            if research_reports_dir is None:
                research_reports_dir = RESEARCH_REPORTS_DIR
            if financial_reports_dir is None:
                financial_reports_dir = FINANCIAL_REPORTS_DIR
            if index_path is None:
                index_path = BASE_DIR / "python-backend" / "data" / "knowledge_index.json"

            _index_manager = IndexManager(
                research_reports_dir=research_reports_dir,
                financial_reports_dir=financial_reports_dir,
                index_path=index_path,
                auto_update=auto_update
            )

        return _index_manager


def initialize_index() -> bool:
    """
    Initialize the index at application startup.

    Should be called once when the application starts.

    Returns:
        True if index was initialized successfully
    """
    manager = get_index_manager()
    return manager.load()


if __name__ == "__main__":
    # Test the index manager
    print("Testing Index Manager...")

    manager = get_index_manager()

    if manager.load():
        print(f"Index loaded successfully")
        print(f"Stats: {manager.get_stats()}")

        # Test search
        test_keywords = ["紫金矿业", "601899", "茅台", "平安"]
        for kw in test_keywords:
            matches = manager.search_companies(kw)
            print(f"\nSearch '{kw}': {len(matches)} matches")
            for m in matches:
                print(f"  - {m['company_name']} ({m['stock_code']})")
    else:
        print("Failed to load index")