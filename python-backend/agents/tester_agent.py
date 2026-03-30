"""
Tester Agent
Runs the workflow with test cases and evaluates results
"""

import json
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path
from enum import Enum

import sys
sys.path.append(str(Path(__file__).parent.parent))

from evaluation.similarity_evaluator import SimilarityEvaluator, EvaluationResult


class TestCategory(Enum):
    FINANCIAL_ANALYSIS = "financial_analysis"
    INDUSTRY_RESEARCH = "industry_research"
    COMPANY_COMPARISON = "company_comparison"
    TREND_ANALYSIS = "trend_analysis"
    VALUATION = "valuation"


@dataclass
class TestCase:
    """Represents a single test case"""
    id: str
    question: str
    standard_answer: str
    category: TestCategory
    key_metrics: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    difficulty: int = 3  # 1-5 scale
    source_file: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TestCase':
        """Create TestCase from dictionary"""
        return cls(
            id=data['id'],
            question=data['question'],
            standard_answer=data['standard_answer'],
            category=TestCategory(data.get('category', 'financial_analysis')),
            key_metrics=data.get('key_metrics', []),
            tags=data.get('tags', []),
            difficulty=data.get('difficulty', 3),
            source_file=data.get('source_file'),
        )

    @classmethod
    def from_markdown(cls, md_path: str, test_id: str = None) -> 'TestCase':
        """
        Create TestCase from markdown file

        Expected format:
        - First line or first ## heading is the question
        - Rest is the standard answer

        Args:
            md_path: Path to markdown file
            test_id: Optional test ID (defaults to filename)
        """
        path = Path(md_path)
        if not path.exists():
            raise FileNotFoundError(f"Test file not found: {md_path}")

        content = path.read_text(encoding='utf-8')
        lines = content.strip().split('\n')

        # Extract question from first line or first heading
        question = ""
        answer_start = 0

        for i, line in enumerate(lines):
            if line.startswith('# '):
                question = line[2:].strip()
                answer_start = i + 1
                break
            elif i == 0:
                question = line.strip()
                answer_start = 1
                break

        # Rest is the answer
        answer = '\n'.join(lines[answer_start:])

        # Infer category from filename or content
        filename = path.stem.lower()
        if '业绩' in filename or '财务' in filename or 'financial' in filename:
            category = TestCategory.FINANCIAL_ANALYSIS
        elif '行业' in filename or 'industry' in filename:
            category = TestCategory.INDUSTRY_RESEARCH
        elif '对比' in filename or 'comparison' in filename:
            category = TestCategory.COMPANY_COMPARISON
        else:
            category = TestCategory.FINANCIAL_ANALYSIS

        return cls(
            id=test_id or path.stem,
            question=question,
            standard_answer=answer,
            category=category,
            source_file=str(md_path),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'question': self.question,
            'standard_answer': self.standard_answer,
            'category': self.category.value,
            'key_metrics': self.key_metrics,
            'tags': self.tags,
            'difficulty': self.difficulty,
            'source_file': self.source_file,
        }


@dataclass
class TestResult:
    """Result of running a single test"""
    test_case_id: str
    actual_output: str
    evaluation: EvaluationResult
    iteration: int = 0
    execution_time: float = 0.0
    error: Optional[str] = None

    @property
    def passed(self) -> bool:
        return self.evaluation.overall_score >= 0.9

    def to_dict(self) -> Dict[str, Any]:
        return {
            'test_case_id': self.test_case_id,
            'actual_output': self.actual_output,
            'evaluation': self.evaluation.to_dict(),
            'iteration': self.iteration,
            'execution_time': self.execution_time,
            'error': self.error,
            'passed': self.passed,
        }


@dataclass
class TestSuiteResult:
    """Result of running multiple tests"""
    results: List[TestResult]
    total_tests: int
    passed_tests: int
    average_score: float
    total_time: float

    @property
    def pass_rate(self) -> float:
        return self.passed_tests / self.total_tests if self.total_tests > 0 else 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'results': [r.to_dict() for r in self.results],
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'average_score': self.average_score,
            'total_time': self.total_time,
            'pass_rate': self.pass_rate,
        }


