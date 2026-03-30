"""
Data Validation Layer
Validates extracted financial data to ensure accuracy and consistency.
"""

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum


class ValidationStatus(Enum):
    VALID = "valid"
    WARNING = "warning"
    INVALID = "invalid"


@dataclass
class ValidationResult:
    """Result of validating a single metric"""
    metric_name: str
    value: float
    unit: str
    year: str
    status: ValidationStatus
    message: str
    suggested_value: Optional[float] = None


class FinancialDataValidator:
    """
    Validates extracted financial data against various rules:
    1. Value range checks (is the number reasonable?)
    2. Year-over-year consistency (did it change too much?)
    3. Cross-metric consistency (does A + B = C?)
    4. Unit consistency (same metric shouldn't have wildly different units)
    """

    # Reasonable value ranges for financial metrics (in base units)
    # These are COMPANY-AGNOSTIC ranges
    VALUE_RANGES = {
        # Revenue (亿元)
        '营业收入': {'min': 0.1, 'max': 50000, 'typical': (10, 5000)},
        # Profit (亿元)
        '净利润': {'min': -1000, 'max': 5000, 'typical': (-50, 1000)},
        '利润总额': {'min': -1000, 'max': 5000, 'typical': (-50, 1000)},
        '归母净利润': {'min': -1000, 'max': 5000, 'typical': (-50, 1000)},
        # Cash flow (亿元)
        '经营性现金流': {'min': -1000, 'max': 10000, 'typical': (-100, 2000)},
        # Assets (亿元)
        '总资产': {'min': 1, 'max': 100000, 'typical': (100, 10000)},
        '净资产': {'min': 1, 'max': 50000, 'typical': (50, 5000)},
        '归母净资产': {'min': 1, 'max': 50000, 'typical': (50, 5000)},
        # Ratios (%)
        '资产负债率': {'min': 0, 'max': 100, 'typical': (20, 80)},
        '毛利率': {'min': -50, 'max': 100, 'typical': (5, 60)},
        '净利率': {'min': -50, 'max': 100, 'typical': (-10, 40)},
        'ROE': {'min': -100, 'max': 100, 'typical': (-10, 40)},
        # Per share (元)
        '每股收益': {'min': -100, 'max': 100, 'typical': (-5, 20)},
        # Production metrics (generic)
        '产量': {'min': 0, 'max': 100000, 'typical': (1, 10000)},
    }

    # Maximum reasonable YoY change (excluding special cases)
    MAX_YOY_CHANGE = {
        '营业收入': 5.0,      # 500% max YoY change
        '净利润': 20.0,      # 2000% (profits can swing wildly)
        '总资产': 2.0,       # 200% max
        '净资产': 3.0,       # 300% (can raise capital)
        '资产负债率': 0.5,   # 50% points max change
        '毛利率': 0.3,       # 30% points max change
    }

    # Cross-metric relationships
    METRIC_RELATIONSHIPS = [
        # profit should be <= revenue
        ('净利润', '<=', '营业收入', 0.5),
        # total assets >= net assets
        ('净资产', '<=', '总资产', 1.0),
        # liabilities + equity = total assets (approximately)
    ]

    def __init__(self, tolerance: float = 0.1):
        """
        Initialize validator.

        Args:
            tolerance: Tolerance for cross-validation (default 10%)
        """
        self.tolerance = tolerance
        self.validation_results: List[ValidationResult] = []

    def validate_metric(
        self,
        metric_name: str,
        value: float,
        unit: str,
        year: str,
        context: Optional[Dict[str, Any]] = None
    ) -> ValidationResult:
        """
        Validate a single metric value.

        Args:
            metric_name: Name of the metric
            value: Numeric value
            unit: Unit (亿元, 万元, %, etc.)
            year: Year of the data
            context: Additional context (e.g., previous year values)

        Returns:
            ValidationResult with status and message
        """
        # Step 1: Range check
        range_result = self._check_range(metric_name, value)
        if range_result.status == ValidationStatus.INVALID:
            return range_result

        # Step 2: Year-over-year consistency (if context available)
        if context and 'previous_value' in context:
            yoy_result = self._check_yoy_consistency(
                metric_name, value, context['previous_value']
            )
            if yoy_result.status == ValidationStatus.WARNING:
                return yoy_result

        # Step 3: Unit consistency
        unit_result = self._check_unit_consistency(metric_name, value, unit)
        if unit_result.status == ValidationStatus.INVALID:
            return unit_result

        # All checks passed
        return ValidationResult(
            metric_name=metric_name,
            value=value,
            unit=unit,
            year=year,
            status=ValidationStatus.VALID,
            message="Validation passed"
        )

    def _check_range(
        self,
        metric_name: str,
        value: float
    ) -> ValidationResult:
        """Check if value is within reasonable range"""
        if metric_name not in self.VALUE_RANGES:
            return ValidationResult(
                metric_name=metric_name,
                value=value,
                unit='',
                year='',
                status=ValidationStatus.VALID,
                message="No range defined for this metric"
            )

        range_info = self.VALUE_RANGES[metric_name]
        min_val = range_info['min']
        max_val = range_info['max']

        if value < min_val or value > max_val:
            return ValidationResult(
                metric_name=metric_name,
                value=value,
                unit='',
                year='',
                status=ValidationStatus.INVALID,
                message=f"Value {value} outside valid range [{min_val}, {max_val}]"
            )

        # Check if within typical range (warning if not)
        typical_min, typical_max = range_info['typical']
        if value < typical_min or value > typical_max:
            return ValidationResult(
                metric_name=metric_name,
                value=value,
                unit='',
                year='',
                status=ValidationStatus.WARNING,
                message=f"Value {value} outside typical range [{typical_min}, {typical_max}]"
            )

        return ValidationResult(
            metric_name=metric_name,
            value=value,
            unit='',
            year='',
            status=ValidationStatus.VALID,
            message="Value within typical range"
        )

    def _check_yoy_consistency(
        self,
        metric_name: str,
        current_value: float,
        previous_value: float
    ) -> ValidationResult:
        """Check year-over-year change consistency"""
        if previous_value == 0:
            return ValidationResult(
                metric_name=metric_name,
                value=current_value,
                unit='',
                year='',
                status=ValidationStatus.VALID,
                message="Previous value is zero, cannot calculate YoY change"
            )

        max_change = self.MAX_YOY_CHANGE.get(metric_name, 10.0)
        change_ratio = abs(current_value - previous_value) / abs(previous_value)

        if change_ratio > max_change:
            return ValidationResult(
                metric_name=metric_name,
                value=current_value,
                unit='',
                year='',
                status=ValidationStatus.WARNING,
                message=f"YoY change {change_ratio:.1%} exceeds typical max {max_change:.1%}"
            )

        return ValidationResult(
            metric_name=metric_name,
            value=current_value,
            unit='',
            year='',
            status=ValidationStatus.VALID,
            message="YoY change within typical range"
        )

    def _check_unit_consistency(
        self,
        metric_name: str,
        value: float,
        unit: str
    ) -> ValidationResult:
        """Check if unit is appropriate for the metric"""
        # Expected units for different metric types
        EXPECTED_UNITS = {
            '营业收入': ['亿元', '万元'],
            '净利润': ['亿元', '万元'],
            '利润总额': ['亿元', '万元'],
            '经营性现金流': ['亿元', '万元'],
            '总资产': ['亿元', '万元'],
            '净资产': ['亿元', '万元'],
            '资产负债率': ['%'],
            '毛利率': ['%'],
            'ROE': ['%'],
            '每股收益': ['元'],
        }

        if metric_name not in EXPECTED_UNITS:
            return ValidationResult(
                metric_name=metric_name,
                value=value,
                unit=unit,
                year='',
                status=ValidationStatus.VALID,
                message="No expected unit defined"
            )

        expected = EXPECTED_UNITS[metric_name]
        if unit not in expected:
            return ValidationResult(
                metric_name=metric_name,
                value=value,
                unit=unit,
                year='',
                status=ValidationStatus.INVALID,
                message=f"Unit '{unit}' not expected for {metric_name}. Expected: {expected}"
            )

        return ValidationResult(
            metric_name=metric_name,
            value=value,
            unit=unit,
            year='',
            status=ValidationStatus.VALID,
            message="Unit is appropriate"
        )

    def validate_cross_metrics(
        self,
        metrics: Dict[str, Dict[str, float]]
    ) -> List[Tuple[str, str, str]]:
        """
        Validate cross-metric relationships.

        Args:
            metrics: Dict of {metric_name: {year: value}}

        Returns:
            List of (metric1, metric2, message) for any inconsistencies
        """
        inconsistencies = []

        # Check: profit <= revenue (within tolerance)
        if '净利润' in metrics and '营业收入' in metrics:
            for year in metrics['净利润']:
                if year in metrics['营业收入']:
                    profit = metrics['净利润'][year]
                    revenue = metrics['营业收入'][year]
                    if profit > revenue * 1.1:  # Allow 10% tolerance
                        inconsistencies.append((
                            '净利润', '营业收入',
                            f"Profit ({profit}) > Revenue ({revenue}) in {year}"
                        ))

        # Check: net assets <= total assets
        if '净资产' in metrics and '总资产' in metrics:
            for year in metrics['净资产']:
                if year in metrics['总资产']:
                    net_assets = metrics['净资产'][year]
                    total_assets = metrics['总资产'][year]
                    if net_assets > total_assets * 1.05:  # Allow 5% tolerance
                        inconsistencies.append((
                            '净资产', '总资产',
                            f"Net assets ({net_assets}) > Total assets ({total_assets}) in {year}"
                        ))

        return inconsistencies


def validate_extracted_data(
    metrics: Dict[str, Any],
    year: str = "2024"
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Validate extracted metrics and return cleaned data with warnings.

    Args:
        metrics: Dictionary of extracted metrics
        year: Year of the data

    Returns:
        Tuple of (cleaned_metrics, warnings)
    """
    validator = FinancialDataValidator()
    cleaned = {}
    warnings = []

    for name, data in metrics.items():
        if isinstance(data, dict):
            value = data.get('value', 0)
            unit = data.get('unit', '')
        else:
            value = data
            unit = ''

        result = validator.validate_metric(name, value, unit, year)

        if result.status == ValidationStatus.INVALID:
            warnings.append(f"[INVALID] {name}: {result.message}")
            continue
        elif result.status == ValidationStatus.WARNING:
            warnings.append(f"[WARNING] {name}: {result.message}")

        cleaned[name] = data

    return cleaned, warnings