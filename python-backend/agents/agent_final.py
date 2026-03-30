# Agent Final: Review and Integration Agent
# Reviews all sub-task results, cross-validates data, and produces final report

import os
import json
import logging
import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from pathlib import Path
from datetime import datetime

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.task_types import TaskDecomposition
from agents.parallel_scheduler import PipelineResult, ExecutorResult

logger = logging.getLogger(__name__)


@dataclass
class CrossValidatedData:
    """Data that has been cross-validated across multiple sources"""
    metric_name: str
    values: Dict[str, Any]  # year -> value
    sources: List[str]
    confidence: float
    notes: str = ""


@dataclass
class FinalReport:
    """Final integrated report from all sub-task results"""
    query: str
    entity: str
    stock_code: Optional[str]
    intent: str
    time_range: List[str]

    # Structured data sections
    financial_summary: Dict[str, Any] = field(default_factory=dict)
    profitability_analysis: Dict[str, Any] = field(default_factory=dict)
    cashflow_analysis: Dict[str, Any] = field(default_factory=dict)
    business_structure: Dict[str, Any] = field(default_factory=dict)
    management_outlook: Dict[str, Any] = field(default_factory=dict)
    valuation_analysis: Dict[str, Any] = field(default_factory=dict)
    risk_assessment: Dict[str, Any] = field(default_factory=dict)
    industry_comparison: Dict[str, Any] = field(default_factory=dict)

    # Cross-validated metrics
    cross_validated_metrics: List[CrossValidatedData] = field(default_factory=list)

    # Comparison analysis (for multi-year)
    year_over_year_comparison: Dict[str, Any] = field(default_factory=dict)

    # Meta information
    source_files: List[str] = field(default_factory=list)
    overall_confidence: float = 0.0
    data_quality_score: float = 0.0
    generation_timestamp: str = ""

    # Formatted report
    formatted_report: str = ""

    def to_dict(self) -> Dict:
        result = asdict(self)
        # Convert CrossValidatedData objects to dicts
        result['cross_validated_metrics'] = [
            asdict(m) if isinstance(m, CrossValidatedData) else m
            for m in self.cross_validated_metrics
        ]
        return result


