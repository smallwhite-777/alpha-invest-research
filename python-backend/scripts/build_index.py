#!/usr/bin/env python3
"""
CLI script for building and managing the knowledge base index.

Usage:
    python scripts/build_index.py              # Build index
    python scripts/build_index.py --status     # Show index status
    python scripts/build_index.py --rebuild    # Force rebuild
    python scripts/build_index.py --test       # Test search
"""

import sys
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from knowledge_base.indexer import KnowledgeIndexer, create_indexer
from config import RESEARCH_REPORTS_DIR, FINANCIAL_REPORTS_DIR, BASE_DIR


def build_index(force: bool = False) -> int:
    """Build the knowledge base index"""
    print("=" * 60)
    print("Knowledge Base Index Builder")
    print("=" * 60)
    print(f"\nResearch Reports: {RESEARCH_REPORTS_DIR}")
    print(f"Financial Reports: {FINANCIAL_REPORTS_DIR}")

    # Check directories exist
    if not RESEARCH_REPORTS_DIR.exists():
        print(f"\nError: Research Reports directory not found!")
        return 1

    indexer = create_indexer()

    # Check if index exists
    if indexer.index_path.exists() and not force:
        print(f"\nIndex already exists at: {indexer.index_path}")
        print("Use --rebuild to force rebuild")
        return 0

    # Build index
    print("\nBuilding index...")
    index = indexer.build_full_index()

    # Save index
    print("\nSaving index...")
    if indexer.save_index(index):
        print(f"\n{'='*60}")
        print("Index built successfully!")
        print(f"{'='*60}")
        print(f"  Companies:  {indexer.stats.company_count}")
        print(f"  Files:      {indexer.stats.file_count}")
        print(f"  Build time: {indexer.stats.build_time_seconds:.2f}s")
        print(f"  Index path: {indexer.index_path}")
        print(f"  Index size: {indexer.index_path.stat().st_size / 1024:.1f} KB")
        return 0
    else:
        print("\nFailed to save index!")
        return 1


def show_status() -> int:
    """Show index status"""
    indexer = create_indexer()

    print("=" * 60)
    print("Knowledge Base Index Status")
    print("=" * 60)

    if not indexer.index_path.exists():
        print("\nNo index file found. Run with --build to create.")
        return 1

    index = indexer.load_index()
    if not index:
        print("\nFailed to load index.")
        return 1

    stats = index.get("stats", {})
    print(f"\nIndex Version:    {index.get('version', 'unknown')}")
    print(f"Build Time:       {index.get('build_time', 'unknown')}")
    print(f"Companies:        {stats.get('company_count', 0)}")
    print(f"Files:            {stats.get('file_count', 0)}")
    print(f"Index Size:       {indexer.index_path.stat().st_size / 1024:.1f} KB")
    print(f"Index Path:       {indexer.index_path}")

    # Show sample entries
    company_index = index.get("company_index", {})
    print(f"\nSample companies (first 5):")
    count = 0
    for name, info in company_index.items():
        if isinstance(info, dict) and "stock_code" in info:
            print(f"  - {name} ({info.get('stock_code', '')})")
            count += 1
            if count >= 5:
                break

    return 0


def test_search(keyword: str) -> int:
    """Test search functionality"""
    indexer = create_indexer()

    print("=" * 60)
    print("Knowledge Base Index Search Test")
    print("=" * 60)

    if not indexer.index_path.exists():
        print("\nNo index file found. Run with --build first.")
        return 1

    index = indexer.load_index()
    if not index:
        print("\nFailed to load index.")
        return 1

    print(f"\nSearching for: '{keyword}'")

    matches = indexer.get_company_by_keyword(keyword)

    if matches:
        print(f"\nFound {len(matches)} match(es):")
        for m in matches:
            print(f"  - {m['company_name']} ({m['stock_code']})")
            print(f"    Match type: {m['match_type']}")
            print(f"    Path: {m.get('dir_path', 'N/A')}")
    else:
        print("\nNo matches found.")

    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Knowledge Base Index Builder"
    )
    parser.add_argument(
        "--build", "-b",
        action="store_true",
        help="Build index"
    )
    parser.add_argument(
        "--rebuild", "-r",
        action="store_true",
        help="Force rebuild index"
    )
    parser.add_argument(
        "--status", "-s",
        action="store_true",
        help="Show index status"
    )
    parser.add_argument(
        "--test", "-t",
        type=str,
        metavar="KEYWORD",
        help="Test search with keyword"
    )

    args = parser.parse_args()

    # Default to build if no args
    if not any([args.build, args.rebuild, args.status, args.test]):
        args.build = True

    if args.status:
        return show_status()
    elif args.test:
        return test_search(args.test)
    else:
        return build_index(force=args.rebuild)


if __name__ == "__main__":
    sys.exit(main())