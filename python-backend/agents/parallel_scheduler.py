# Parallel Scheduler for Multi-Agent Pipeline
# Distributes sub-tasks to parallel executors and manages results

import os
import json
import logging
import tempfile
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.task_types import TaskDecomposition, SubTask, TaskType
from agents.sub_task_executors import get_executor, ExecutorResult

logger = logging.getLogger(__name__)


@dataclass
class PipelineResult:
    """Result from the entire pipeline execution"""
    query: str
    entity: str
    stock_code: Optional[str]
    intent: str
    time_range: List[str]
    sub_task_results: List[ExecutorResult]
    combined_data: Dict[str, Any] = field(default_factory=dict)
    source_files: List[str] = field(default_factory=list)
    total_confidence: float = 0.0
    execution_time_ms: float = 0.0
    status: str = "pending"

    def to_dict(self) -> Dict:
        return asdict(self)

    def save_to_temp_file(self) -> str:
        """Save result to temp file for inter-agent communication"""
        temp_dir = tempfile.gettempdir()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"pipeline_result_{self.entity}_{timestamp}.json"
        filepath = os.path.join(temp_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

        logger.info(f"Pipeline result saved to: {filepath}")
        return filepath


class ParallelScheduler:
    """
    Scheduler that distributes sub-tasks to parallel executors.

    Uses ThreadPoolExecutor for concurrent execution.
    Results are collected and combined into a PipelineResult.
    """

    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers

    def execute_pipeline(self, decomposition: TaskDecomposition) -> PipelineResult:
        """
        Execute the full pipeline for a decomposed task.

        Args:
            decomposition: TaskDecomposition from Agent 0

        Returns:
            PipelineResult with all sub-task results
        """
        start_time = datetime.now()
        logger.info(f"Starting pipeline execution for: {decomposition.entity}")

        sub_task_results = []

        # Execute sub-tasks in parallel
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_task = {}
            for sub_task in decomposition.sub_tasks:
                future = executor.submit(
                    self._execute_single_task,
                    sub_task,
                    decomposition.entity,
                    decomposition.stock_code
                )
                future_to_task[future] = sub_task

            # Collect results
            for future in as_completed(future_to_task):
                sub_task = future_to_task[future]
                try:
                    result = future.result(timeout=60)  # 60s timeout per task
                    sub_task_results.append(result)
                    logger.info(f"Task {sub_task.id} completed: {result.status}")
                except Exception as e:
                    logger.error(f"Task {sub_task.id} failed: {e}")
                    # Create failed result
                    sub_task_results.append(ExecutorResult(
                        task_id=sub_task.id,
                        task_type=sub_task.task_type.value,
                        status="failed",
                        error=str(e)
                    ))

        # Sort by task_id
        sub_task_results.sort(key=lambda r: r.task_id)

        # Combine results
        combined_data = self._combine_results(sub_task_results)
        source_files = self._collect_source_files(sub_task_results)
        total_confidence = self._calculate_total_confidence(sub_task_results)

        end_time = datetime.now()
        execution_time_ms = (end_time - start_time).total_seconds() * 1000

        result = PipelineResult(
            query=decomposition.user_raw,
            entity=decomposition.entity,
            stock_code=decomposition.stock_code,
            intent=decomposition.intent.value,
            time_range=decomposition.time_range,
            sub_task_results=sub_task_results,
            combined_data=combined_data,
            source_files=source_files,
            total_confidence=total_confidence,
            execution_time_ms=execution_time_ms,
            status="completed" if total_confidence > 0.5 else "partial"
        )

        logger.info(f"Pipeline completed in {execution_time_ms:.0f}ms, confidence={total_confidence:.2f}")
        return result

    def _execute_single_task(self, task: SubTask, entity: str,
                             stock_code: Optional[str]) -> ExecutorResult:
        """Execute a single sub-task"""
        logger.info(f"Executing task {task.id}: {task.name}")

        try:
            executor = get_executor(task.task_type)
            result = executor.execute(task, entity, stock_code)
            return result
        except Exception as e:
            logger.error(f"Task {task.id} execution failed: {e}")
            return ExecutorResult(
                task_id=task.id,
                task_type=task.task_type.value,
                status="failed",
                error=str(e)
            )

    def _combine_results(self, results: List[ExecutorResult]) -> Dict[str, Any]:
        """Combine all sub-task results into a single data structure"""
        combined = {
            "financial_data": {},
            "profitability": {},
            "cashflow": {},
            "business_structure": {},
            "management_analysis": {},
            "valuation": {},
            "risk_analysis": {},
            "industry_comparison": {}
        }

        for result in results:
            if result.status != "failed" and result.data:
                # Map task type to combined data section
                task_type_to_section = {
                    "financial_data": "financial_data",
                    "profitability": "profitability",
                    "cashflow": "cashflow",
                    "business_structure": "business_structure",
                    "management_analysis": "management_analysis",
                    "valuation": "valuation",
                    "risk_analysis": "risk_analysis",
                    "industry_comparison": "industry_comparison"
                }

                section = task_type_to_section.get(result.task_type)
                if section:
                    combined[section] = result.data

        return combined

    def _collect_source_files(self, results: List[ExecutorResult]) -> List[str]:
        """Collect all unique source files from results"""
        all_files = []
        seen = set()

        for result in results:
            for filepath in result.source_files:
                if filepath and filepath not in seen:
                    all_files.append(filepath)
                    seen.add(filepath)

        return all_files[:10]  # Limit to 10 files

    def _calculate_total_confidence(self, results: List[ExecutorResult]) -> float:
        """Calculate overall confidence score"""
        if not results:
            return 0.0

        # Weight by task priority (T1 has highest priority)
        total_weight = 0.0
        weighted_confidence = 0.0

        for result in results:
            # Task ID starts with T, followed by a number
            try:
                task_num = int(result.task_id[1]) if len(result.task_id) > 1 else 1
                weight = 1.0 / task_num  # Higher priority = lower number = higher weight
            except:
                weight = 1.0

            weighted_confidence += result.confidence * weight
            total_weight += weight

        return weighted_confidence / total_weight if total_weight > 0 else 0.0


def run_pipeline(query: str, decomposition: Optional[TaskDecomposition] = None) -> PipelineResult:
    """
    Convenience function to run the full pipeline.

    Args:
        query: User's raw query
        decomposition: Pre-computed decomposition (optional)

    Returns:
        PipelineResult
    """
    from agents.agent0_decomposer import IntentDecompositionAgent

    # Decompose if not provided
    if decomposition is None:
        decomposer = IntentDecompositionAgent()
        decomposition = decomposer.decompose(query)

    # Execute pipeline
    scheduler = ParallelScheduler()
    result = scheduler.execute_pipeline(decomposition)

    return result


# Test code
if __name__ == "__main__":
    import json

    print("=" * 60)
    print("Parallel Scheduler Test")
    print("=" * 60)

    test_queries = [
        "中煤能源这两年的财务业绩怎么样",
        "紫金矿业2024年财务数据",
    ]

    for query in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print("-" * 60)

        result = run_pipeline(query)

        print(f"\nEntity: {result.entity}")
        print(f"Stock Code: {result.stock_code}")
        print(f"Intent: {result.intent}")
        print(f"Status: {result.status}")
        print(f"Total Confidence: {result.total_confidence:.2f}")
        print(f"Execution Time: {result.execution_time_ms:.0f}ms")
        print(f"Source Files: {len(result.source_files)}")
        print(f"Sub-tasks: {len(result.sub_task_results)}")

        for task_result in result.sub_task_results:
            print(f"\n  [{task_result.task_id}] {task_result.task_type}")
            print(f"      Status: {task_result.status}")
            print(f"      Confidence: {task_result.confidence:.2f}")
            if task_result.data:
                print(f"      Data keys: {list(task_result.data.keys())[:5]}")

        # Save to temp file
        temp_file = result.save_to_temp_file()
        print(f"\nResult saved to: {temp_file}")