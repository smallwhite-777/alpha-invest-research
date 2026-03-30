"""
Time Validator - Time-Aware Validation for Financial Data Evaluation.

Validates data points considering time dimension:
- Core evidence: Requires precise year match
- Background material: Allows window expansion
- Auxiliary data: Reference only, doesn't count toward score
"""

import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field

from .time_types import (
    TimeContext,
    TimeValidationResult,
    YearMatchMode,
    DataPoint,
    CORE_EVIDENCE_METRICS,
    BACKGROUND_METRICS,
    is_core_evidence,
    is_background_metric
)


@dataclass
class MetricMatch:
    """Result of matching a single metric"""
    metric_name: str
    expected_year: str
    expected_value: Optional[float]
    actual_year: Optional[str]
    actual_value: Optional[float]
    is_matched: bool
    match_type: str  # 'precise', 'window', 'missing', 'mismatch'
    unit: str = ""


class TimeValidator:
    """
    Time-aware validator for financial data evaluation.

    Key innovation: Different metrics have different time sensitivity
    - Core evidence (revenue, profit): Must match exact year
    - Background (market trends): Can use nearby years
    - Auxiliary: Extra years count as bonus context
    """

    # Value comparison tolerance
    VALUE_TOLERANCE = 0.05  # 5% tolerance for numeric comparison

    def __init__(
        self,
        match_mode: YearMatchMode = YearMatchMode.PRECISE_WITH_WINDOW
    ):
        self.match_mode = match_mode

    def validate(
        self,
        actual_data: Dict[str, Dict[str, Any]],
        expected_data: Dict[str, Dict[str, Any]],
        time_ctx: TimeContext
    ) -> TimeValidationResult:
        """
        Perform time-aware validation.

        Args:
            actual_data: {metric: {year: value}} from system output
            expected_data: {metric: {year: value}} from standard answer
            time_ctx: Time context with target years and match mode

        Returns:
            TimeValidationResult with detailed matching info
        """
        result = TimeValidationResult(
            is_consistent=True,
            core_evidence_match={},
            background_match={},
            auxiliary_data=[],
            year_gaps=[],
            details=[]
        )

        # Get expected years from context or derive from data
        expected_years = time_ctx.expected_years if time_ctx.expected_years else time_ctx.target_years

        # Process each expected metric
        for metric_name, expected_years_data in expected_data.items():
            is_core = is_core_evidence(metric_name)
            is_background = is_background_metric(metric_name)

            # Get actual data for this metric
            actual_years_data = actual_data.get(metric_name, {})

            # Match each expected year
            for expected_year, expected_value in expected_years_data.items():
                match_result = self._match_metric(
                    metric_name=metric_name,
                    expected_year=expected_year,
                    expected_value=expected_value,
                    actual_years_data=actual_years_data,
                    time_ctx=time_ctx
                )

                if match_result.is_matched:
                    if is_core:
                        result.core_evidence_match[metric_name] = True
                    elif is_background:
                        result.background_match[metric_name] = True

                    result.details.append(
                        f"[MATCH] {metric_name}[{match_result.actual_year}]: "
                        f"{match_result.actual_value}{match_result.unit}"
                    )
                else:
                    if match_result.match_type == 'missing':
                        result.year_gaps.append(f"{metric_name}[{expected_year}]")
                        if is_core:
                            result.core_evidence_match[metric_name] = False
                    elif match_result.match_type == 'mismatch':
                        result.details.append(
                            f"[MISMATCH] {metric_name}[{expected_year}]: "
                            f"expected {expected_value}, got {match_result.actual_value}"
                        )
                        if is_core:
                            result.core_evidence_match[metric_name] = False

            # Check for auxiliary data (extra years in actual)
            for actual_year in actual_years_data:
                if actual_year not in expected_years_data:
                    result.auxiliary_data.append(
                        f"{metric_name}[{actual_year}]: {actual_years_data[actual_year]}"
                    )

        # Calculate score adjustment
        result.score_adjustment = self._calculate_score_adjustment(result)

        # Determine overall consistency
        result.is_consistent = len(result.year_gaps) == 0

        return result

    def _match_metric(
        self,
        metric_name: str,
        expected_year: str,
        expected_value: Any,
        actual_years_data: Dict[str, Any],
        time_ctx: TimeContext
    ) -> MetricMatch:
        """
        Match a single metric value considering time.

        Matching strategy:
        1. Precise year match (ideal)
        2. Window match (acceptable for background)
        3. No match (missing)
        """
        is_core = is_core_evidence(metric_name)

        # Try precise year match first
        if expected_year in actual_years_data:
            actual_value = actual_years_data[expected_year]

            if self._values_match(expected_value, actual_value):
                return MetricMatch(
                    metric_name=metric_name,
                    expected_year=expected_year,
                    expected_value=self._extract_value(expected_value),
                    actual_year=expected_year,
                    actual_value=self._extract_value(actual_value),
                    is_matched=True,
                    match_type='precise',
                    unit=self._extract_unit(actual_value)
                )
            else:
                # Value mismatch
                return MetricMatch(
                    metric_name=metric_name,
                    expected_year=expected_year,
                    expected_value=self._extract_value(expected_value),
                    actual_year=expected_year,
                    actual_value=self._extract_value(actual_value),
                    is_matched=False,
                    match_type='mismatch',
                    unit=self._extract_unit(actual_value)
                )

        # For background metrics, try window expansion
        if not is_core and self.match_mode == YearMatchMode.PRECISE_WITH_WINDOW:
            nearby_year = self._find_nearby_year(
                expected_year,
                list(actual_years_data.keys()),
                time_ctx.window_size
            )
            if nearby_year:
                actual_value = actual_years_data[nearby_year]
                return MetricMatch(
                    metric_name=metric_name,
                    expected_year=expected_year,
                    expected_value=self._extract_value(expected_value),
                    actual_year=nearby_year,
                    actual_value=self._extract_value(actual_value),
                    is_matched=True,
                    match_type='window',
                    unit=self._extract_unit(actual_value)
                )

        # No match found
        return MetricMatch(
            metric_name=metric_name,
            expected_year=expected_year,
            expected_value=self._extract_value(expected_value),
            actual_year=None,
            actual_value=None,
            is_matched=False,
            match_type='missing',
            unit=""
        )

    def _values_match(self, expected: Any, actual: Any) -> bool:
        """Check if values match within tolerance"""
        exp_val = self._extract_value(expected)
        act_val = self._extract_value(actual)

        if exp_val is None or act_val is None:
            return False

        # Exact match
        if exp_val == act_val:
            return True

        # Relative tolerance
        if exp_val != 0:
            relative_diff = abs(act_val - exp_val) / abs(exp_val)
            return relative_diff <= self.VALUE_TOLERANCE

        # Both zero
        return act_val == 0

    def _extract_value(self, data: Any) -> Optional[float]:
        """Extract numeric value from various data formats"""
        if isinstance(data, (int, float)):
            return float(data)
        if isinstance(data, dict):
            if 'value' in data:
                return float(data['value'])
        if isinstance(data, DataPoint):
            return data.value
        if isinstance(data, str):
            # Try to parse "123.45亿元" format
            match = re.search(r'([\d,\.]+)', data)
            if match:
                try:
                    return float(match.group(1).replace(',', ''))
                except ValueError:
                    pass
        return None

    def _extract_unit(self, data: Any) -> str:
        """Extract unit from data"""
        if isinstance(data, dict):
            return data.get('unit', '')
        if isinstance(data, DataPoint):
            return data.unit
        if isinstance(data, str):
            match = re.search(r'(亿元|万元|%|万吨|吨|元)', data)
            if match:
                return match.group(1)
        return ''

    def _find_nearby_year(
        self,
        target_year: str,
        available_years: List[str],
        max_gap: int = 1
    ) -> Optional[str]:
        """Find a nearby year within the window"""
        try:
            target = int(target_year)
            for year_str in available_years:
                year = int(year_str)
                if abs(year - target) <= max_gap:
                    return year_str
        except ValueError:
            pass
        return None

    def _calculate_score_adjustment(self, result: TimeValidationResult) -> float:
        """
        Calculate score adjustment based on time validation results.

        Penalties:
        - Missing core evidence: -0.10 per metric
        - Missing background: -0.05 per metric

        Bonuses:
        - Auxiliary data: +0.02 per item (context enrichment)
        """
        adjustment = 0.0

        # Core evidence penalties
        core_misses = sum(
            1 for matched in result.core_evidence_match.values() if not matched
        )
        adjustment -= core_misses * 0.10

        # Background penalties
        bg_misses = sum(
            1 for matched in result.background_match.values() if not matched
        )
        adjustment -= bg_misses * 0.05

        # Auxiliary bonus
        adjustment += len(result.auxiliary_data) * 0.02

        # Cap adjustment
        adjustment = max(-0.30, min(0.10, adjustment))

        return adjustment

    def validate_year_consistency(
        self,
        output_years: List[str],
        expected_years: List[str]
    ) -> Tuple[bool, List[str]]:
        """
        Validate year consistency between output and expected.

        Returns:
            Tuple of (is_consistent, issues)
        """
        issues = []

        output_set = set(output_years)
        expected_set = set(expected_years)

        missing = expected_set - output_set
        if missing:
            issues.append(f"Missing years: {sorted(missing)}")

        extra = output_set - expected_set
        if extra:
            issues.append(f"Extra years: {sorted(extra)}")

        return len(issues) == 0, issues


