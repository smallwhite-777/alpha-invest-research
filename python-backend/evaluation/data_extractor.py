"""
Financial Data Extractor
Extracts structured financial data from text for comparison
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum


class DataType(Enum):
    CURRENCY = "currency"      # 金额 (亿元, 万元)
    PERCENTAGE = "percentage"  # 百分比
    RATIO = "ratio"            # 比率
    COUNT = "count"            # 计数
    YEAR = "year"              # 年份


@dataclass
class DataPoint:
    """Represents a single extracted data point"""
    name: str                  # 指标名称 (如 "营业收入", "净利润")
    value: float               # 数值
    unit: str                  # 单位 (如 "亿元", "%", "吨")
    year: Optional[str] = None # 年份
    context: str = ""          # 上下文文本
    data_type: DataType = DataType.CURRENCY
    confidence: float = 1.0    # 提取置信度

    def matches(self, other: 'DataPoint', tolerance: float = 0.05) -> bool:
        """Check if two data points match within tolerance"""
        if self.name != other.name:
            return False
        if self.unit != other.unit:
            return False

        # For percentage and ratio, use relative tolerance
        if self.data_type in [DataType.PERCENTAGE, DataType.RATIO]:
            if other.value == 0:
                return abs(self.value) < tolerance
            relative_diff = abs(self.value - other.value) / abs(other.value)
            return relative_diff <= tolerance

        # For currency, use absolute tolerance (allow 5% difference)
        if other.value == 0:
            return abs(self.value) < 1
        relative_diff = abs(self.value - other.value) / abs(other.value)
        return relative_diff <= tolerance

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'value': self.value,
            'unit': self.unit,
            'year': self.year,
            'context': self.context,
            'data_type': self.data_type.value,
            'confidence': self.confidence,
        }


class FinancialDataExtractor:
    """
    Extracts structured financial data from text
    Uses multiple regex patterns and heuristics
    """

    # Common financial metric names - GENERIC across all companies/industries
    METRIC_NAMES = {
        # 盈利指标 (Universal)
        '营业收入', '营收', '总收入', '收入', '营业总收入',
        '净利润', '归母净利润', '扣非净利润', '利润总额', '归母净利',
        '毛利润', '毛利率', '净利率', '综合毛利率',
        '营业利润', '利润总额',
        '每股收益', 'EPS', '基本每股收益',

        # 资产指标 (Universal)
        '总资产', '净资产', '归母净资产', '总负债',
        '资产负债率', '负债率',
        'ROE', 'ROA', '净资产收益率', '总资产收益率',

        # 现金流指标 (Universal)
        '经营性现金流', '经营现金流', '经营性现金流量净额',
        '投资性现金流', '筹资性现金流',
        'EBITDA', '息税折旧摊销前利润',

        # 生产指标 (Generic - specific products detected dynamically)
        '产量', '销量', '产能',

        # 估值指标 (Universal)
        'PE', 'PB', '市盈率', '市净率',
        '市值', '总市值',

        # 其他 (Universal)
        '分红', '现金分红', '股息率',
    }

    # Dynamic product pattern - matches any product name followed by production metrics
    # This allows the system to work with ANY industry, not just mining
    PRODUCT_PATTERNS = [
        # Pattern: 矿产X, X产量, X生产 (mining/metals)
        r'矿产(\w+)',
        r'(\w+)产量',
        r'(\w+)生产',
        # Pattern: X销量 (any industry)
        r'(\w+)销量',
        # Pattern: X产能 (any industry)
        r'(\w+)产能',
    ]

    # Unit mappings
    UNIT_MAP = {
        '亿元': 1.0,
        '万元': 0.0001,  # Convert to 亿元
        '元': 0.00000001,
        '%': 1.0,
        '吨': 1.0,
        '万吨': 10000.0,
        '百万': 100.0,
    }

    # Regex patterns for data extraction
    PATTERNS = [
        # Pattern 1: 指标名称: 数值 单位 (e.g., "营业收入: 2,934亿元")
        re.compile(
            r'(营业收入|净利润|毛利润|总资产|净资产|归母净资产|归母净利润|'
            r'利润总额|每股收益|ROE|毛利率|净利率|资产负债率|经营性现金流|'
            r'EBITDA|矿产铜|矿产金|矿产锌|矿产银|市值|PE|PB|分红)'
            r'[：:]\s*([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?',
            re.IGNORECASE
        ),

        # Pattern 1b: Arrow format with year context (e.g., "矿产铜：101万吨 → 107万吨")
        # This extracts BOTH values, treating first as 2023 and second as 2024
        re.compile(
            r'(矿产铜|矿产金|矿产锌|矿产银)[：:]\s*'
            r'([\d,]+\.?\d*)\s*(万吨|吨)\s*→\s*'
            r'([\d,]+\.?\d*)\s*(万吨|吨)',
            re.IGNORECASE
        ),

        # Pattern 2: 数值 单位 指标名称 (e.g., "2,934亿元 营业收入")
        re.compile(
            r'([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)\s*'
            r'(营业收入|净利润|毛利润|总资产|净资产|归母净利润|利润总额)',
            re.IGNORECASE
        ),

        # Pattern 3: Year-specific data (e.g., "2024年营业收入2,934亿元")
        re.compile(
            r'(\d{4})年\s*(营业收入|净利润|毛利润|总资产|净资产|归母净利润|'
            r'利润总额|每股收益|ROE|毛利率|净利率|资产负债率|经营性现金流|EBITDA)'
            r'[：:]?\s*([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?',
            re.IGNORECASE
        ),

        # Pattern 4: Comparison format (e.g., "营业收入 2,934亿元 → 3,036亿元")
        re.compile(
            r'(营业收入|净利润|毛利润|总资产|净资产|归母净利润|利润总额)'
            r'[：:]?\s*([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?\s*→\s*([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?',
            re.IGNORECASE
        ),

        # Pattern 5: Table row format (e.g., "营业收入\t2,934亿元\t3,036亿元")
        re.compile(
            r'(营业收入|净利润|毛利润|总资产|净资产|归母净利润|利润总额|'
            r'每股收益|ROE|毛利率|净利率|资产负债率|经营性现金流|EBITDA)'
            r'[\t\s]+([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?'
            r'[\t\s]+([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?',
            re.IGNORECASE
        ),

        # Pattern 5b: Markdown table format (e.g., "| **矿产铜** | 101万吨 | **107万吨** |")
        re.compile(
            r'\|\s*\*{0,2}(营业收入|净利润|毛利润|总资产|净资产|归母净利润|利润总额|'
            r'每股收益|ROE|毛利率|净利率|资产负债率|经营性现金流|EBITDA|'
            r'矿产铜|矿产金|矿产锌|矿产银|市值|PE|PB|分红)\*{0,2}\s*\|'
            r'[\s\*]*([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?[\s\|]*'
            r'[\s\*]*([\d,]+\.?\d*)?\s*(亿元|万元|%|吨|万吨)?',
            re.IGNORECASE
        ),

        # Pattern 6: Percentage changes (e.g., "+3.49%", "↑4.46pct")
        re.compile(
            r'([↑↓+-])?\s*([\d,]+\.?\d*)\s*(%|pct|百分点)',
            re.IGNORECASE
        ),

        # Pattern 7: Year label with value (e.g., "2023年\t2,934亿元")
        re.compile(
            r'(\d{4})年[\t\s]+([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)',
            re.IGNORECASE
        ),
    ]

    def extract(self, text: str) -> List[DataPoint]:
        """
        Extract all financial data points from text

        Args:
            text: Input text containing financial data

        Returns:
            List of extracted DataPoint objects
        """
        data_points = []
        seen = set()  # Track duplicates

        for i, pattern in enumerate(self.PATTERNS):
            matches = pattern.finditer(text)
            for match in matches:
                # Special handling for arrow format (Pattern 1b) - extract both years
                if i == 1:  # Pattern 1b: arrow format
                    dp1, dp2 = self._parse_arrow_match(match, text)
                    if dp1:
                        key = (dp1.name, dp1.value, dp1.unit, dp1.year)
                        if key not in seen:
                            seen.add(key)
                            data_points.append(dp1)
                    if dp2:
                        key = (dp2.name, dp2.value, dp2.unit, dp2.year)
                        if key not in seen:
                            seen.add(key)
                            data_points.append(dp2)
                else:
                    dp = self._parse_match(match, text)
                    if dp:
                        # Create unique key for deduplication
                        key = (dp.name, dp.value, dp.unit, dp.year)
                        if key not in seen:
                            seen.add(key)
                            data_points.append(dp)

        return data_points

    def _parse_arrow_match(self, match: re.Match, text: str) -> Tuple[Optional[DataPoint], Optional[DataPoint]]:
        """Parse arrow format match (e.g., '矿产铜：101万吨 → 107万吨')"""
        groups = match.groups()
        if len(groups) >= 5:
            name = groups[0]
            value1 = float(groups[1].replace(',', ''))
            unit = groups[2]
            value2 = float(groups[3].replace(',', ''))

            # First value is 2023, second is 2024
            dp1 = DataPoint(
                name=name,
                value=value1,
                unit=unit,
                year='2023',
                context=text[max(0, match.start()-20):match.end()+20],
                data_type=DataType.COUNT,
            )
            dp2 = DataPoint(
                name=name,
                value=value2,
                unit=unit,
                year='2024',
                context=text[max(0, match.start()-20):match.end()+20],
                data_type=DataType.COUNT,
            )
            return dp1, dp2
        return None, None

    def _parse_match(self, match: re.Match, text: str) -> Optional[DataPoint]:
        """Parse a regex match into a DataPoint"""
        groups = match.groups()

        # Handle different pattern types
        if len(groups) >= 3:
            # Pattern 1: name, value, unit
            if isinstance(groups[0], str) and groups[0] in self.METRIC_NAMES:
                name = groups[0]
                value_str = groups[1].replace(',', '')
                unit = groups[2] or self._infer_unit(name)
                year = self._extract_year_from_context(text, match.start())

                # For markdown table format with 2 values (2023 and 2024)
                # Pattern 5b: name, value1, unit1, value2, unit2
                if len(groups) >= 5 and groups[3]:
                    value_str = groups[3].replace(',', '')  # Use 2024 value (second column)
                    unit = groups[4] or unit or self._infer_unit(name)
                    year = '2024'

            # Pattern 3: year, name, value, unit
            elif groups[0] and groups[0].isdigit() and len(groups[0]) == 4:
                year = groups[0]
                name = groups[1]
                value_str = groups[2].replace(',', '')
                unit = groups[3] if len(groups) > 3 else self._infer_unit(name)

            # Pattern 6: percentage change
            elif groups[1] and groups[2] in ['%', 'pct', '百分点']:
                direction = groups[0] or ''
                value_str = groups[1].replace(',', '')
                unit = '%'
                name = '变化幅度'
                year = None

            else:
                return None

            try:
                value = float(value_str)
            except ValueError:
                return None

            # Determine data type
            data_type = self._determine_data_type(unit)

            # Get context
            start = max(0, match.start() - 20)
            end = min(len(text), match.end() + 20)
            context = text[start:end]

            return DataPoint(
                name=name,
                value=value,
                unit=unit,
                year=year,
                context=context,
                data_type=data_type,
            )

        return None

    def _infer_unit(self, metric_name: str) -> str:
        """Infer unit from metric name"""
        if metric_name in ['毛利率', '净利率', '资产负债率', 'ROE', 'ROA']:
            return '%'
        elif metric_name in ['每股收益', 'EPS']:
            return '元'
        elif metric_name in ['矿产铜', '矿产金', '矿产锌', '矿产银']:
            return '吨'
        else:
            return '亿元'

    def _determine_data_type(self, unit: str) -> DataType:
        """Determine data type from unit"""
        if unit == '%':
            return DataType.PERCENTAGE
        elif unit in ['吨', '万吨']:
            return DataType.COUNT
        elif unit == '元':
            return DataType.RATIO
        else:
            return DataType.CURRENCY

    def _extract_year_from_context(self, text: str, position: int) -> Optional[str]:
        """Extract year from surrounding context"""
        # Look for year in 100 chars before the match
        context_start = max(0, position - 100)
        context = text[context_start:position]

        year_match = re.search(r'(\d{4})年', context)
        if year_match:
            return year_match.group(1)

        return None

    def extract_table_data(self, text: str) -> Dict[str, Dict[str, Any]]:
        """
        Extract data in table format (metric -> {year -> value})

        Returns:
            Dict mapping metric names to year-value pairs
        """
        result = {}
        lines = text.split('\n')

        for line in lines:
            # Check if line contains metric name
            for metric in self.METRIC_NAMES:
                if metric in line:
                    # Extract all numbers from the line
                    numbers = re.findall(r'([\d,]+\.?\d*)\s*(亿元|万元|%|吨|万吨)?', line)
                    years = re.findall(r'(\d{4})年?', line)

                    if metric not in result:
                        result[metric] = {}

                    for i, (num, unit) in enumerate(numbers):
                        try:
                            value = float(num.replace(',', ''))
                            year = years[i] if i < len(years) else None
                            result[metric][year or f'col_{i}'] = {
                                'value': value,
                                'unit': unit or self._infer_unit(metric),
                            }
                        except ValueError:
                            continue

        return result

    def compare_data_sets(
        self,
        expected: List[DataPoint],
        actual: List[DataPoint],
        tolerance: float = 0.05
    ) -> Tuple[List[DataPoint], List[DataPoint], List[Tuple[DataPoint, DataPoint]]]:
        """
        Compare two sets of data points

        Returns:
            Tuple of (missing, extra, mismatched)
        """
        expected_dict = {dp.name: dp for dp in expected}
        actual_dict = {dp.name: dp for dp in actual}

        missing = []
        extra = []
        mismatched = []

        # Find missing and mismatched
        for name, exp_dp in expected_dict.items():
            if name not in actual_dict:
                missing.append(exp_dp)
            else:
                act_dp = actual_dict[name]
                if not exp_dp.matches(act_dp, tolerance):
                    mismatched.append((exp_dp, act_dp))

        # Find extra
        for name, act_dp in actual_dict.items():
            if name not in expected_dict:
                extra.append(act_dp)

        return missing, extra, mismatched


# Convenience function
def extract_financial_data(text: str) -> List[Dict[str, Any]]:
    """Extract financial data as list of dicts"""
    extractor = FinancialDataExtractor()
    return [dp.to_dict() for dp in extractor.extract(text)]