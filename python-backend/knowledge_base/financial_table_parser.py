"""
Financial Table Parser
Extracts structured financial data tables from annual report text files.
Works for ANY company, not just specific ones.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path


@dataclass
class FinancialMetric:
    """Represents a single financial metric with year-over-year data"""
    name: str
    values: Dict[str, Any]  # {year: value}
    unit: str
    confidence: float = 1.0
    source_line: int = 0

    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'values': self.values,
            'unit': self.unit,
            'confidence': self.confidence,
            'source_line': self.source_line
        }


class FinancialTableParser:
    """
    Parses financial tables from annual report text files.
    Generic implementation that works for any company/industry.
    """

    # Universal financial metric patterns (company-agnostic)
    METRIC_PATTERNS = {
        # Revenue metrics
        '营业收入': [
            r'营业收入[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'营业总收入[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'营收[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'收入[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
        ],
        # Profit metrics
        '净利润': [
            r'净利润[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'归母净利润[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'净利[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
        ],
        '利润总额': [
            r'利润总额[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
        ],
        # Cash flow metrics
        '经营性现金流': [
            r'经营[性]?现金流[量]?[净额]*[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'经营活动[产生]?的现金流[量]?[净额]*[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'经营活动现金流[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
        ],
        # Asset metrics
        '总资产': [
            r'总资产[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'资产总计[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'资产总额[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
        ],
        '净资产': [
            r'净资产[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'股东权益[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'归母净资产[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
            r'所有者权益[：:\s]*([\d,]+\.?\d*)\s*(亿元|万元)',
        ],
        # Ratio metrics
        '资产负债率': [
            r'资产负债率[：:\s]*([\d,]+\.?\d*)\s*%',
            r'负债率[：:\s]*([\d,]+\.?\d*)\s*%',
        ],
        '毛利率': [
            r'毛利率[：:\s]*([\d,]+\.?\d*)\s*%',
            r'综合毛利率[：:\s]*([\d,]+\.?\d*)\s*%',
            r'销售毛利率[：:\s]*([\d,]+\.?\d*)\s*%',
        ],
        'ROE': [
            r'ROE[：:\s]*([\d,]+\.?\d*)\s*%',
            r'净资产收益率[：:\s]*([\d,]+\.?\d*)\s*%',
        ],
        # Per-share metrics
        '每股收益': [
            r'每股收益[：:\s]*([\d,]+\.?\d*)\s*元',
            r'基本每股收益[：:\s]*([\d,]+\.?\d*)\s*元',
            r'EPS[：:\s]*([\d,]+\.?\d*)\s*元',
        ],
    }

    # Year extraction patterns
    YEAR_PATTERNS = [
        r'(\d{4})年',
        r'(\d{4})[年度末]',
    ]

    def __init__(self):
        self.metrics: Dict[str, FinancialMetric] = {}
        self.year_context: Dict[int, List[str]] = {}  # Line number -> nearby years

    def parse_file(self, file_path: Path) -> Dict[str, FinancialMetric]:
        """
        Parse a financial report file and extract all metrics.

        Args:
            file_path: Path to the annual report text file

        Returns:
            Dictionary of metric name -> FinancialMetric
        """
        self.metrics = {}

        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
        except Exception as e:
            print(f"[FinancialTableParser] Error reading file: {e}")
            return {}

        # First pass: identify year markers
        self._identify_year_markers(lines)

        # Second pass: extract metrics with year context
        for line_num, line in enumerate(lines):
            self._extract_metrics_from_line(line, line_num, lines)

        return self.metrics

    def _identify_year_markers(self, lines: List[str]):
        """Identify lines that contain year markers for context"""
        for line_num, line in enumerate(lines):
            years = re.findall(r'(20\d{2})年', line)
            if years:
                # Store nearby years for context
                start = max(0, line_num - 20)
                end = min(len(lines), line_num + 5)
                for yr in years:
                    self.year_context[line_num] = years

    def _get_year_for_line(self, line_num: int, lines: List[str]) -> Optional[str]:
        """Get the most relevant year for a given line"""
        # Check current line first
        years = re.findall(r'(20\d{2})年?', lines[line_num])
        if years:
            return max(years)  # Return most recent year

        # Look backwards for year context (up to 50 lines)
        for i in range(max(0, line_num - 50), line_num):
            years = re.findall(r'(20\d{2})年?', lines[i])
            if years:
                return max(years)

        # Look forward for year context
        for i in range(line_num, min(len(lines), line_num + 10)):
            years = re.findall(r'(20\d{2})年?', lines[i])
            if years:
                return max(years)

        # Look for table headers with years in nearby lines
        context = ''.join(lines[max(0, line_num-30):min(len(lines), line_num+10)])
        year_matches = re.findall(r'(20\d{2})', context)
        if year_matches:
            # Prefer more recent years
            years_sorted = sorted(year_matches, reverse=True)
            if years_sorted:
                return years_sorted[0]

        return None

    def _extract_metrics_from_line(self, line: str, line_num: int, lines: List[str]):
        """Extract all metrics from a single line"""
        year = self._get_year_for_line(line_num, lines)

        for metric_name, patterns in self.METRIC_PATTERNS.items():
            for pattern in patterns:
                matches = re.finditer(pattern, line, re.IGNORECASE)
                for match in matches:
                    value_str = match.group(1).replace(',', '')
                    unit = match.group(2) if len(match.groups()) > 1 else ''

                    try:
                        value = float(value_str)
                    except ValueError:
                        continue

                    # Validate value range
                    if not self._validate_value(metric_name, value, unit):
                        continue

                    # Store metric
                    if metric_name not in self.metrics:
                        self.metrics[metric_name] = FinancialMetric(
                            name=metric_name,
                            values={},
                            unit=unit,
                            source_line=line_num
                        )

                    if year:
                        self.metrics[metric_name].values[year] = value

    def _validate_value(self, metric_name: str, value: float, unit: str) -> bool:
        """
        Validate that extracted value is within reasonable range.
        This helps filter out parsing errors.
        """
        # Define reasonable ranges for different metrics
        RANGES = {
            '营业收入': (1, 50000),      # 1-50000 亿元
            '净利润': (-1000, 5000),     # -1000-5000 亿元
            '利润总额': (-1000, 5000),
            '经营性现金流': (-1000, 10000),
            '总资产': (1, 100000),
            '净资产': (1, 50000),
            '资产负债率': (0, 100),       # 0-100%
            '毛利率': (-50, 100),         # -50-100%
            'ROE': (-50, 100),            # -50-100%
            '每股收益': (-100, 100),      # -100-100 元
        }

        if metric_name in RANGES:
            min_val, max_val = RANGES[metric_name]
            return min_val <= value <= max_val

        return True  # Allow unknown metrics

    def parse_table_section(self, lines: List[str], start_line: int, end_line: int) -> List[Dict]:
        """
        Parse a table section from the report.
        Handles markdown-style tables and tab-separated tables.
        """
        table_data = []
        table_lines = lines[start_line:end_line]

        # Detect table format
        if any('|' in line for line in table_lines):
            # Markdown table
            table_data = self._parse_markdown_table(table_lines)
        elif any('\t' in line for line in table_lines):
            # Tab-separated table
            table_data = self._parse_tab_table(table_lines)
        else:
            # Try to parse as key-value pairs
            table_data = self._parse_key_value_lines(table_lines)

        return table_data

    def _parse_markdown_table(self, lines: List[str]) -> List[Dict]:
        """Parse markdown-style table"""
        rows = []
        headers = []

        for line in lines:
            if '|' not in line:
                continue

            cells = [c.strip() for c in line.split('|') if c.strip()]

            if not headers and cells:
                headers = cells
            elif headers and cells:
                row = dict(zip(headers, cells))
                rows.append(row)

        return rows

    def _parse_tab_table(self, lines: List[str]) -> List[Dict]:
        """Parse tab-separated table"""
        rows = []
        headers = []

        for line in lines:
            if '\t' not in line:
                continue

            cells = [c.strip() for c in line.split('\t') if c.strip()]

            if not headers and cells:
                headers = cells
            elif headers and cells:
                row = dict(zip(headers, cells))
                rows.append(row)

        return rows

    def _parse_key_value_lines(self, lines: List[str]) -> List[Dict]:
        """Parse lines with key: value format"""
        rows = []

        for line in lines:
            # Match patterns like "营业收入: 1234亿元" or "营业收入 1234亿元"
            match = re.match(r'([\w\u4e00-\u9fff]+)[：:\s]+([\d,]+\.?\d*)\s*(亿元|万元|%|元)?', line)
            if match:
                rows.append({
                    'metric': match.group(1),
                    'value': match.group(2),
                    'unit': match.group(3) or ''
                })

        return rows


def parse_annual_report(file_path: Path) -> Dict[str, FinancialMetric]:
    """
    Convenience function to parse an annual report file.

    Args:
        file_path: Path to the annual report

    Returns:
        Dictionary of extracted financial metrics
    """
    parser = FinancialTableParser()
    return parser.parse_file(file_path)