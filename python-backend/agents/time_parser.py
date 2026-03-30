"""
Time Expression Parser
Parses time expressions from user queries with dynamic time calculation.
"""

import re
from datetime import datetime
from typing import List, Optional, Tuple

from .time_types import (
    TimeContext,
    TimeIntentType,
    YearMatchMode
)


class TimeExpressionParser:
    """
    Parses time expressions from user queries.

    Key features:
    - Dynamic time calculation (not hardcoded years)
    - Supports relative expressions (近两年, 去年, etc.)
    - Supports explicit year ranges (2022-2024年)
    - Handles fiscal year concepts
    """

    # Relative time expressions mapping to year calculation functions
    RELATIVE_TIME_MAP = {
        # Single year expressions
        '今年': lambda y: [str(y)],
        '本年': lambda y: [str(y)],
        '本年度': lambda y: [str(y)],

        '去年': lambda y: [str(y - 1)],
        '上年': lambda y: [str(y - 1)],
        '上年度': lambda y: [str(y - 1)],

        '前年': lambda y: [str(y - 2)],

        # Multi-year expressions
        '近两年': lambda y: [str(y - 1), str(y - 2)],
        '近三年': lambda y: [str(y - 1), str(y - 2), str(y - 3)],
        '近四年': lambda y: [str(y - i) for i in range(1, 5)],
        '近五年': lambda y: [str(y - i) for i in range(1, 6)],

        '过去两年': lambda y: [str(y - 1), str(y - 2)],
        '过去三年': lambda y: [str(y - 1), str(y - 2), str(y - 3)],
        '过去五年': lambda y: [str(y - i) for i in range(1, 6)],

        # Report period expressions
        '本期': lambda y: [str(y)],
        '上期': lambda y: [str(y - 1)],
        '同期': lambda y: [str(y - 1)],

        # Quarter expressions (return year, caller handles quarter)
        '本季度': lambda y: [str(y)],
        '上季度': lambda y: [str(y)],
        '去年同期': lambda y: [str(y - 1)],
    }

    # Comparison expressions
    COMPARISON_PATTERNS = [
        (r'同比', 'yoy'),           # Year-over-year
        (r'环比', 'qoq'),           # Quarter-over-quarter
        (r'年度对比', 'annual'),    # Annual comparison
        (r'趋势', 'trend'),         # Trend analysis
        (r'变化', 'change'),        # Change analysis
    ]

    def __init__(self, current_year: Optional[int] = None):
        """
        Initialize parser.

        Args:
            current_year: Override current year (for testing)
        """
        self.current_year = current_year or datetime.now().year

    def parse(self, query: str) -> TimeContext:
        """
        Parse time expression from query.

        Args:
            query: User query string

        Returns:
            TimeContext with parsed time information
        """
        ctx = TimeContext(current_year=self.current_year)

        # Step 1: Extract explicit years
        explicit_years = self._extract_explicit_years(query)

        if explicit_years:
            ctx.user_mentioned_years = explicit_years
            ctx.target_years = sorted(explicit_years, reverse=True)
            ctx.time_intent_type = TimeIntentType.EXPLICIT_YEAR
            return ctx

        # Step 2: Parse relative time expressions
        relative_result = self._parse_relative_expression(query)

        if relative_result:
            expr, years = relative_result
            ctx.relative_time_expr = expr
            ctx.target_years = years
            ctx.time_intent_type = TimeIntentType.RELATIVE_EXPRESSION
            return ctx

        # Step 3: Check for comparison expressions
        for pattern, comp_type in self.COMPARISON_PATTERNS:
            if re.search(pattern, query):
                ctx.time_intent_type = TimeIntentType.COMPARISON
                # Default to last two years for comparison
                ctx.target_years = [str(self.current_year - 1), str(self.current_year - 2)]
                ctx.comparison_years = [str(self.current_year - 2)]
                return ctx

        # Step 4: Default - use last two years
        ctx.target_years = [str(self.current_year - 1), str(self.current_year - 2)]
        ctx.time_intent_type = TimeIntentType.UNSPECIFIED

        return ctx

    def _extract_explicit_years(self, text: str) -> List[str]:
        """
        Extract explicit year mentions from text.

        Handles:
        - Single year: "2023年"
        - Year range: "2022-2024年", "2022至2024年"
        - Multiple years: "2022年、2023年、2024年"
        """
        years = set()

        # Pattern 1: Year range (2022-2024年, 2022至2024年)
        range_pattern = r'(20\d{2})\s*[-至到~]\s*(20\d{2})\s*年?'
        for match in re.finditer(range_pattern, text):
            start_year = int(match.group(1))
            end_year = int(match.group(2))
            for y in range(min(start_year, end_year), max(start_year, end_year) + 1):
                years.add(str(y))

        # Pattern 2: Single years (2023年, 2023)
        single_pattern = r'(20\d{2})\s*年?'
        for match in re.finditer(single_pattern, text):
            year = match.group(1)
            # Avoid duplicates from range matches
            if not any(year in y for y in years):
                years.add(year)

        # Filter: Only include years from 2000 to current year + 1
        valid_years = [
            y for y in years
            if 2000 <= int(y) <= self.current_year + 1
        ]

        return sorted(valid_years, reverse=True)

    def _parse_relative_expression(self, text: str) -> Optional[Tuple[str, List[str]]]:
        """
        Parse relative time expressions.

        Returns:
            Tuple of (expression, years) or None if not found
        """
        # Sort by length (longest first) to match more specific expressions first
        sorted_expressions = sorted(
            self.RELATIVE_TIME_MAP.keys(),
            key=len,
            reverse=True
        )

        for expr in sorted_expressions:
            if expr in text:
                years = self.RELATIVE_TIME_MAP[expr](self.current_year)
                return (expr, years)

        return None

    def normalize_year(self, year_str: str) -> str:
        """
        Normalize year string to 4-digit format.

        Examples:
            "23" -> "2023"
            "23年" -> "2023"
            "2023" -> "2023"
        """
        # Remove non-digits
        digits = re.sub(r'[^0-9]', '', year_str)

        if len(digits) == 2:
            # Convert 2-digit to 4-digit
            year = int(digits)
            if year <= 30:
                return f"20{digits}"
            else:
                return f"19{digits}"
        elif len(digits) == 4:
            return digits

        return year_str

    def get_year_comparison_pairs(
        self,
        target_years: List[str]
    ) -> List[Tuple[str, str]]:
        """
        Generate year comparison pairs for YoY analysis.

        Args:
            target_years: List of years to compare

        Returns:
            List of (current_year, previous_year) pairs
        """
        pairs = []
        sorted_years = sorted(target_years)

        for i in range(1, len(sorted_years)):
            pairs.append((sorted_years[i], sorted_years[i - 1]))

        return pairs

    def infer_year_from_context(
        self,
        text: str,
        surrounding_text: str = "",
        default_year: Optional[str] = None
    ) -> Optional[str]:
        """
        Infer year from context when not explicitly stated.

        Strategies:
        1. Check the data point itself
        2. Check surrounding text
        3. Use default year
        """
        # Check text first
        years = self._extract_explicit_years(text)
        if years:
            return years[0]

        # Check surrounding context
        if surrounding_text:
            years = self._extract_explicit_years(surrounding_text)
            if years:
                return years[0]

        # Use default
        return default_year