class TesterAgent:
    """
    Agent that runs tests and evaluates results

    Responsibilities:
    1. Load test cases
    2. Execute workflow for each test case
    3. Evaluate results against standard answers
    4. Report findings
    """

    def __init__(
        self,
        workflow_runner: Optional[Callable[[str], str]] = None,
        target_score: float = 0.9,
    ):
        """
        Initialize Tester Agent

        Args:
            workflow_runner: Function that takes a question and returns the output
            target_score: Target similarity score (default 0.9)
        """
        self.evaluator = SimilarityEvaluator()
        self.workflow_runner = workflow_runner
        self.target_score = target_score
        self.test_history: List[TestResult] = []

    def set_workflow_runner(self, runner: Callable[[str], str]):
        """Set the workflow runner function"""
        self.workflow_runner = runner

    def run_test(self, test_case: TestCase, iteration: int = 0) -> TestResult:
        """
        Run a single test case

        Args:
            test_case: The test case to run
            iteration: Current iteration number (for optimization loop)

        Returns:
            TestResult with actual output and evaluation
        """
        if self.workflow_runner is None:
            raise ValueError("Workflow runner not set. Call set_workflow_runner() first.")

        start_time = time.time()
        error = None
        actual_output = ""

        try:
            # Run the workflow
            actual_output = self.workflow_runner(test_case.question)

            if actual_output is None:
                error = "Workflow returned None"
                actual_output = ""

        except Exception as e:
            error = str(e)
            actual_output = f"Error: {error}"

        execution_time = time.time() - start_time

        # Evaluate the result
        evaluation = self.evaluator.evaluate(
            actual_output,
            test_case.standard_answer
        )

        result = TestResult(
            test_case_id=test_case.id,
            actual_output=actual_output,
            evaluation=evaluation,
            iteration=iteration,
            execution_time=execution_time,
            error=error,
        )

        # Store in history
        self.test_history.append(result)

        return result

    def run_test_suite(
        self,
        test_cases: List[TestCase],
        iteration: int = 0
    ) -> TestSuiteResult:
        """
        Run multiple test cases

        Args:
            test_cases: List of test cases to run
            iteration: Current iteration number

        Returns:
            TestSuiteResult with all results
        """
        results = []
        start_time = time.time()

        for test_case in test_cases:
            result = self.run_test(test_case, iteration)
            results.append(result)

        total_time = time.time() - start_time

        passed_tests = sum(1 for r in results if r.passed)
        average_score = sum(r.evaluation.overall_score for r in results) / len(results) if results else 0

        return TestSuiteResult(
            results=results,
            total_tests=len(test_cases),
            passed_tests=passed_tests,
            average_score=average_score,
            total_time=total_time,
        )

    def load_test_cases_from_dir(self, dir_path: str) -> List[TestCase]:
        """
        Load all test cases from a directory

        Args:
            dir_path: Path to directory containing test files

        Returns:
            List of TestCase objects
        """
        test_dir = Path(dir_path)
        if not test_dir.exists():
            raise FileNotFoundError(f"Test directory not found: {dir_path}")

        test_cases = []

        # Load .md files
        for md_file in test_dir.glob('*.md'):
            try:
                tc = TestCase.from_markdown(str(md_file))
                test_cases.append(tc)
            except Exception as e:
                print(f"Warning: Failed to load {md_file}: {e}")

        # Load .json files
        for json_file in test_dir.glob('*.json'):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    for item in data:
                        test_cases.append(TestCase.from_dict(item))
                else:
                    test_cases.append(TestCase.from_dict(data))
            except Exception as e:
                print(f"Warning: Failed to load {json_file}: {e}")

        return test_cases

    def get_last_result(self) -> Optional[TestResult]:
        """Get the most recent test result"""
        return self.test_history[-1] if self.test_history else None

    def get_results_by_test_id(self, test_id: str) -> List[TestResult]:
        """Get all results for a specific test ID"""
        return [r for r in self.test_history if r.test_case_id == test_id]

    def get_progress_history(self) -> List[Dict[str, Any]]:
        """Get score progression over iterations"""
        history = []
        for result in self.test_history:
            history.append({
                'test_case_id': result.test_case_id,
                'iteration': result.iteration,
                'score': result.evaluation.overall_score,
                'passed': result.passed,
            })
        return history

    def generate_report(self) -> str:
        """Generate a summary report of all test runs"""
        if not self.test_history:
            return "No test results available."

        lines = [
            "# Test Report",
            "",
            f"Total Tests Run: {len(self.test_history)}",
            f"Passed: {sum(1 for r in self.test_history if r.passed)}",
            f"Average Score: {sum(r.evaluation.overall_score for r in self.test_history) / len(self.test_history):.2%}",
            "",
            "## Detailed Results",
            "",
        ]

        for result in self.test_history:
            status = "✅ PASS" if result.passed else "❌ FAIL"
            lines.append(f"### {result.test_case_id} - {status}")
            lines.append(f"- Score: {result.evaluation.overall_score:.2%}")
            lines.append(f"- Iteration: {result.iteration}")
            lines.append(f"- Time: {result.execution_time:.2f}s")

            if result.evaluation.missing_data_points:
                lines.append(f"- Missing: {', '.join(result.evaluation.missing_data_points[:5])}")

            lines.append("")

        return '\n'.join(lines)


def create_default_workflow_runner(api_endpoint: str = "http://localhost:3001/api/chat") -> Callable[[str], str]:
    """
    Create a default workflow runner that calls the chat API

    Args:
        api_endpoint: URL of the chat API

    Returns:
        Function that takes a question and returns the response
    """
    import requests

    def runner(question: str) -> str:
        try:
            response = requests.post(
                api_endpoint,
                json={
                    "messages": [{"role": "user", "content": question}],
                    "mode": "deep",
                },
                timeout=120,
            )
            response.raise_for_status()
            data = response.json()

            # Handle different response formats
            if isinstance(data, dict):
                if 'result' in data:
                    result = data['result']
                    if isinstance(result, dict):
                        return result.get('content', '') or result.get('result', '') or str(result)
                    elif isinstance(result, str):
                        return result
                return str(data)
            return str(data)
        except Exception as e:
            return f"API Error: {e}"

    return runner