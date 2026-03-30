"""
Similarity Evaluator
Evaluates similarity between actual and expected outputs
using multiple dimensions: data coverage, structure, semantics, and accuracy

Enhanced with time-aware evaluation to handle year differences in financial data.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple, Set
from .data_extractor import FinancialDataExtractor, DataPoint

# Import time-aware components
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from agents.time_types import TimeContext, is_core_evidence, is_background_metric
from agents.time_validator import TimeValidator
from agents.time_service import time_service


@dataclass
class EvaluationResult:
    """Result of similarity evaluation"""
    overall_score: float
    dimension_scores: Dict[str, float]
    missing_data_points: List[str]
    extra_data_points: List[str]
    inaccurate_data: List[Tuple[str, str, str]]  # (指标名, 预期值, 实际值)
    structure_diff: Dict[str, Any]
    suggestions: List[str]

    # Time-aware evaluation additions
    time_adjustment: float = 0.0
    auxiliary_data: List[str] = field(default_factory=list)
    year_gaps: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'overall_score': self.overall_score,
            'dimension_scores': self.dimension_scores,
            'missing_data_points': self.missing_data_points,
            'extra_data_points': self.extra_data_points,
            'inaccurate_data': self.inaccurate_data,
            'structure_diff': self.structure_diff,
            'suggestions': self.suggestions,
            'time_adjustment': self.time_adjustment,
            'auxiliary_data': self.auxiliary_data,
            'year_gaps': self.year_gaps,
        }


@dataclass
class SectionInfo:
    """Information about a document section"""
    title: str
    level: int
    content_length: int
    has_table: bool
    has_list: bool


class SimilarityEvaluator:
    """
    Multi-dimensional similarity evaluator

    Dimensions:
    - Data Coverage (40%): Key financial data points present
    - Structure Integrity (25%): Sections and formatting match
    - Semantic Similarity (20%): Meaning similarity (simplified)
    - Data Accuracy (15%): Numerical accuracy
    """

    # Weights for each dimension
    WEIGHTS = {
        'data_coverage': 0.40,
        'structure': 0.25,
        'semantic': 0.20,
        'accuracy': 0.15,
    }

    # Important section titles for financial analysis
    IMPORTANT_SECTIONS = [
        '核心财务数据', '财务数据', '关键指标',
        '盈利能力', '盈利分析',
        '营业收入', '净利润', '毛利率',
        '资产负债', '现金流',
        '业务结构', '收入结构',
        '关键发现', '总结', '一句话总结',
    ]

    def __init__(self, tolerance: float = 0.05):
        """
        Initialize evaluator

        Args:
            tolerance: Tolerance for numerical comparison (default 5%)
        """
        self.tolerance = tolerance
        self.data_extractor = FinancialDataExtractor()

    def evaluate(self, actual: str, expected: str) -> EvaluationResult:
        """
        Evaluate similarity between actual and expected outputs

        Args:
            actual: The actual output text
            expected: The expected (reference) output text

        Returns:
            EvaluationResult with scores and details
        """
        # Extract data points
        expected_data = self.data_extractor.extract(expected)
        actual_data = self.data_extractor.extract(actual)

        # Calculate dimension scores
        data_coverage, missing, extra = self._calculate_data_coverage(
            expected_data, actual_data
        )

        structure_score, structure_diff = self._calculate_structure_score(
            actual, expected
        )

        semantic_score = self._calculate_semantic_similarity(actual, expected)

        accuracy_score, inaccurate = self._calculate_accuracy_score(
            expected_data, actual_data
        )

        # Calculate overall score
        overall_score = (
            data_coverage * self.WEIGHTS['data_coverage'] +
            structure_score * self.WEIGHTS['structure'] +
            semantic_score * self.WEIGHTS['semantic'] +
            accuracy_score * self.WEIGHTS['accuracy']
        )

        # Generate suggestions
        suggestions = self._generate_suggestions(
            missing, extra, inaccurate, structure_diff
        )

        return EvaluationResult(
            overall_score=overall_score,
            dimension_scores={
                'data_coverage': data_coverage,
                'structure': structure_score,
                'semantic': semantic_score,
                'accuracy': accuracy_score,
            },
            missing_data_points=[f"{dp.name}: {dp.value}{dp.unit}" for dp in missing],
            extra_data_points=[f"{dp.name}: {dp.value}{dp.unit}" for dp in extra],
            inaccurate_data=[
                (exp.name, f"{exp.value}{exp.unit}", f"{act.value}{act.unit}")
                for exp, act in inaccurate
            ],
            structure_diff=structure_diff,
            suggestions=suggestions,
        )

    def evaluate_time_aware(
        self,
        actual: str,
        expected: str,
        time_ctx: Optional[TimeContext] = None
    ) -> EvaluationResult:
        """
        Time-aware evaluation that considers year differences.

        Key improvement: Same metric with different years is NOT marked as inaccurate.
        - Core evidence: Requires precise year match or close value
        - Background material: Allows window expansion
        - Auxiliary data: Extra years count as bonus context

        Args:
            actual: The actual output text
            expected: The expected (reference) output text
            time_ctx: Time context with target years (optional, will be derived if not provided)

        Returns:
            EvaluationResult with time-adjusted scores
        """
        # Extract data points with year information
        expected_data = self.data_extractor.extract(expected)
        actual_data = self.data_extractor.extract(actual)

        # Extract years from both texts
        expected_years = self._extract_years_from_text(expected)
        actual_years = self._extract_years_from_text(actual)

        # Create or align time context
        if time_ctx is None:
            time_ctx = TimeContext(
                target_years=expected_years if expected_years else actual_years,
                expected_years=expected_years if expected_years else actual_years
            )
        elif expected_years and not time_ctx.expected_years:
            time_ctx = time_ctx.align_to_expected_years(expected_years)

        # Perform time-aware validation
        time_validator = TimeValidator()

        # Convert data points to dict format for time validator
        expected_by_metric_year = self._group_data_by_metric_year(expected_data)
        actual_by_metric_year = self._group_data_by_metric_year(actual_data)

        time_result = time_validator.validate(
            actual_by_metric_year,
            expected_by_metric_year,
            time_ctx
        )

        # Calculate dimension scores with time awareness
        data_coverage, missing, extra = self._calculate_data_coverage_time_aware(
            expected_data, actual_data, time_ctx
        )

        structure_score, structure_diff = self._calculate_structure_score(
            actual, expected
        )

        semantic_score = self._calculate_semantic_similarity(actual, expected)

        # Accuracy score uses time-aware matching
        accuracy_score, inaccurate = self._calculate_accuracy_score_time_aware(
            expected_data, actual_data, time_ctx
        )

        # Calculate base score
        base_score = (
            data_coverage * self.WEIGHTS['data_coverage'] +
            structure_score * self.WEIGHTS['structure'] +
            semantic_score * self.WEIGHTS['semantic'] +
            accuracy_score * self.WEIGHTS['accuracy']
        )

        # Apply time adjustment
        overall_score = base_score + time_result.score_adjustment
        overall_score = max(0.0, min(1.0, overall_score))  # Clamp to [0, 1]

        # Generate suggestions
        suggestions = self._generate_suggestions_time_aware(
            missing, extra, inaccurate, structure_diff, time_result
        )

        return EvaluationResult(
            overall_score=overall_score,
            dimension_scores={
                'data_coverage': data_coverage,
                'structure': structure_score,
                'semantic': semantic_score,
                'accuracy': accuracy_score,
                'time_adjustment': time_result.score_adjustment,
            },
            missing_data_points=[f"{dp.name}: {dp.value}{dp.unit}" for dp in missing],
            extra_data_points=[f"{dp.name}: {dp.value}{dp.unit}" for dp in extra],
            inaccurate_data=[
                (exp.name, f"{exp.value}{exp.unit}", f"{act.value}{act.unit}")
                for exp, act in inaccurate
            ],
            structure_diff=structure_diff,
            suggestions=suggestions,
            time_adjustment=time_result.score_adjustment,
            auxiliary_data=time_result.auxiliary_data,
            year_gaps=time_result.year_gaps,
        )

    def _extract_years_from_text(self, text: str) -> List[str]:
        """Extract years mentioned in text"""
        years = re.findall(r'(20\d{2})\s*年?', text)
        return sorted(set(years), reverse=True)

    def _group_data_by_metric_year(self, data_points: List[DataPoint]) -> Dict[str, Dict[str, Any]]:
        """Group data points by metric name and year"""
        result = {}
        for dp in data_points:
            if dp.name not in result:
                result[dp.name] = {}
            year = dp.year or "unknown"
            result[dp.name][year] = {'value': dp.value, 'unit': dp.unit}
        return result

    def _calculate_data_coverage_time_aware(
        self,
        expected: List[DataPoint],
        actual: List[DataPoint],
        time_ctx: TimeContext
    ) -> Tuple[float, List[DataPoint], List[DataPoint]]:
        """
        Calculate data coverage with time awareness.

        Same metric name with different years is considered as matched
        if both values are reasonable (not marked as missing).
        """
        if not expected:
            return 1.0, [], []

        # Group by name for lookup
        expected_by_name = {dp.name: dp for dp in expected}
        actual_by_name = {dp.name: dp for dp in actual}

        missing = []
        matched = 0

        for name, exp_dp in expected_by_name.items():
            if name in actual_by_name:
                act_dp = actual_by_name[name]

                # Time-aware matching:
                # - If years match, use standard matching
                # - If years differ, check if values are both reasonable (count as match)
                if exp_dp.year and act_dp.year and exp_dp.year != act_dp.year:
                    # Different years - both values are valid data
                    # Check if it's core evidence or background
                    if is_core_evidence(name):
                        # Core evidence: require value similarity
                        if exp_dp.matches(act_dp, self.tolerance * 2):  # More lenient
                            matched += 0.8  # Partial credit for different year
                        else:
                            matched += 0.5  # Still counts as having data
                    else:
                        # Background: more lenient
                        matched += 0.9
                else:
                    # Same year or no year - standard matching
                    if exp_dp.matches(act_dp, self.tolerance):
                        matched += 1.0
                    else:
                        matched += 0.5  # Partial match
            else:
                missing.append(exp_dp)

        extra = [
            dp for name, dp in actual_by_name.items()
            if name not in expected_by_name
        ]

        coverage = matched / len(expected_by_name)
        return coverage, missing, extra

    def _calculate_accuracy_score_time_aware(
        self,
        expected: List[DataPoint],
        actual: List[DataPoint],
        time_ctx: TimeContext
    ) -> Tuple[float, List[Tuple[DataPoint, DataPoint]]]:
        """
        Calculate accuracy with time awareness.

        Different year values are NOT marked as inaccurate.
        """
        expected_by_name = {dp.name: dp for dp in expected}
        actual_by_name = {dp.name: dp for dp in actual}

        accurate = 0
        total = 0
        mismatched = []

        for name, exp_dp in expected_by_name.items():
            if name in actual_by_name:
                act_dp = actual_by_name[name]
                total += 1

                # Time-aware accuracy check
                if exp_dp.year and act_dp.year and exp_dp.year != act_dp.year:
                    # Different years - not counted as inaccurate
                    # Both are valid data from different periods
                    accurate += 1
                elif exp_dp.matches(act_dp, self.tolerance):
                    accurate += 1
                else:
                    mismatched.append((exp_dp, act_dp))

        score = accurate / total if total > 0 else 1.0
        return score, mismatched

    def _generate_suggestions_time_aware(
        self,
        missing: List[DataPoint],
        extra: List[DataPoint],
        inaccurate: List[Tuple[DataPoint, DataPoint]],
        structure_diff: Dict[str, Any],
        time_result: Any
    ) -> List[str]:
        """Generate improvement suggestions with time context"""
        suggestions = []

        # Data coverage suggestions
        if missing:
            missing_names = [dp.name for dp in missing[:5]]
            suggestions.append(
                f"缺失关键数据点: {', '.join(missing_names)}"
            )

        # Time-aware suggestions
        if time_result.year_gaps:
            suggestions.append(
                f"以下指标在不同年份有数据: {', '.join(time_result.year_gaps[:5])}"
            )

        if time_result.auxiliary_data:
            suggestions.append(
                f"发现额外年份数据: {len(time_result.auxiliary_data)}个数据点"
            )

        # Accuracy suggestions (only for true mismatches, not year differences)
        if inaccurate:
            suggestions.append(
                f"发现{len(inaccurate)}个数据点数值差异较大，建议核查"
            )

        # Structure suggestions
        if structure_diff.get('missing_sections'):
            suggestions.append(
                f"缺少章节: {', '.join(structure_diff['missing_sections'])}"
            )

        if structure_diff.get('expected_tables', 0) > structure_diff.get('actual_tables', 0):
            suggestions.append(
                "输出中缺少数据表格，建议添加结构化表格输出"
            )

        return suggestions

    def _calculate_data_coverage(
        self,
        expected: List[DataPoint],
        actual: List[DataPoint]
    ) -> Tuple[float, List[DataPoint], List[DataPoint]]:
        """
        Calculate data coverage score

        Returns:
            Tuple of (score, missing_data_points, extra_data_points)
        """
        if not expected:
            return 1.0, [], []

        # Create lookup by name
        expected_by_name = {dp.name: dp for dp in expected}
        actual_by_name = {dp.name: dp for dp in actual}

        missing = []
        matched = 0

        for name, exp_dp in expected_by_name.items():
            if name in actual_by_name:
                act_dp = actual_by_name[name]
                if exp_dp.matches(act_dp, self.tolerance):
                    matched += 1
                else:
                    # Partial match - count as half
                    matched += 0.5
            else:
                missing.append(exp_dp)

        extra = [
            dp for name, dp in actual_by_name.items()
            if name not in expected_by_name
        ]

        coverage = matched / len(expected_by_name)
        return coverage, missing, extra

    def _calculate_structure_score(
        self,
        actual: str,
        expected: str
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Calculate structure integrity score

        Checks:
        - Presence of important sections
        - Heading hierarchy
        - Table presence
        - List presence
        """
        # Extract sections from both
        expected_sections = self._extract_sections(expected)
        actual_sections = self._extract_sections(actual)

        # Check for important sections
        expected_section_names = {s.title for s in expected_sections}
        actual_section_names = {s.title for s in actual_sections}

        important_found = 0
        important_total = 0
        missing_sections = []

        for section in self.IMPORTANT_SECTIONS:
            # Check if section exists in expected
            exp_has = any(section in name for name in expected_section_names)
            act_has = any(section in name for name in actual_section_names)

            if exp_has:
                important_total += 1
                if act_has:
                    important_found += 1
                else:
                    missing_sections.append(section)

        section_score = important_found / important_total if important_total > 0 else 1.0

        # Check table presence
        expected_tables = self._count_tables(expected)
        actual_tables = self._count_tables(actual)
        table_score = min(actual_tables / expected_tables, 1.0) if expected_tables > 0 else 1.0

        # Check list presence
        expected_lists = self._count_lists(expected)
        actual_lists = self._count_lists(actual)
        list_score = min(actual_lists / expected_lists, 1.0) if expected_lists > 0 else 1.0

        # Combined structure score
        overall_structure = (
            section_score * 0.5 +
            table_score * 0.3 +
            list_score * 0.2
        )

        structure_diff = {
            'missing_sections': missing_sections,
            'expected_tables': expected_tables,
            'actual_tables': actual_tables,
            'expected_lists': expected_lists,
            'actual_lists': actual_lists,
        }

        return overall_structure, structure_diff

    def _extract_sections(self, text: str) -> List[SectionInfo]:
        """Extract section information from text"""
        sections = []
        lines = text.split('\n')

        for line in lines:
            # Check for markdown headings
            if line.startswith('#'):
                level = len(line) - len(line.lstrip('#'))
                title = line.lstrip('#').strip()
                sections.append(SectionInfo(
                    title=title,
                    level=level,
                    content_length=0,
                    has_table=False,
                    has_list=False,
                ))
            # Check for numbered sections
            elif re.match(r'^\d+[\.\、\s]', line):
                title = re.sub(r'^\d+[\.\、\s]*', '', line).strip()
                if title:
                    sections.append(SectionInfo(
                        title=title,
                        level=2,
                        content_length=len(line),
                        has_table=False,
                        has_list=False,
                    ))

        return sections

    def _count_tables(self, text: str) -> int:
        """Count number of tables in text"""
        # Markdown tables
        md_tables = len(re.findall(r'\|.+\|', text))
        # Simple table rows (tab-separated)
        tab_tables = len(re.findall(r'[\w\u4e00-\u9fff]+\t[\w\u4e00-\u9fff]+', text))
        return md_tables // 2 + tab_tables // 3  # Approximate table count

    def _count_lists(self, text: str) -> int:
        """Count number of list items in text"""
        # Numbered lists
        numbered = len(re.findall(r'^\d+[\.\、\)]', text, re.MULTILINE))
        # Bullet lists
        bullets = len(re.findall(r'^[\-\*\•]', text, re.MULTILINE))
        return numbered + bullets

    def _calculate_semantic_similarity(self, actual: str, expected: str) -> float:
        """
        Calculate semantic similarity (simplified without embeddings)

        Uses:
        - Keyword overlap
        - N-gram overlap
        - Sentence similarity
        """
        # Extract keywords
        expected_keywords = self._extract_keywords(expected)
        actual_keywords = self._extract_keywords(actual)

        if not expected_keywords:
            return 1.0

        # Jaccard similarity
        intersection = len(expected_keywords & actual_keywords)
        union = len(expected_keywords | actual_keywords)
        jaccard = intersection / union if union > 0 else 0

        # Coverage (how many expected keywords are in actual)
        coverage = len(expected_keywords & actual_keywords) / len(expected_keywords)

        # Combined score
        return (jaccard * 0.3 + coverage * 0.7)

    def _extract_keywords(self, text: str) -> Set[str]:
        """Extract important keywords from text"""
        # Remove punctuation and split
        words = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z]+|\d+', text)

        # Filter out stop words and short words
        stop_words = {
            '的', '了', '是', '在', '有', '和', '与', '对', '从', '到',
            '这', '那', '我', '你', '他', '她', '它', '们', '个', '把',
            '被', '给', '让', '请', '能', '会', '可以', '怎么', '什么', '如何',
            '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
            '年', '月', '日', '元', '度', '期', '本', '上', '下', '中',
        }

        keywords = {
            w.lower() for w in words
            if len(w) >= 2 and w not in stop_words
        }

        return keywords

    def _calculate_accuracy_score(
        self,
        expected: List[DataPoint],
        actual: List[DataPoint]
    ) -> Tuple[float, List[Tuple[DataPoint, DataPoint]]]:
        """
        Calculate numerical accuracy score

        Returns:
            Tuple of (score, mismatched_pairs)
        """
        expected_by_name = {dp.name: dp for dp in expected}
        actual_by_name = {dp.name: dp for dp in actual}

        accurate = 0
        total = 0
        mismatched = []

        for name, exp_dp in expected_by_name.items():
            if name in actual_by_name:
                act_dp = actual_by_name[name]
                total += 1

                if exp_dp.matches(act_dp, self.tolerance):
                    accurate += 1
                else:
                    mismatched.append((exp_dp, act_dp))

        score = accurate / total if total > 0 else 1.0
        return score, mismatched

    def _generate_suggestions(
        self,
        missing: List[DataPoint],
        extra: List[DataPoint],
        inaccurate: List[Tuple[DataPoint, DataPoint]],
        structure_diff: Dict[str, Any]
    ) -> List[str]:
        """Generate improvement suggestions"""
        suggestions = []

        # Data coverage suggestions
        if missing:
            missing_names = [dp.name for dp in missing[:5]]
            suggestions.append(
                f"缺失关键数据点: {', '.join(missing_names)}"
            )

        if len(missing) > 5:
            suggestions.append(
                f"共缺失{len(missing)}个数据点，需增强数据提取能力"
            )

        # Accuracy suggestions
        if inaccurate:
            suggestions.append(
                f"发现{len(inaccurate)}个数据点数值不准确，建议校验数据源"
            )

        # Structure suggestions
        if structure_diff.get('missing_sections'):
            suggestions.append(
                f"缺少章节: {', '.join(structure_diff['missing_sections'])}"
            )

        if structure_diff.get('expected_tables', 0) > structure_diff.get('actual_tables', 0):
            suggestions.append(
                "输出中缺少数据表格，建议添加结构化表格输出"
            )

        return suggestions


def evaluate_similarity(actual: str, expected: str) -> EvaluationResult:
    """Convenience function for quick evaluation"""
    evaluator = SimilarityEvaluator()
    return evaluator.evaluate(actual, expected)


def evaluate_similarity_time_aware(
    actual: str,
    expected: str,
    time_ctx: Optional[TimeContext] = None
) -> EvaluationResult:
    """
    Convenience function for time-aware evaluation.

    Args:
        actual: The actual output text
        expected: The expected (reference) output text
        time_ctx: Optional time context

    Returns:
        EvaluationResult with time-adjusted scores
    """
    evaluator = SimilarityEvaluator()
    return evaluator.evaluate_time_aware(actual, expected, time_ctx)