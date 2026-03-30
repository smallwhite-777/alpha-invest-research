"""
Post-Processing Corrector
Automatically corrects common errors in LLM outputs based on validation warnings.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class CorrectionType(Enum):
    VALUE_RANGE = "value_range"       # Value outside typical range
    YEAR_MISMATCH = "year_mismatch"   # Data assigned to wrong year
    UNIT_ERROR = "unit_error"         # Wrong unit (e.g., 万元 instead of 亿元)
    MISSING_DATA = "missing_data"     # Required data not present
    INCONSISTENCY = "inconsistency"   # Data inconsistency (e.g., profit > revenue)


@dataclass
class Correction:
    """A correction to apply to the output"""
    type: CorrectionType
    original: str
    corrected: str
    reason: str
    confidence: float  # 0-1, how confident we are in this correction


class OutputCorrector:
    """
    Post-processes LLM outputs to correct common errors:
    1. Value range corrections (e.g., revenue should be positive)
    2. Year mismatches (e.g., 2023 data labeled as 2024)
    3. Unit conversions (e.g., 10000万元 -> 1亿元)
    4. Missing data insertion (from knowledge base)
    5. Cross-metric consistency fixes
    """

    # Known metric value ranges for validation/correction
    METRIC_RANGES = {
        '营业收入': {'min': 0.1, 'max': 50000, 'unit': '亿元'},
        '净利润': {'min': -1000, 'max': 5000, 'unit': '亿元'},
        '归母净利润': {'min': -1000, 'max': 5000, 'unit': '亿元'},
        '利润总额': {'min': -1000, 'max': 5000, 'unit': '亿元'},
        '总资产': {'min': 1, 'max': 100000, 'unit': '亿元'},
        '净资产': {'min': 1, 'max': 50000, 'unit': '亿元'},
        '经营性现金流': {'min': -1000, 'max': 10000, 'unit': '亿元'},
        '资产负债率': {'min': 0, 'max': 100, 'unit': '%'},
        '毛利率': {'min': -50, 'max': 100, 'unit': '%'},
        'ROE': {'min': -100, 'max': 100, 'unit': '%'},
        '每股收益': {'min': -100, 'max': 100, 'unit': '元'},
    }

    # Common error patterns and their corrections
    ERROR_PATTERNS = [
        # 万 -> 亿 conversion hint
        (r'(\d+)万亿元', r'\1万亿元'),  # 万亿元 is wrong, should be 万亿
        # Negative revenue is almost always wrong
        (r'营业收入[：:\s]*-?(\d+)', lambda m: f"营业收入: {m.group(1)}"),
    ]

    def __init__(self, knowledge_base_metrics: Optional[Dict[str, Any]] = None):
        """
        Initialize corrector.

        Args:
            knowledge_base_metrics: Known correct values from knowledge base
        """
        self.kb_metrics = knowledge_base_metrics or {}
        self.corrections: List[Correction] = []

    def correct(self, text: str, validation_warnings: List[str]) -> Tuple[str, List[Correction]]:
        """
        Apply corrections to the output text.

        Args:
            text: The original output text
            validation_warnings: List of validation warnings

        Returns:
            Tuple of (corrected_text, list_of_corrections)
        """
        self.corrections = []
        corrected = text

        # Process each warning
        for warning in validation_warnings:
            correction = self._process_warning(warning, corrected)
            if correction:
                corrected = self._apply_correction(corrected, correction)

        # Apply pattern-based corrections
        corrected = self._apply_pattern_corrections(corrected)

        # Apply knowledge base corrections
        corrected = self._apply_kb_corrections(corrected)

        return corrected, self.corrections

    def _process_warning(self, warning: str, text: str) -> Optional[Correction]:
        """Process a validation warning and create a correction if possible"""

        # Parse warning type
        if 'outside valid range' in warning.lower() or 'outside typical range' in warning.lower():
            return self._handle_range_warning(warning, text)
        elif 'year' in warning.lower() or '年份' in warning:
            return self._handle_year_warning(warning, text)
        elif 'unit' in warning.lower() or '单位' in warning:
            return self._handle_unit_warning(warning, text)

        return None

    def _handle_range_warning(self, warning: str, text: str) -> Optional[Correction]:
        """Handle value range warnings"""
        # Extract metric name from warning
        match = re.match(r'\[(\w+)\]\s*(\w+)', warning)
        if not match:
            return None

        status, metric_name = match.groups()

        # Check if we have a known correct value
        if metric_name in self.kb_metrics:
            correct_value = self.kb_metrics[metric_name]
            # Find and replace in text
            pattern = rf'{metric_name}[：:\s]*[\d,\.]+\s*(亿元|万元|%)?'
            replacement = f"{metric_name}: {correct_value}"

            if re.search(pattern, text):
                return Correction(
                    type=CorrectionType.VALUE_RANGE,
                    original=re.search(pattern, text).group(0),
                    corrected=replacement,
                    reason=f"Value from knowledge base: {correct_value}",
                    confidence=0.9
                )

        return None

    def _handle_year_warning(self, warning: str, text: str) -> Optional[Correction]:
        """Handle year mismatch warnings"""
        # Look for year assignments in text
        year_pattern = r'(\d{4})年[：:\s]*([^\n|]+)'

        # This is complex - would need more context to fix properly
        return None

    def _handle_unit_warning(self, warning: str, text: str) -> Optional[Correction]:
        """Handle unit errors"""
        # Common unit conversion: 万元 -> 亿元 (divide by 10000)
        wan_yi_pattern = r'(\d+)[,\d]*\s*万元'

        matches = list(re.finditer(wan_yi_pattern, text))
        for match in matches:
            value = float(match.group(1).replace(',', ''))
            if value > 10000:  # Likely should be 亿元
                converted = value / 10000
                return Correction(
                    type=CorrectionType.UNIT_ERROR,
                    original=match.group(0),
                    corrected=f"{converted:.2f}亿元",
                    reason="Large value in 万元 likely should be 亿元",
                    confidence=0.7
                )

        return None

    def _apply_correction(self, text: str, correction: Correction) -> str:
        """Apply a single correction to the text"""
        if correction.original in text:
            corrected = text.replace(correction.original, correction.corrected, 1)
            self.corrections.append(correction)
            return corrected
        return text

    def _apply_pattern_corrections(self, text: str) -> str:
        """Apply pattern-based corrections"""
        corrected = text

        for pattern, replacement in self.ERROR_PATTERNS:
            if callable(replacement):
                matches = list(re.finditer(pattern, corrected))
                for match in matches:
                    new_value = replacement(match)
                    if new_value != match.group(0):
                        correction = Correction(
                            type=CorrectionType.VALUE_RANGE,
                            original=match.group(0),
                            corrected=new_value,
                            reason="Pattern-based correction",
                            confidence=0.6
                        )
                        corrected = corrected.replace(match.group(0), new_value, 1)
                        self.corrections.append(correction)
            else:
                new_value = re.sub(pattern, replacement, corrected)
                if new_value != corrected:
                    correction = Correction(
                        type=CorrectionType.VALUE_RANGE,
                        original=corrected,
                        corrected=new_value,
                        reason="Pattern-based correction",
                        confidence=0.6
                    )
                    corrected = new_value
                    self.corrections.append(correction)

        return corrected

    def _apply_kb_corrections(self, text: str) -> str:
        """Apply corrections from knowledge base data"""
        corrected = text

        for metric_name, correct_value in self.kb_metrics.items():
            # Find mentions of this metric in text
            pattern = rf'({metric_name})[：:\s]*([\d,\.]+)\s*(亿元|万元|%)?'

            def replace_with_kb(match):
                original_value = match.group(2)
                unit = match.group(3) or ''

                # Check if values differ significantly
                try:
                    orig_num = float(original_value.replace(',', ''))
                    # Parse correct_value
                    correct_match = re.match(r'([\d,\.]+)\s*(亿元|万元|%)?', str(correct_value))
                    if correct_match:
                        correct_num = float(correct_match.group(1).replace(',', ''))
                        correct_unit = correct_match.group(2) or unit

                        # If difference > 50%, use KB value
                        if abs(orig_num - correct_num) / max(abs(correct_num), 1) > 0.5:
                            self.corrections.append(Correction(
                                type=CorrectionType.VALUE_RANGE,
                                original=match.group(0),
                                corrected=f"{metric_name}: {correct_value}",
                                reason=f"Knowledge base has more accurate value",
                                confidence=0.85
                            ))
                            return f"{metric_name}: {correct_value}"
                except:
                    pass

                return match.group(0)

            corrected = re.sub(pattern, replace_with_kb, corrected)

        return corrected

    def validate_and_correct_table(
        self,
        table_text: str,
        expected_columns: List[str]
    ) -> Tuple[str, List[str]]:
        """
        Validate and correct a markdown table.

        Args:
            table_text: The table markdown text
            expected_columns: Expected column names

        Returns:
            Tuple of (corrected_table, issues_found)
        """
        issues = []
        lines = table_text.strip().split('\n')

        if len(lines) < 2:
            issues.append("Table too short")
            return table_text, issues

        # Check header
        header = lines[0]
        for col in expected_columns:
            if col not in header:
                issues.append(f"Missing column: {col}")

        # Check for empty cells
        for i, line in enumerate(lines[2:], start=2):  # Skip header and separator
            cells = [c.strip() for c in line.split('|') if c.strip()]
            if len(cells) < len(expected_columns):
                issues.append(f"Row {i} has missing cells")

        # Check for numeric values
        for i, line in enumerate(lines[2:], start=2):
            cells = line.split('|')
            for cell in cells[1:]:  # Skip first column (metric name)
                cell = cell.strip()
                if cell and not re.match(r'[\d,\.\+\-%→↑↓pct]+', cell):
                    issues.append(f"Row {i} has non-numeric value: {cell}")

        return table_text, issues


def correct_output(
    text: str,
    validation_warnings: List[str],
    kb_metrics: Optional[Dict[str, Any]] = None
) -> Tuple[str, List[Correction]]:
    """
    Convenience function to correct output text.

    Args:
        text: The output text to correct
        validation_warnings: List of validation warnings
        kb_metrics: Known correct values from knowledge base

    Returns:
        Tuple of (corrected_text, list_of_corrections)
    """
    corrector = OutputCorrector(kb_metrics)
    return corrector.correct(text, validation_warnings)