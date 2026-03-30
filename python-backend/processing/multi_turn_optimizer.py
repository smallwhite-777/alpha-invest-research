"""
Multi-Turn Conversation Optimizer
Improves response quality through iterative refinement.
"""

import re
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum


class RefinementStatus(Enum):
    COMPLETE = "complete"           # No more refinement needed
    NEEDS_MORE_DATA = "needs_data"  # Need to fetch more data
    NEEDS_CLARIFICATION = "needs_clarification"  # Need user input
    ERROR = "error"                 # Error occurred


@dataclass
class RefinementResult:
    """Result of a refinement iteration"""
    status: RefinementStatus
    current_output: str
    missing_metrics: List[str]
    suggested_queries: List[str]
    confidence: float
    iteration: int
    notes: str = ""


@dataclass
class MetricRequirement:
    """A required metric for complete analysis"""
    name: str
    required: bool = True
    priority: int = 1  # 1 = highest, 5 = lowest
    category: str = "financial"  # financial, production, market, etc.


class MultiTurnOptimizer:
    """
    Optimizes responses through multi-turn refinement:

    1. Analyze initial response for completeness
    2. Identify missing key metrics
    3. Generate targeted queries to fetch missing data
    4. Re-analyze with new data
    5. Repeat until complete or max iterations reached
    """

    # Required metrics for different query types
    REQUIRED_METRICS = {
        'financial_analysis': [
            MetricRequirement('营业收入', required=True, priority=1),
            MetricRequirement('归母净利润', required=True, priority=1),
            MetricRequirement('毛利率', required=False, priority=2),
            MetricRequirement('ROE', required=False, priority=2),
            MetricRequirement('经营性现金流', required=False, priority=2),
            MetricRequirement('资产负债率', required=False, priority=3),
            MetricRequirement('总资产', required=False, priority=3),
        ],
        'company_analysis': [
            MetricRequirement('营业收入', required=True, priority=1),
            MetricRequirement('净利润', required=True, priority=1),
            MetricRequirement('产量', required=False, priority=2, category='production'),
            MetricRequirement('产能利用率', required=False, priority=3, category='production'),
        ],
        'industry_analysis': [
            MetricRequirement('市场规模', required=False, priority=1),
            MetricRequirement('增长率', required=False, priority=2),
            MetricRequirement('市场占有率', required=False, priority=2),
        ],
    }

    # Patterns to detect missing data
    MISSING_DATA_PATTERNS = [
        r'暂无.*?数据',
        r'未找到.*?信息',
        r'无法获取.*?数据',
        r'数据.*?缺失',
        r'需要.*?数据',
        r'xx亿',  # Placeholder
        r'xxx亿',  # Placeholder
        r'\?\?亿',  # Placeholder
    ]

    # Minimum data points for quality response
    MIN_DATA_POINTS = 5

    def __init__(
        self,
        max_iterations: int = 3,
        quality_threshold: float = 0.8,
        data_fetcher: Optional[Callable] = None
    ):
        """
        Initialize optimizer.

        Args:
            max_iterations: Maximum refinement iterations
            quality_threshold: Target quality threshold
            data_fetcher: Function to fetch additional data
        """
        self.max_iterations = max_iterations
        self.quality_threshold = quality_threshold
        self.data_fetcher = data_fetcher

    def analyze_completeness(
        self,
        output: str,
        query_type: str = 'financial_analysis'
    ) -> Tuple[float, List[str], List[str]]:
        """
        Analyze the completeness of an output.

        Args:
            output: The generated output
            query_type: Type of analysis

        Returns:
            Tuple of (completeness_score, missing_metrics, suggested_queries)
        """
        required = self.REQUIRED_METRICS.get(query_type, [])
        missing = []
        suggested = []

        # Check for missing data patterns
        for pattern in self.MISSING_DATA_PATTERNS:
            if re.search(pattern, output):
                # Found placeholder - indicate incomplete
                pass

        # Check required metrics
        for req in required:
            if req.required:
                # Check if metric appears with a value
                pattern = rf'{req.name}[：:\s]*([\d,\.]+)\s*(亿元|万元|%)?'
                match = re.search(pattern, output)

                if not match:
                    missing.append(req.name)
                    # Generate suggested query
                    suggested.append(f"获取{req.name}数据")

        # Count actual data points
        data_points = re.findall(r'[\d,\.]+\s*(亿元|万元|%|吨|万吨)', output)

        # Calculate completeness score
        if required:
            found_ratio = 1 - len(missing) / len([r for r in required if r.required])
        else:
            found_ratio = 1.0

        data_ratio = min(1.0, len(data_points) / self.MIN_DATA_POINTS)

        completeness = found_ratio * 0.6 + data_ratio * 0.4

        return completeness, missing, suggested

    def refine(
        self,
        initial_output: str,
        context: Dict[str, Any],
        query_type: str = 'financial_analysis'
    ) -> RefinementResult:
        """
        Perform refinement iterations to improve output quality.

        Args:
            initial_output: Initial LLM output
            context: Query context (company name, etc.)
            suggested_queries: Additional queries to run

        Returns:
            RefinementResult with final status
        """
        current_output = initial_output
        iteration = 0

        while iteration < self.max_iterations:
            iteration += 1

            # Analyze current output
            completeness, missing, suggested = self.analyze_completeness(
                current_output, query_type
            )

            print(f"[Refinement] Iteration {iteration}: completeness={completeness:.2%}, missing={missing}")

            # Check if complete enough
            if completeness >= self.quality_threshold:
                return RefinementResult(
                    status=RefinementStatus.COMPLETE,
                    current_output=current_output,
                    missing_metrics=[],
                    suggested_queries=[],
                    confidence=completeness,
                    iteration=iteration,
                    notes="Output meets quality threshold"
                )

            # Check if we can fetch more data
            if missing and self.data_fetcher:
                company_name = context.get('company_name', '')
                additional_data = {}

                for metric in missing[:3]:  # Limit to 3 queries per iteration
                    query = f"{company_name} {metric}"
                    try:
                        result = self.data_fetcher(query)
                        if result:
                            additional_data[metric] = result
                    except Exception as e:
                        print(f"[Refinement] Error fetching {metric}: {e}")

                if additional_data:
                    # Inject additional data into context
                    current_output = self._inject_data(current_output, additional_data)
                    continue

            # No more data to fetch
            if not missing or not self.data_fetcher:
                return RefinementResult(
                    status=RefinementStatus.NEEDS_MORE_DATA,
                    current_output=current_output,
                    missing_metrics=missing,
                    suggested_queries=suggested,
                    confidence=completeness,
                    iteration=iteration,
                    notes="Cannot fetch additional data"
                )

        # Max iterations reached
        completeness, missing, _ = self.analyze_completeness(current_output, query_type)

        return RefinementResult(
            status=RefinementStatus.COMPLETE if completeness >= self.quality_threshold else RefinementStatus.NEEDS_MORE_DATA,
            current_output=current_output,
            missing_metrics=missing,
            suggested_queries=[],
            confidence=completeness,
            iteration=iteration,
            notes="Max iterations reached"
        )

    def _inject_data(self, output: str, additional_data: Dict[str, Any]) -> str:
        """
        Inject additional data into output.

        Args:
            output: Current output
            additional_data: Data to inject

        Returns:
            Updated output
        """
        injection = "\n\n### 补充数据\n"
        for metric, value in additional_data.items():
            injection += f"- **{metric}**: {value}\n"

        # Insert before the summary section if it exists
        if '### 一句话总结' in output:
            output = output.replace('### 一句话总结', injection + '\n### 一句话总结')
        else:
            output += injection

        return output

    def generate_follow_up_questions(
        self,
        output: str,
        missing_metrics: List[str],
        context: Dict[str, Any]
    ) -> List[str]:
        """
        Generate follow-up questions to fill data gaps.

        Args:
            output: Current output
            missing_metrics: List of missing metrics
            context: Query context

        Returns:
            List of follow-up questions
        """
        questions = []
        company = context.get('company_name', '该公司')

        for metric in missing_metrics[:3]:
            if metric == '营业收入':
                questions.append(f"{company}的营业收入是多少亿元？")
            elif metric == '净利润' or metric == '归母净利润':
                questions.append(f"{company}的归母净利润是多少亿元？")
            elif metric == '毛利率':
                questions.append(f"{company}的毛利率是多少？")
            elif metric == 'ROE':
                questions.append(f"{company}的ROE（净资产收益率）是多少？")
            elif '产量' in metric:
                questions.append(f"{company}的主要产品产量是多少？")
            else:
                questions.append(f"请提供{company}的{metric}数据")

        return questions


def optimize_response(
    output: str,
    context: Dict[str, Any],
    query_type: str = 'financial_analysis',
    data_fetcher: Optional[Callable] = None
) -> RefinementResult:
    """
    Convenience function to optimize a response.

    Args:
        output: Initial output
        context: Query context
        query_type: Type of analysis
        data_fetcher: Function to fetch additional data

    Returns:
        RefinementResult
    """
    optimizer = MultiTurnOptimizer(data_fetcher=data_fetcher)
    return optimizer.refine(output, context, query_type)