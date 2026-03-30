"""
Time Scheduler Agent - Front-End Time Coordination Agent.

Acts as the first layer in the workflow to:
1. Parse time intent from user query
2. Create and inject TimeContext
3. Coordinate time across all downstream agents
"""

import re
from datetime import datetime
from typing import Dict, Any, List, Optional

from .time_types import (
    TimeContext,
    TimeIntentType,
    YearMatchMode,
    TimeValidationResult,
    DataPoint
)
from .time_parser import TimeExpressionParser
from .time_validator import TimeValidator
from .time_service import time_service


class TimeSchedulerAgent:
    """
    Time Scheduler Agent - First Layer in Workflow.

    Architecture Position:
    ┌─────────────────────────────────────────────────────────┐
    │  User Query → TimeSchedulerAgent (Front Entry Point)    │
    │                    ↓                                    │
    │              TimeContext Injection                       │
    │                    ↓                                    │
    │  Agent0 → ParallelScheduler → Executors → AgentFinal    │
    └─────────────────────────────────────────────────────────┘

    Responsibilities:
    1. Time Intent Understanding: Parse user's time expressions
    2. Time Context Injection: Provide unified time understanding
    3. Data Time Coordination: Ensure time alignment across sources
    4. Evaluation Time Validation: Enable time-aware evaluation
    """

    def __init__(self, current_year: Optional[int] = None):
        """
        Initialize Time Scheduler Agent.

        Args:
            current_year: Override current year (for testing)
        """
        self.time_parser = TimeExpressionParser(current_year)
        self.time_validator = TimeValidator()
        self.current_year = current_year or datetime.now().year

    def parse_time_intent(self, query: str) -> TimeContext:
        """
        Parse time intent from user query.

        This is the main entry point for time understanding.

        Args:
            query: User query string

        Returns:
            TimeContext with parsed time information
        """
        print(f"[TimeScheduler] Parsing time intent: {query[:50]}...")

        time_ctx = self.time_parser.parse(query)

        print(f"[TimeScheduler] Parsed: intent={time_ctx.time_intent_type.value}, "
              f"target_years={time_ctx.target_years}, "
              f"primary_year={time_ctx.get_primary_year()}")

        return time_ctx

    def inject_time_context(
        self,
        workflow_context: Dict[str, Any],
        time_ctx: TimeContext
    ) -> Dict[str, Any]:
        """
        Inject time context into workflow context.

        Args:
            workflow_context: Existing workflow context
            time_ctx: Parsed time context

        Returns:
            Updated workflow context with time information
        """
        workflow_context['time_context'] = time_ctx

        # Also initialize the global time service
        time_service.initialize(time_ctx)

        print(f"[TimeScheduler] Injected time context into workflow")

        return workflow_context

    def align_data_years(
        self,
        data_points: List[DataPoint],
        time_ctx: TimeContext
    ) -> List[DataPoint]:
        """
        Align data points to target years.

        Ensures all data points have year information and are
        sorted by relevance to the query's time context.

        Args:
            data_points: Extracted data points
            time_ctx: Time context with target years

        Returns:
            Aligned and sorted data points
        """
        aligned = []
        target_years_set = set(time_ctx.target_years)

        for dp in data_points:
            # Resolve year if missing
            if not dp.year:
                dp.year = time_ctx.get_primary_year()

            # Check if in target years
            if dp.year in target_years_set:
                aligned.append(dp)
            else:
                # Check if within window
                try:
                    year_int = int(dp.year)
                    for target_year in time_ctx.target_years:
                        if abs(year_int - int(target_year)) <= time_ctx.window_size:
                            aligned.append(dp)
                            break
                except ValueError:
                    # Invalid year, include anyway
                    aligned.append(dp)

        # Sort by year relevance (target years first, then by recency)
        def sort_key(dp):
            if dp.year in time_ctx.target_years:
                return (0, -int(dp.year) if dp.year else 0)
            return (1, -int(dp.year) if dp.year else 0)

        aligned.sort(key=sort_key)

        return aligned

    def validate_time_consistency(
        self,
        actual_output: str,
        expected_output: str,
        time_ctx: TimeContext
    ) -> TimeValidationResult:
        """
        Validate time consistency between output and expected.

        This is used during evaluation to ensure time-aware scoring.

        Args:
            actual_output: System output
            expected_output: Standard answer
            time_ctx: Time context

        Returns:
            TimeValidationResult with detailed matching info
        """
        # Extract years from expected output
        expected_years = self._extract_years_from_text(expected_output)

        # Align time context to expected years for evaluation
        if expected_years:
            aligned_ctx = time_ctx.align_to_expected_years(expected_years)
            time_service.align_to_standard_answer_years(expected_years)
        else:
            aligned_ctx = time_ctx

        # Extract data from both
        actual_data = self._extract_data_from_output(actual_output)
        expected_data = self._extract_data_from_output(expected_output)

        # Perform time-aware validation
        result = self.time_validator.validate(actual_data, expected_data, aligned_ctx)

        print(f"[TimeScheduler] Validation result: consistent={result.is_consistent}, "
              f"adjustment={result.score_adjustment:.2f}")

        return result

    def get_comparison_year_pairs(
        self,
        time_ctx: TimeContext
    ) -> List[tuple]:
        """
        Get year pairs for comparison analysis.

        Returns:
            List of (year1, year2) tuples for comparison
        """
        years = time_ctx.target_years
        pairs = []

        sorted_years = sorted(years)
        for i in range(1, len(sorted_years)):
            pairs.append((sorted_years[i - 1], sorted_years[i]))

        return pairs

    def generate_time_context_summary(self, time_ctx: TimeContext) -> str:
        """
        Generate a human-readable summary of time context.

        Useful for injecting into prompts.
        """
        parts = []

        if time_ctx.relative_time_expr:
            parts.append(f"时间范围: {time_ctx.relative_time_expr}")

        parts.append(f"目标年份: {', '.join(time_ctx.target_years)}年")
        parts.append(f"主要年份: {time_ctx.get_primary_year()}年")

        if time_ctx.comparison_years:
            parts.append(f"对比年份: {', '.join(time_ctx.comparison_years)}年")

        return "\n".join(parts)

    def _extract_years_from_text(self, text: str) -> List[str]:
        """Extract years from text"""
        years = re.findall(r'(20\d{2})\s*年?', text)
        return sorted(set(years), reverse=True)

    def _extract_data_from_output(self, text: str) -> Dict[str, Dict[str, Any]]:
        """
        Extract structured data from output text.

        Returns:
            Dict of {metric_name: {year: {value, unit}}}
        """
        result = {}
        current_year = None

        lines = text.split('\n')

        for line in lines:
            # Detect year
            year_match = re.search(r'(20\d{2})\s*年', line)
            if year_match:
                current_year = year_match.group(1)

            # Extract metric-value pairs
            # Pattern: "营业收入：1234亿元" or "营业收入 1234亿元"
            metric_pattern = r'([^\s：:\d]{2,10})\s*[：:]\s*([\d,\.]+)\s*(亿元|万元|%|万吨|吨|元)'
            for match in re.finditer(metric_pattern, line):
                metric = match.group(1).strip('* ')  # Remove markdown formatting
                value = float(match.group(2).replace(',', ''))
                unit = match.group(3)

                if metric not in result:
                    result[metric] = {}

                year = current_year or str(self.current_year - 1)
                result[metric][year] = {'value': value, 'unit': unit}

        return result


def schedule_time(query: str) -> TimeContext:
    """
    Convenience function to parse time from query.

    Args:
        query: User query string

    Returns:
        TimeContext with parsed time information
    """
    agent = TimeSchedulerAgent()
    return agent.parse_time_intent(query)


def create_time_aware_context(
    query: str,
    workflow_context: Optional[Dict[str, Any]] = None
) -> tuple:
    """
    Convenience function to create time-aware workflow context.

    Args:
        query: User query
        workflow_context: Existing context (optional)

    Returns:
        Tuple of (time_ctx, updated_workflow_context)
    """
    agent = TimeSchedulerAgent()
    time_ctx = agent.parse_time_intent(query)

    if workflow_context is None:
        workflow_context = {}

    updated_context = agent.inject_time_context(workflow_context, time_ctx)

    return time_ctx, updated_context