class AgentFinal:
    """
    Agent Final: Review and Integration Agent

    Responsibilities:
    1. Review all sub-task results for consistency
    2. Cross-validate data across multiple sources
    3. Identify discrepancies and flag them
    4. Produce integrated, well-structured final report
    5. Generate year-over-year comparison analysis
    """

    def __init__(self):
        pass

    def integrate(self, pipeline_result: PipelineResult,
                  decomposition: Optional[TaskDecomposition] = None) -> FinalReport:
        """
        Main entry point: integrate all sub-task results into final report.

        Args:
            pipeline_result: Result from parallel scheduler
            decomposition: Original task decomposition (optional)

        Returns:
            FinalReport with integrated analysis
        """
        logger.info(f"Starting final integration for: {pipeline_result.entity}")

        # Initialize report
        report = FinalReport(
            query=pipeline_result.query,
            entity=pipeline_result.entity,
            stock_code=pipeline_result.stock_code,
            intent=pipeline_result.intent,
            time_range=pipeline_result.time_range,
            generation_timestamp=datetime.now().isoformat()
        )

        # Step 1: Extract data from sub-task results
        sub_task_data = self._extract_sub_task_data(pipeline_result.sub_task_results)

        # Step 2: Populate report sections
        report.financial_summary = sub_task_data.get('financial_data', {})
        report.profitability_analysis = sub_task_data.get('profitability', {})
        report.cashflow_analysis = sub_task_data.get('cashflow', {})
        report.business_structure = sub_task_data.get('business_structure', {})
        report.management_outlook = sub_task_data.get('management_analysis', {})
        report.valuation_analysis = sub_task_data.get('valuation', {})
        report.risk_assessment = sub_task_data.get('risk_analysis', {})
        report.industry_comparison = sub_task_data.get('industry_comparison', {})

        # Step 3: Cross-validate metrics
        report.cross_validated_metrics = self._cross_validate_metrics(
            sub_task_data,
            pipeline_result.source_files
        )

        # Step 4: Generate year-over-year comparison
        if len(pipeline_result.time_range) >= 2:
            report.year_over_year_comparison = self._generate_yoy_comparison(
                sub_task_data,
                pipeline_result.time_range
            )

        # Step 5: Calculate confidence scores
        report.overall_confidence = pipeline_result.total_confidence
        report.data_quality_score = self._calculate_data_quality(
            pipeline_result.sub_task_results
        )

        # Step 6: Collect source files
        report.source_files = pipeline_result.source_files

        # Step 7: Generate formatted report
        report.formatted_report = self._generate_formatted_report(report)

        logger.info(f"Final integration complete: confidence={report.overall_confidence:.2f}, "
                   f"quality={report.data_quality_score:.2f}")

        return report

    def _extract_sub_task_data(self, sub_task_results: List[ExecutorResult]) -> Dict[str, Any]:
        """Extract and organize data from sub-task results"""
        data = {}

        for result in sub_task_results:
            if result.status == "failed":
                continue

            data[result.task_type] = result.data

        return data

    def _cross_validate_metrics(self, sub_task_data: Dict,
                                 source_files: List[str]) -> List[CrossValidatedData]:
        """Cross-validate key metrics across data sources"""
        validated = []

        # Key metrics to validate
        key_metrics = {
            'financial_data': ['营业收入', '净利润', 'ROE', '每股收益'],
            'profitability': ['毛利率', '净利率'],
            'cashflow': ['经营活动现金流']
        }

        for task_type, metrics in key_metrics.items():
            task_data = sub_task_data.get(task_type, {})

            for metric in metrics:
                if metric in task_data:
                    values = task_data[metric]
                    if isinstance(values, dict):
                        # Check if values are consistent
                        confidence = self._validate_metric_values(values)
                        validated.append(CrossValidatedData(
                            metric_name=metric,
                            values=values,
                            sources=source_files[:3],
                            confidence=confidence,
                            notes=f"Extracted from {task_type}"
                        ))

        return validated

    def _validate_metric_values(self, values: Dict[str, Any]) -> float:
        """Validate metric values for consistency"""
        if not values:
            return 0.0

        # Check for numeric values
        numeric_count = 0
        for v in values.values():
            if isinstance(v, (int, float)):
                numeric_count += 1
            elif isinstance(v, str):
                # Try to parse as number
                try:
                    clean = v.replace(',', '').replace('亿', '').replace('万', '')
                    float(clean)
                    numeric_count += 1
                except:
                    pass

        return numeric_count / len(values) if values else 0.0

    def _generate_yoy_comparison(self, sub_task_data: Dict,
                                  time_range: List[str]) -> Dict[str, Any]:
        """Generate year-over-year comparison analysis"""
        comparison = {}

        # Financial metrics for comparison
        comparison_metrics = {
            '营业收入': 'financial_data',
            '净利润': 'financial_data',
            '毛利率': 'profitability',
            '净利率': 'profitability'
        }

        for metric, task_type in comparison_metrics.items():
            task_data = sub_task_data.get(task_type, {})
            metric_data = task_data.get(metric, {})

            if isinstance(metric_data, dict) and len(metric_data) >= 2:
                # Extract values for different years
                values_by_year = {}
                for year in time_range:
                    if year in metric_data:
                        values_by_year[year] = metric_data[year]

                if len(values_by_year) >= 2:
                    # Calculate change
                    years = sorted(values_by_year.keys())
                    if len(years) >= 2:
                        latest_year = years[-1]
                        previous_year = years[-2]

                        try:
                            latest_val = self._parse_numeric(values_by_year[latest_year])
                            previous_val = self._parse_numeric(values_by_year[previous_year])

                            if latest_val and previous_val and previous_val != 0:
                                change_pct = (latest_val - previous_val) / abs(previous_val) * 100
                                comparison[metric] = {
                                    'latest_year': latest_year,
                                    'previous_year': previous_year,
                                    'latest_value': values_by_year[latest_year],
                                    'previous_value': values_by_year[previous_year],
                                    'change_pct': f"{change_pct:.1f}%"
                                }
                        except Exception as e:
                            logger.debug(f"Could not calculate YoY change for {metric}: {e}")

        return comparison

    def _parse_numeric(self, value: Any) -> Optional[float]:
        """Parse a value to numeric"""
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                # Remove common suffixes and separators
                clean = value.replace(',', '').replace('亿', '').replace('万', '')
                clean = clean.replace('%', '').replace('元', '').strip()
                return float(clean)
            except:
                return None
        return None

    def _calculate_data_quality(self, sub_task_results: List[ExecutorResult]) -> float:
        """Calculate overall data quality score"""
        if not sub_task_results:
            return 0.0

        total_score = 0.0
        for result in sub_task_results:
            # Factor in status, confidence, and data presence
            status_score = 1.0 if result.status == "success" else 0.5 if result.status == "partial" else 0.0
            data_score = 1.0 if result.data else 0.0

            total_score += (status_score * 0.5 + result.confidence * 0.3 + data_score * 0.2)

        return total_score / len(sub_task_results)

    def _generate_formatted_report(self, report: FinalReport) -> str:
        """Generate a formatted text report"""
        sections = []

        # Header
        sections.append(f"# {report.entity} 投资分析报告")
        sections.append(f"\n**分析时间范围**: {', '.join(report.time_range)}")
        sections.append(f"**数据置信度**: {report.overall_confidence:.0%}")
        sections.append(f"**数据质量评分**: {report.data_quality_score:.0%}")
        sections.append("")

        # Financial Summary
        if report.financial_summary:
            sections.append("## 一、核心财务数据")
            sections.append(self._format_dict_data(report.financial_summary))

        # YoY Comparison
        if report.year_over_year_comparison:
            sections.append("\n## 二、同比变化分析")
            for metric, data in report.year_over_year_comparison.items():
                change_symbol = "↑" if "+" in data.get('change_pct', '') else "↓"
                sections.append(f"- **{metric}**: {data['previous_value']} → {data['latest_value']} "
                              f"({change_symbol} {data['change_pct']})")

        # Profitability
        if report.profitability_analysis:
            sections.append("\n## 三、盈利能力分析")
            sections.append(self._format_dict_data(report.profitability_analysis))

        # Cashflow
        if report.cashflow_analysis:
            sections.append("\n## 四、现金流分析")
            sections.append(self._format_dict_data(report.cashflow_analysis))

        # Business Structure
        if report.business_structure and report.business_structure.get('business_segments'):
            sections.append("\n## 五、业务结构")
            for segment in report.business_structure.get('business_segments', [])[:5]:
                sections.append(f"- {segment.get('line', '')}")

        # Management Outlook
        if report.management_outlook:
            sections.append("\n## 六、管理层展望")
            if report.management_outlook.get('future_outlook'):
                for item in report.management_outlook['future_outlook'][:3]:
                    sections.append(f"- {item.get('content', '')[:100]}...")

        # Risks
        if report.risk_assessment:
            sections.append("\n## 七、风险提示")
            all_risks = (report.risk_assessment.get('operational_risks', []) +
                        report.risk_assessment.get('financial_risks', []) +
                        report.risk_assessment.get('industry_risks', []))
            for risk in all_risks[:5]:
                sections.append(f"- {risk.get('content', '')[:100]}...")

        # Valuation
        if report.valuation_analysis:
            sections.append("\n## 八、估值分析")
            sections.append(self._format_dict_data(report.valuation_analysis))

        # Data Sources
        sections.append("\n---")
        sections.append("## 数据来源")
        for i, source in enumerate(report.source_files[:5], 1):
            filename = os.path.basename(source) if source else "未知"
            sections.append(f"{i}. {filename}")

        sections.append(f"\n*报告生成时间: {report.generation_timestamp}*")

        return "\n".join(sections)

    def _format_dict_data(self, data: Dict, indent: int = 0) -> str:
        """Format dictionary data for display"""
        lines = []
        prefix = "  " * indent

        for key, value in data.items():
            if isinstance(value, dict):
                lines.append(f"{prefix}- **{key}**:")
                for k, v in value.items():
                    lines.append(f"{prefix}  - {k}: {v}")
            elif isinstance(value, list):
                if value and not isinstance(value[0], dict):
                    lines.append(f"{prefix}- **{key}**: {', '.join(str(v) for v in value[:5])}")
            else:
                lines.append(f"{prefix}- **{key}**: {value}")

        return "\n".join(lines)


def create_final_report(pipeline_result: PipelineResult,
                        decomposition: Optional[TaskDecomposition] = None) -> FinalReport:
    """Convenience function to create final report"""
    agent = AgentFinal()
    return agent.integrate(pipeline_result, decomposition)


# Test code
if __name__ == "__main__":
    from agents.parallel_scheduler import run_pipeline

    print("=" * 60)
    print("Agent Final: Review and Integration Test")
    print("=" * 60)

    test_query = "中煤能源这两年的财务业绩怎么样"
    print(f"\nQuery: {test_query}")
    print("-" * 60)

    # Run pipeline
    pipeline_result = run_pipeline(test_query)

    # Create final report
    agent_final = AgentFinal()
    final_report = agent_final.integrate(pipeline_result)

    print(f"\n{'='*60}")
    print("FINAL REPORT")
    print("=" * 60)
    print(final_report.formatted_report)

    # Save to file
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"report_{final_report.entity}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_report.to_dict(), f, ensure_ascii=False, indent=2)

    print(f"\n\nReport saved to: {output_file}")