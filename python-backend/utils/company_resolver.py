# Company Name Resolver
# Maps any company name variant to all related names
# Uses listed_company_code_map.xlsx for comprehensive name coverage

import os
import re
import pandas as pd
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class CompanyInfo:
    """Complete company information"""
    stock_code: str          # 上市代码 (e.g., "601898")
    listed_name: str         # 上市简称 (e.g., "中煤能源")
    company_short: str       # 公司简称 (e.g., "中煤能源股份")
    company_full: str        # 公司全称 (e.g., "中国中煤能源股份有限公司")
    market: str              # 市场 (e.g., "沪市", "深市")
    status: str              # 上市状态


class CompanyNameResolver:
    """
    Resolves company names to all variants.

    Usage:
        resolver = CompanyNameResolver()
        variants = resolver.get_all_variants("中国中煤")
        # Returns: ["601898", "601898.SH", "中煤能源", "中国中煤能源股份有限公司", ...]
    """

    def __init__(self, excel_path: Optional[str] = None):
        """
        Initialize the resolver with company mapping data.

        Args:
            excel_path: Path to listed_company_code_map.xlsx
        """
        if excel_path is None:
            # Default path
            excel_path = Path(__file__).parent.parent.parent / "listed_company_code_map.xlsx"

        self.excel_path = Path(excel_path)
        self.companies: Dict[str, CompanyInfo] = {}  # stock_code -> CompanyInfo
        self.name_index: Dict[str, str] = {}  # any_name_variant -> stock_code

        self._load_data()
        self._build_index()

        logger.info(f"CompanyNameResolver loaded {len(self.companies)} companies")

    def _load_data(self):
        """Load company data from Excel file"""
        if not self.excel_path.exists():
            logger.warning(f"Company mapping file not found: {self.excel_path}")
            return

        try:
            df = pd.read_excel(self.excel_path)

            for _, row in df.iterrows():
                stock_code = str(row['上市代码']).strip()
                listed_name = str(row['上市简称']).strip() if pd.notna(row['上市简称']) else ""
                company_short = str(row['公司简称']).strip() if pd.notna(row['公司简称']) else ""
                company_full = str(row['公司全称']).strip() if pd.notna(row['公司全称']) else ""
                market = str(row['市场']).strip() if pd.notna(row['市场']) else ""
                status = str(row['上市状态']).strip() if pd.notna(row['上市状态']) else ""

                # Skip delisted companies optionally
                if status and status != '上市':
                    continue

                info = CompanyInfo(
                    stock_code=stock_code,
                    listed_name=listed_name,
                    company_short=company_short,
                    company_full=company_full,
                    market=market,
                    status=status
                )

                self.companies[stock_code] = info

        except Exception as e:
            logger.error(f"Error loading company mapping: {e}")

    def _build_index(self):
        """Build reverse index from all name variants to stock code"""
        for stock_code, info in self.companies.items():
            # Index all name variants
            names = [
                info.stock_code,
                info.listed_name,
                info.company_short,
                info.company_full,
            ]

            # Add market-suffixed codes
            if info.market:
                if info.market == '沪市':
                    names.append(f"{info.stock_code}.SH")
                    names.append(f"{info.stock_code}SH")
                elif info.market == '深市':
                    names.append(f"{info.stock_code}.SZ")
                    names.append(f"{info.stock_code}SZ")
                elif info.market == '北市':
                    names.append(f"{info.stock_code}.BJ")
                    names.append(f"{info.stock_code}BJ")

            # Add to index (lowercase for case-insensitive matching)
            for name in names:
                if name:
                    # Store both original and lowercase
                    self.name_index[name.lower()] = stock_code
                    # Also store without common suffixes
                    clean_name = self._clean_name(name)
                    if clean_name and clean_name != name.lower():
                        self.name_index[clean_name] = stock_code

    def _clean_name(self, name: str) -> str:
        """Clean name by removing common suffixes"""
        name = name.lower().strip()
        # Remove common suffixes
        suffixes = ['股份', '股份有限公司', '有限公司', '集团', 'A', 'B']
        for suffix in suffixes:
            if name.endswith(suffix.lower()):
                name = name[:-len(suffix)]
        return name.strip()

    def lookup(self, name: str) -> Optional[CompanyInfo]:
        """
        Look up a company by any name variant.

        Args:
            name: Any name variant (stock code, listed name, company name, etc.)

        Returns:
            CompanyInfo if found, None otherwise
        """
        name_lower = name.lower().strip()

        # Direct lookup
        if name_lower in self.name_index:
            stock_code = self.name_index[name_lower]
            return self.companies.get(stock_code)

        # Try partial matching for company names
        for indexed_name, stock_code in self.name_index.items():
            if name_lower in indexed_name or indexed_name in name_lower:
                return self.companies.get(stock_code)

        return None

    def get_all_variants(self, name: str) -> List[str]:
        """
        Get all name variants for a company given any name.

        Args:
            name: Any name variant (stock code, listed name, company name, etc.)

        Returns:
            List of all name variants for search
        """
        info = self.lookup(name)
        if not info:
            # Return original name if not found
            return [name]

        variants = set()

        # 1. Stock code
        variants.add(info.stock_code)

        # 2. Stock code with market suffix
        if info.market == '沪市':
            variants.add(f"{info.stock_code}.SH")
            variants.add(f"{info.stock_code}SH")
        elif info.market == '深市':
            variants.add(f"{info.stock_code}.SZ")
            variants.add(f"{info.stock_code}SZ")
        elif info.market == '北市':
            variants.add(f"{info.stock_code}.BJ")
            variants.add(f"{info.stock_code}BJ")

        # 3. Listed name (上市简称)
        if info.listed_name:
            variants.add(info.listed_name)

        # 4. Company short name (公司简称)
        if info.company_short:
            variants.add(info.company_short)

        # 5. Company full name (公司全称)
        if info.company_full:
            variants.add(info.company_full)

        # 6. Original input name
        variants.add(name)

        # Filter out empty strings
        return [v for v in variants if v and v.strip()]

    def get_search_pattern(self, name: str) -> str:
        """
        Get a regex search pattern for all variants.

        Args:
            name: Any name variant

        Returns:
            Regex pattern string for searching
        """
        variants = self.get_all_variants(name)
        # Escape special regex characters and join with |
        escaped = [re.escape(v) for v in variants]
        return '|'.join(escaped)

    def expand_keywords(self, keywords: List[str]) -> List[str]:
        """
        Expand a list of keywords with all company name variants.

        Args:
            keywords: Original keywords list

        Returns:
            Expanded keywords list with all variants
        """
        expanded = set()

        for kw in keywords:
            # Check if this keyword is a company name
            info = self.lookup(kw)
            if info:
                # Add all variants
                variants = self.get_all_variants(kw)
                expanded.update(variants)
            else:
                # Keep original keyword
                expanded.add(kw)

        return list(expanded)

    def get_company_by_stock_code(self, stock_code: str) -> Optional[CompanyInfo]:
        """Get company info by stock code"""
        # Normalize stock code
        stock_code = stock_code.replace('.SH', '').replace('.SZ', '').replace('.BJ', '')
        return self.companies.get(stock_code)

    def search_companies(self, query: str, limit: int = 10) -> List[Tuple[str, CompanyInfo]]:
        """
        Search for companies matching a query string.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of (matched_name, CompanyInfo) tuples
        """
        results = []
        query_lower = query.lower().strip()

        for name, stock_code in self.name_index.items():
            if query_lower in name:
                info = self.companies.get(stock_code)
                if info and info not in [r[1] for r in results]:
                    results.append((name, info))
                    if len(results) >= limit:
                        break

        return results