class TimeAwareDataExtractor:
    """
    Extracts time-aware data from text for validation.
    """

    # Patterns for extracting data with year context
    DATA_PATTERNS = [
        # Year-value pattern: "2023年：1234亿元" or "2023年 1234亿元"
        re.compile(r'(20\d{2})\s*年\s*[：:]\s*([\d,\.]+)\s*(亿元|万元|%|万吨|吨|元)'),
        # Value with year: "营业收入1234亿元（2023年）"
        re.compile(r'([\d,\.]+)\s*(亿元|万元|%|万吨|吨|元)\s*[（(]\s*(20\d{2})\s*年?\s*[)）]'),
        # Arrow format: "矿产铜：101万吨 → 107万吨" (using | for alternatives instead of character class)
        re.compile(r'([^\s：:]+)\s*[：:]\s*([\d,\.]+)\s*(万吨|吨|亿元|万元)\s*(?:→|->)\s*([\d,\.]+)\s*(万吨|吨|亿元|万元)'),
    ]

    def extract_data_with_years(
        self,
        text: str,
        default_year: Optional[str] = None
    ) -> Dict[str, Dict[str, float]]:
        """
        Extract data points with year information.

        Returns:
            Dict of {metric: {year: value}}
        """
        result = {}
        current_year = default_year

        lines = text.split('\n')

        for line in lines:
            # Try to find year in line
            year_match = re.search(r'(20\d{2})\s*年', line)
            if year_match:
                current_year = year_match.group(1)

            # Extract metrics
            for pattern in self.DATA_PATTERNS:
                matches = pattern.finditer(line)
                for match in matches:
                    groups = match.groups()

                    if len(groups) >= 3:
                        # Pattern 1: year, value, unit
                        if groups[0] and groups[0].isdigit() and len(groups[0]) == 4:
                            year = groups[0]
                            value = float(groups[1].replace(',', ''))
                            # Need metric name from context
                            continue

                        # Pattern 2: value, unit, year
                        if len(groups) >= 3 and groups[2] and groups[2].isdigit():
                            value = float(groups[0].replace(',', ''))
                            year = groups[2]
                            # Need metric name from context
                            continue

        return result

    def extract_years_from_text(self, text: str) -> List[str]:
        """Extract all years mentioned in text"""
        years = re.findall(r'(20\d{2})\s*年?', text)
        return sorted(set(years), reverse=True)


def validate_time_aware(
    actual_output: str,
    expected_output: str,
    time_ctx: TimeContext
) -> TimeValidationResult:
    """
    Convenience function for time-aware validation.

    Args:
        actual_output: System output text
        expected_output: Standard answer text
        time_ctx: Time context

    Returns:
        TimeValidationResult
    """
    extractor = TimeAwareDataExtractor()
    validator = TimeValidator(time_ctx.year_match_mode)

    # Extract years from both
    expected_years = extractor.extract_years_from_text(expected_output)
    actual_years = extractor.extract_years_from_text(actual_output)

    # Align context if needed
    if expected_years and not time_ctx.expected_years:
        time_ctx = time_ctx.align_to_expected_years(expected_years)

    # Extract data (simplified - real implementation would be more thorough)
    actual_data = extractor.extract_data_with_years(actual_output)
    expected_data = extractor.extract_data_with_years(expected_output)

    return validator.validate(actual_data, expected_data, time_ctx)