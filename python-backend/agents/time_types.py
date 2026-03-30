"""
Time Types and Data Structures for Time Scheduler Agent.
Defines all time-related types used throughout the workflow.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class YearMatchMode(Enum):
    """Year matching mode for time-aware evaluation"""
    PRECISE = "precise"                        # Exact year match required
    PRECISE_WITH_WINDOW = "precise_with_window"  # Exact match + window expansion for background
    FUZZY = "fuzzy"                            # Allow nearby years


class TimeIntentType(Enum):
    """Type of time intent in user query"""
    EXPLICIT_YEAR = "explicit_year"      # User mentioned specific years (e.g., "2023年")
    RELATIVE_EXPRESSION = "relative"     # Relative time (e.g., "近两年", "去年")
    COMPARISON = "comparison"            # Comparison period (e.g., "同比", "环比")
    UNSPECIFIED = "unspecified"          # No time mentioned, use default


@dataclass
class DataPoint:
    """A single data point with time context"""
    name: str                    # Metric name (e.g., "营业收入")
    value: float                 # Numeric value
    unit: str                    # Unit (e.g., "亿元", "%", "万吨")
    year: Optional[str] = None   # Year of the data
    quarter: Optional[str] = None  # Quarter if applicable
    source: Optional[str] = None   # Source file or reference
    confidence: float = 1.0       # Extraction confidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'value': self.value,
            'unit': self.unit,
            'year': self.year,
            'quarter': self.quarter,
            'source': self.source,
            'confidence': self.confidence
        }

    def __repr__(self) -> str:
        year_str = f"[{self.year}]" if self.year else ""
        return f"{self.name}{year_str}: {self.value}{self.unit}"


@dataclass
class TimeContext:
    """
    Time context that flows through the entire workflow.

    This is the core data structure that ensures all agents
    have a consistent understanding of time.
    """
    # User intent time
    user_mentioned_years: List[str] = field(default_factory=list)
    relative_time_expr: Optional[str] = None   # e.g., "近两年", "去年"
    time_intent_type: TimeIntentType = TimeIntentType.UNSPECIFIED

    # Parsed time range (dynamically calculated)
    target_years: List[str] = field(default_factory=list)     # Years to query
    comparison_years: List[str] = field(default_factory=list)  # Years for comparison

    # Year matching configuration
    year_match_mode: YearMatchMode = YearMatchMode.PRECISE_WITH_WINDOW
    window_size: int = 1  # ± years for window expansion

    # Time metadata
    current_year: int = field(default_factory=lambda: datetime.now().year)
    fiscal_year_end: Optional[str] = None    # e.g., "12-31"
    data_vintage: Optional[str] = None       # When data was last updated

    # Expected alignment (for evaluation)
    expected_years: List[str] = field(default_factory=list)  # From standard answer

    def get_primary_year(self) -> str:
        """Get the primary (most recent) year for queries"""
        if self.target_years:
            return self.target_years[0]
        return str(self.current_year - 1)

    def get_all_years(self) -> List[str]:
        """Get all years (target + comparison)"""
        all_years = list(set(self.target_years + self.comparison_years))
        return sorted(all_years, reverse=True)

    def expand_window(self, additional_years: List[str]) -> 'TimeContext':
        """Expand time window with additional years (returns new instance)"""
        new_years = list(set(self.target_years + additional_years))
        return TimeContext(
            user_mentioned_years=self.user_mentioned_years.copy(),
            relative_time_expr=self.relative_time_expr,
            time_intent_type=self.time_intent_type,
            target_years=sorted(new_years, reverse=True),
            comparison_years=self.comparison_years.copy(),
            year_match_mode=self.year_match_mode,
            window_size=self.window_size,
            current_year=self.current_year,
            fiscal_year_end=self.fiscal_year_end,
            data_vintage=self.data_vintage,
            expected_years=self.expected_years.copy()
        )

    def align_to_expected_years(self, expected_years: List[str]) -> 'TimeContext':
        """Align to expected years for evaluation (returns new instance)"""
        return TimeContext(
            user_mentioned_years=self.user_mentioned_years.copy(),
            relative_time_expr=self.relative_time_expr,
            time_intent_type=self.time_intent_type,
            target_years=expected_years,
            comparison_years=self.comparison_years.copy(),
            year_match_mode=self.year_match_mode,
            window_size=self.window_size,
            current_year=self.current_year,
            fiscal_year_end=self.fiscal_year_end,
            data_vintage=self.data_vintage,
            expected_years=expected_years
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            'user_mentioned_years': self.user_mentioned_years,
            'relative_time_expr': self.relative_time_expr,
            'time_intent_type': self.time_intent_type.value,
            'target_years': self.target_years,
            'comparison_years': self.comparison_years,
            'year_match_mode': self.year_match_mode.value,
            'window_size': self.window_size,
            'current_year': self.current_year,
            'primary_year': self.get_primary_year(),
            'fiscal_year_end': self.fiscal_year_end,
            'data_vintage': self.data_vintage,
            'expected_years': self.expected_years
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TimeContext':
        return cls(
            user_mentioned_years=data.get('user_mentioned_years', []),
            relative_time_expr=data.get('relative_time_expr'),
            time_intent_type=TimeIntentType(data.get('time_intent_type', 'unspecified')),
            target_years=data.get('target_years', []),
            comparison_years=data.get('comparison_years', []),
            year_match_mode=YearMatchMode(data.get('year_match_mode', 'precise_with_window')),
            window_size=data.get('window_size', 1),
            current_year=data.get('current_year', datetime.now().year),
            fiscal_year_end=data.get('fiscal_year_end'),
            data_vintage=data.get('data_vintage'),
            expected_years=data.get('expected_years', [])
        )


@dataclass
class TimeValidationResult:
    """Result of time-aware validation"""
    is_consistent: bool

    # Core evidence (key financial metrics - need precise year match)
    core_evidence_match: Dict[str, bool] = field(default_factory=dict)  # {metric: matched}

    # Background material (industry trends, market - can use window)
    background_match: Dict[str, bool] = field(default_factory=dict)

    # Auxiliary data (nearby years - reference only)
    auxiliary_data: List[str] = field(default_factory=list)

    # Year gaps (missing expected data)
    year_gaps: List[str] = field(default_factory=list)

    # Detailed information
    details: List[str] = field(default_factory=list)

    # Score adjustment based on time matching
    score_adjustment: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'is_consistent': self.is_consistent,
            'core_evidence_match': self.core_evidence_match,
            'background_match': self.background_match,
            'auxiliary_data': self.auxiliary_data,
            'year_gaps': self.year_gaps,
            'details': self.details,
            'score_adjustment': self.score_adjustment
        }


# Metric categories for time-aware evaluation
CORE_EVIDENCE_METRICS = {
    # Key financial metrics - require precise year match
    '营业收入', '净利润', '归母净利润', '利润总额',
    '毛利率', 'ROE', 'ROA', '每股收益', 'EPS',
    '经营性现金流', '总资产', '净资产', '资产负债率',
    '矿产铜', '矿产金', '矿产银', '矿产锌',  # Production metrics
    '产量', '销量', '产能利用率'
}

BACKGROUND_METRICS = {
    # Industry/market context - can use window expansion
    '行业规模', '市场规模', '市场占有率', '市场份额',
    '行业增速', '行业增长率', '复合增长率',
    '竞争格局', '政策环境', '市场环境'
}

PRODUCTION_METRICS = {
    # Production-related metrics
    '矿产铜', '矿产金', '矿产银', '矿产锌', '矿产铅',
    '产量', '销量', '产能', '产能利用率'
}


def is_core_evidence(metric_name: str) -> bool:
    """Check if a metric is core evidence requiring precise year match"""
    # Direct match
    if metric_name in CORE_EVIDENCE_METRICS:
        return True
    # Partial match for combined metrics
    for core in CORE_EVIDENCE_METRICS:
        if core in metric_name or metric_name in core:
            return True
    return False


def is_background_metric(metric_name: str) -> bool:
    """Check if a metric is background material allowing window expansion"""
    if metric_name in BACKGROUND_METRICS:
        return True
    for bg in BACKGROUND_METRICS:
        if bg in metric_name or metric_name in bg:
            return True
    return False


def is_production_metric(metric_name: str) -> bool:
    """Check if a metric is production-related"""
    if metric_name in PRODUCTION_METRICS:
        return True
    for prod in PRODUCTION_METRICS:
        if prod in metric_name or metric_name in prod:
            return True
    return False