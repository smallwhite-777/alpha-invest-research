"""
Unit tests for Time Scheduler components.

Tests:
1. Time expression parsing
2. Time context creation
3. Time validation
4. Time-aware evaluation
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime
from agents.time_types import (
    TimeContext, TimeIntentType, YearMatchMode,
    is_core_evidence, is_background_metric
)
from agents.time_parser import TimeExpressionParser
from agents.time_validator import TimeValidator
from agents.time_scheduler import TimeSchedulerAgent
from agents.time_service import TimeService, time_service


def test_time_expression_parser():
    """Test parsing of various time expressions"""
    print("\n=== Testing TimeExpressionParser ===")

    parser = TimeExpressionParser(current_year=2025)

    # Test 1: Explicit year
    ctx = parser.parse("紫金矿业2023年业绩分析")
    assert ctx.time_intent_type == TimeIntentType.EXPLICIT_YEAR
    assert "2023" in ctx.target_years
    print(f"✓ Explicit year: {ctx.target_years}")

    # Test 2: Year range
    ctx = parser.parse("紫金矿业2022-2024年业绩对比")
    assert "2022" in ctx.target_years
    assert "2023" in ctx.target_years
    assert "2024" in ctx.target_years
    print(f"✓ Year range: {ctx.target_years}")

    # Test 3: Relative expression - 近两年
    ctx = parser.parse("紫金矿业近两年业绩分析")
    assert ctx.time_intent_type == TimeIntentType.RELATIVE_EXPRESSION
    assert ctx.target_years == ["2024", "2023"]
    print(f"✓ '近两年': {ctx.target_years}")

    # Test 4: Relative expression - 去年
    ctx = parser.parse("紫金矿业去年营收")
    assert ctx.target_years == ["2024"]
    print(f"✓ '去年': {ctx.target_years}")

    # Test 5: Default (no time expression)
    ctx = parser.parse("紫金矿业业绩分析")
    assert ctx.target_years == ["2024", "2023"]  # Default to last two years
    print(f"✓ Default: {ctx.target_years}")

    print("All TimeExpressionParser tests passed!\n")


def test_time_context():
    """Test TimeContext methods"""
    print("\n=== Testing TimeContext ===")

    ctx = TimeContext(
        target_years=["2024", "2023"],
        current_year=2025
    )

    # Test primary year
    assert ctx.get_primary_year() == "2024"
    print(f"✓ Primary year: {ctx.get_primary_year()}")

    # Test expand_window
    new_ctx = ctx.expand_window(["2022"])
    assert "2022" in new_ctx.target_years
    assert len(new_ctx.target_years) == 3
    print(f"✓ Expand window: {new_ctx.target_years}")

    # Test align_to_expected_years
    aligned = ctx.align_to_expected_years(["2023", "2022"])
    assert aligned.target_years == ["2023", "2022"]
    print(f"✓ Align to expected: {aligned.target_years}")

    print("All TimeContext tests passed!\n")


def test_time_validator():
    """Test time-aware validation"""
    print("\n=== Testing TimeValidator ===")

    validator = TimeValidator()
    time_ctx = TimeContext(
        target_years=["2024", "2023"],
        expected_years=["2023", "2024"],
        year_match_mode=YearMatchMode.PRECISE_WITH_WINDOW
    )

    # Scenario 1: Same metric, different years (should NOT be marked as mismatch)
    expected_data = {
        "营业收入": {"2023": {"value": 2934, "unit": "亿元"}},
        "矿产铜": {"2023": {"value": 101, "unit": "万吨"}}
    }
    actual_data = {
        "营业收入": {"2024": {"value": 3036, "unit": "亿元"}},
        "矿产铜": {"2024": {"value": 107, "unit": "万吨"}}
    }

    result = validator.validate(actual_data, expected_data, time_ctx)

    print(f"✓ Validation result: consistent={result.is_consistent}")
    print(f"  Auxiliary data: {result.auxiliary_data}")
    print(f"  Score adjustment: {result.score_adjustment}")

    # The 2024 data should be recorded as auxiliary data, not missing
    assert len(result.auxiliary_data) > 0
    print(f"✓ Different year data treated as auxiliary (not missing)")

    print("All TimeValidator tests passed!\n")


def test_time_scheduler_agent():
    """Test TimeSchedulerAgent"""
    print("\n=== Testing TimeSchedulerAgent ===")

    agent = TimeSchedulerAgent(current_year=2025)

    # Test parse_time_intent
    ctx = agent.parse_time_intent("紫金矿业近两年业绩分析")
    assert ctx.target_years == ["2024", "2023"]
    print(f"✓ Parse time intent: {ctx.target_years}")

    # Test time context summary
    summary = agent.generate_time_context_summary(ctx)
    print(f"✓ Time context summary:\n{summary}")

    print("All TimeSchedulerAgent tests passed!\n")


def test_time_service():
    """Test TimeService singleton"""
    print("\n=== Testing TimeService ===")

    service = TimeService()
    ctx = TimeContext(
        target_years=["2024", "2023"],
        current_year=2025
    )

    # Test initialize
    service.initialize(ctx)
    assert service.current_context == ctx
    print("✓ TimeService initialized")

    # Test expand_time_window
    new_ctx = service.expand_time_window(["2022"], reason="Need historical data")
    assert "2022" in new_ctx.target_years
    print(f"✓ Expand time window: {new_ctx.target_years}")

    # Test align_to_standard_answer_years
    aligned = service.align_to_standard_answer_years(["2023"])
    assert aligned.target_years == ["2023"]
    print(f"✓ Align to standard answer: {aligned.target_years}")

    # Test get_expansion_history
    history = service.get_expansion_history()
    assert len(history) > 0
    print(f"✓ Expansion history: {len(history)} entries")

    print("All TimeService tests passed!\n")


def test_metric_categorization():
    """Test metric categorization (core evidence vs background)"""
    print("\n=== Testing Metric Categorization ===")

    # Core evidence metrics
    assert is_core_evidence("营业收入")
    assert is_core_evidence("净利润")
    assert is_core_evidence("矿产铜")
    assert is_core_evidence("ROE")
    print("✓ Core evidence metrics identified")

    # Background metrics
    assert is_background_metric("行业规模")
    assert is_background_metric("市场占有率")
    print("✓ Background metrics identified")

    # Unknown metrics
    assert not is_core_evidence("未知指标")
    assert not is_background_metric("未知指标")
    print("✓ Unknown metrics handled correctly")

    print("All metric categorization tests passed!\n")


def test_year_alignment_scenario():
    """
    Test the exact scenario from the user's issue:
    - Standard answer: 2023年 矿产铜101万吨
    - System output: 2024年 矿产铜107万吨
    - Expected: Should NOT be marked as inaccurate
    """
    print("\n=== Testing Year Alignment Scenario ===")

    validator = TimeValidator()

    # Create time context aligned to standard answer years
    time_ctx = TimeContext(
        target_years=["2023", "2024"],
        expected_years=["2023"],
        year_match_mode=YearMatchMode.PRECISE_WITH_WINDOW
    )

    # Standard answer (2023 data)
    expected_data = {
        "矿产铜": {"2023": {"value": 101, "unit": "万吨"}},
    }

    # System output (2024 data)
    actual_data = {
        "矿产铜": {"2024": {"value": 107, "unit": "万吨"}},
    }

    result = validator.validate(actual_data, expected_data, time_ctx)

    print(f"Validation result:")
    print(f"  - is_consistent: {result.is_consistent}")
    print(f"  - year_gaps: {result.year_gaps}")
    print(f"  - auxiliary_data: {result.auxiliary_data}")
    print(f"  - score_adjustment: {result.score_adjustment}")
    print(f"  - details: {result.details}")

    # Key assertion: 2024 data should be auxiliary, not missing
    assert len(result.auxiliary_data) > 0, "2024 data should be auxiliary"
    assert "矿产铜" in result.auxiliary_data[0], "Should mention 矿产铜"

    print("\n✓ Year alignment scenario handled correctly!")
    print("  - 2023 data expected and found in standard answer")
    print("  - 2024 data recognized as valid auxiliary data")
    print("  - NOT marked as inaccurate or missing\n")


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("Running Time Scheduler Component Tests")
    print("="*60)

    try:
        test_time_expression_parser()
        test_time_context()
        test_time_validator()
        test_time_scheduler_agent()
        test_time_service()
        test_metric_categorization()
        test_year_alignment_scenario()

        print("\n" + "="*60)
        print("✓ All tests passed successfully!")
        print("="*60 + "\n")

    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        raise
    except Exception as e:
        print(f"\n✗ Test error: {e}")
        raise


if __name__ == "__main__":
    run_all_tests()