# Singleton instance
_resolver_instance: Optional[CompanyNameResolver] = None


def get_company_resolver() -> CompanyNameResolver:
    """Get the singleton CompanyNameResolver instance"""
    global _resolver_instance
    if _resolver_instance is None:
        _resolver_instance = CompanyNameResolver()
    return _resolver_instance


def expand_company_names(keywords: List[str]) -> List[str]:
    """
    Convenience function to expand company names in keywords.

    Args:
        keywords: List of keywords that may include company names

    Returns:
        Expanded list with all company name variants
    """
    resolver = get_company_resolver()
    return resolver.expand_keywords(keywords)


# Test code
if __name__ == "__main__":
    resolver = CompanyNameResolver()

    # Test cases
    test_names = [
        "中国中煤",
        "601898",
        "中煤能源",
        "紫金矿业",
        "宁德时代",
        "比亚迪",
        "平安银行",
    ]

    print("=" * 60)
    print("Company Name Resolver Test")
    print("=" * 60)

    for name in test_names:
        info = resolver.lookup(name)
        if info:
            variants = resolver.get_all_variants(name)
            print(f"\n输入: {name}")
            print(f"  上市代码: {info.stock_code}")
            print(f"  上市简称: {info.listed_name}")
            print(f"  公司简称: {info.company_short}")
            print(f"  公司全称: {info.company_full}")
            print(f"  搜索关键词: {variants}")
        else:
            print(f"\n输入: {name} -> 未找到")