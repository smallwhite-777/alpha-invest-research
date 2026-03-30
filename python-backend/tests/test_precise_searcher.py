"""
Test script for the new PreciseSearcher

Tests the improved search workflow:
1. Parallel file discovery
2. File prioritization
3. Keyword-based line number search
4. Precise offset/limit reading
5. Cross-validation
"""

import sys
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from knowledge_base.precise_searcher import create_precise_searcher
from config import (
    RESEARCH_REPORTS_DIR, NEWS_DIR, FINANCIAL_REPORTS_DIR, DAILY_QUOTE_DIR
)


def test_basic_search():
    """Test basic search functionality"""
    print("=" * 60)
    print("Test 1: Basic Search for 紫金矿业")
    print("=" * 60)

    searcher = create_precise_searcher(
        research_reports_dir=RESEARCH_REPORTS_DIR,
        news_dir=NEWS_DIR,
        financial_reports_dir=FINANCIAL_REPORTS_DIR,
        daily_quote_dir=DAILY_QUOTE_DIR
    )

    # Search for 紫金矿业
    keywords = ["紫金矿业", "紫金", "601899"]

    start_time = time.time()
    results, stats = searcher.search(
        keywords=keywords,
        max_results=10,
        source_types=['research', 'financial']
    )
    duration = time.time() - start_time

    print(f"\nSearch completed in {duration:.2f}s")
    print(f"Stats: {stats.files_discovered} discovered, {stats.files_searched} searched, {stats.keyword_matches} matches")

    print("\nResults:")
    for i, result in enumerate(results, 1):
        print(f"\n{i}. {result.company_name} ({result.stock_code})")
        print(f"   Source: {result.source_type}")
        print(f"   Priority: {result.priority_score}")
        print(f"   Keyword matches: {len(result.line_matches)}")
        print(f"   Content preview: {result.extracted_content[:200]}...")

    return results, stats


def test_year_filtered_search():
    """Test year-filtered search for financial data"""
    print("\n" + "=" * 60)
    print("Test 2: Year-Filtered Search (2023-2024)")
    print("=" * 60)

    searcher = create_precise_searcher(
        research_reports_dir=RESEARCH_REPORTS_DIR,
        news_dir=NEWS_DIR,
        financial_reports_dir=FINANCIAL_REPORTS_DIR,
        daily_quote_dir=DAILY_QUOTE_DIR
    )

    # Search with year filter
    keywords = ["紫金矿业", "营收", "利润", "ROE"]

    start_time = time.time()
    results, stats = searcher.search(
        keywords=keywords,
        max_results=5,
        source_types=['financial', 'research'],
        year_filter="2024"
    )
    duration = time.time() - start_time

    print(f"\nSearch completed in {duration:.2f}s")

    print("\nResults with year filter (2024):")
    for i, result in enumerate(results, 1):
        print(f"\n{i}. {result.company_name} ({result.stock_code})")
        print(f"   Source: {result.source_type}")
        print(f"   Date: {result.date}")
        print(f"   Content preview: {result.extracted_content[:300]}...")

    return results, stats


def test_financial_metrics_extraction():
    """Test financial metrics extraction"""
    print("\n" + "=" * 60)
    print("Test 3: Financial Metrics Extraction")
    print("=" * 60)

    searcher = create_precise_searcher(
        research_reports_dir=RESEARCH_REPORTS_DIR,
        news_dir=NEWS_DIR,
        financial_reports_dir=FINANCIAL_REPORTS_DIR,
        daily_quote_dir=DAILY_QUOTE_DIR
    )

    # Search for specific financial metrics
    metrics_result = searcher.search_financial_metrics(
        company_name="紫金矿业",
        stock_code="601899",
        year="2024",
        metrics=["营收", "利润", "ROE", "毛利率"]
    )

    print("\nExtracted metrics:")
    for metric, data in metrics_result.get('metrics', {}).items():
        print(f"  {metric}: {data['value']} ({data['date']})")

    print(f"\nStats: {metrics_result['stats']}")

    return metrics_result


def test_comparison_search():
    """Test search for company comparison"""
    print("\n" + "=" * 60)
    print("Test 4: Company Comparison Search")
    print("=" * 60)

    searcher = create_precise_searcher(
        research_reports_dir=RESEARCH_REPORTS_DIR,
        news_dir=NEWS_DIR,
        financial_reports_dir=FINANCIAL_REPORTS_DIR,
        daily_quote_dir=DAILY_QUOTE_DIR
    )

    # Search for multiple companies
    keywords = ["宁德时代", "比亚迪", "300750", "002594"]

    start_time = time.time()
    results, stats = searcher.search(
        keywords=keywords,
        max_results=10,
        source_types=['research']
    )
    duration = time.time() - start_time

    print(f"\nSearch completed in {duration:.2f}s")

    print("\nResults:")
    for i, result in enumerate(results, 1):
        print(f"{i}. {result.company_name} ({result.stock_code}) - {result.source_type}")

    return results, stats


def test_jsonl_parsing():
    """Test history.jsonl parsing"""
    print("\n" + "=" * 60)
    print("Test 5: JSONL Parsing for Historical Reports")
    print("=" * 60)

    searcher = create_precise_searcher(
        research_reports_dir=RESEARCH_REPORTS_DIR,
        news_dir=NEWS_DIR,
        financial_reports_dir=FINANCIAL_REPORTS_DIR,
        daily_quote_dir=DAILY_QUOTE_DIR
    )

    # Find a company with history.jsonl
    company_name = "紫金矿业"
    keywords = [company_name, "601899"]

    results, stats = searcher.search(
        keywords=keywords,
        max_results=20,  # Get more results to see history
        source_types=['research']
    )

    # Find history.jsonl results
    history_results = [r for r in results if r.source_type == 'history_jsonl']

    print(f"\nFound {len(history_results)} history.jsonl results")

    if history_results:
        result = history_results[0]
        print(f"\nCompany: {result.company_name}")
        print(f"Line matches: {len(result.line_matches)}")

        for match in result.line_matches[:5]:
            print(f"\n  Line {match.line_number}: {match.line_content[:100]}...")

            # Extract the actual record
            record = searcher.extract_jsonl_record(result.file_path, match.line_number)
            if record:
                print(f"    Date: {record.get('date')}")
                print(f"    Broker: {record.get('broker')}")
                print(f"    Source: {record.get('source_file', '')[:80]}...")

    return history_results


if __name__ == "__main__":
    print("Starting PreciseSearcher Tests...")
    print("=" * 60)

    try:
        # Run tests
        test_basic_search()
        test_year_filtered_search()
        test_financial_metrics_extraction()
        test_comparison_search()
        test_jsonl_parsing()

        print("\n" + "=" * 60)
        print("All tests completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback
        traceback.print_exc()