class TimeExpressionResolver:
    """
    Resolves time expressions in generated output.
    Ensures consistent year formatting throughout the response.
    """

    # Common year format patterns
    YEAR_FORMATS = [
        (r'(\d{4})年', r'\1年'),           # 2023年 -> 2023年
        (r'(\d{4})年度', r'\1年度'),       # 2023年度 -> 2023年度
        (r'(\d{2})年', lambda m: f"20{m.group(1)}年"),  # 23年 -> 2023年
    ]

    def __init__(self, target_years: List[str]):
        self.target_years = target_years

    def normalize_years_in_text(self, text: str) -> str:
        """Normalize all year references in text to 4-digit format"""
        result = text

        # Convert 2-digit years to 4-digit
        def replace_2digit(match):
            year = int(match.group(1))
            if year <= 30:
                return f"20{match.group(1)}年"
            return f"19{match.group(1)}年"

        result = re.sub(r'(\d{2})年', replace_2digit, result)

        return result

    def validate_year_in_context(
        self,
        year: str,
        time_ctx: TimeContext
    ) -> bool:
        """
        Validate if a year is within the expected range.

        Args:
            year: Year to validate
            time_ctx: Time context with target years

        Returns:
            True if year is valid, False otherwise
        """
        try:
            year_int = int(year)
            target_ints = [int(y) for y in time_ctx.target_years]

            # Check if year is in target years
            if year in time_ctx.target_years:
                return True

            # Check if within window
            if time_ctx.year_match_mode == YearMatchMode.PRECISE_WITH_WINDOW:
                for target in target_ints:
                    if abs(year_int - target) <= time_ctx.window_size:
                        return True

            return False
        except ValueError:
            return False