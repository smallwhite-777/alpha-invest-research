"""
Optimization Loop Controller
Controls the test-optimize loop until target quality is achieved
"""

import json
import time
import argparse
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path
from enum import Enum

import sys
sys.path.append(str(Path(__file__).parent.parent))

from agents.tester_agent import TesterAgent, TestCase, TestResult
from agents.programmer_agent import ProgrammerAgent
from optimization.strategies import OptimizationStrategy


class LoopStatus(Enum):
    RUNNING = "running"
    TARGET_ACHIEVED = "target_achieved"
    MAX_ITERATIONS = "max_iterations"
    NO_MORE_STRATEGIES = "no_more_strategies"
    ERROR = "error"


@dataclass
class LoopState:
    """State of the optimization loop"""
    iteration: int = 0
    current_score: float = 0.0
    best_score: float = 0.0
    scores_history: List[float] = field(default_factory=list)
    status: LoopStatus = LoopStatus.RUNNING
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None


@dataclass
class OptimizationLoopResult:
    """Final result of the optimization loop"""
    success: bool
    final_score: float
    target_score: float
    iterations: int
    status: LoopStatus
    test_results: List[TestResult]
    optimization_history: List[Dict[str, Any]]
    duration_seconds: float
    report: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'final_score': self.final_score,
            'target_score': self.target_score,
            'iterations': self.iterations,
            'status': self.status.value,
            'test_results': [tr.to_dict() for tr in self.test_results],
            'optimization_history': self.optimization_history,
            'duration_seconds': self.duration_seconds,
            'report': self.report,
        }


class OptimizationLoop:
    """
    Controls the test-optimize loop

    Flow:
    1. Run test
    2. Evaluate similarity
    3. If >= target, done
    4. Otherwise, analyze failure
    5. Select and apply optimization
    6. Validate generalization
    7. Repeat
    """

    def __init__(
        self,
        tester: TesterAgent,
        programmer: ProgrammerAgent,
        target_score: float = 0.9,
        max_iterations: int = 10,
        min_improvement: float = 0.01,
        on_iteration: Optional[Callable[[int, float, LoopStatus], None]] = None,
    ):
        """
        Initialize Optimization Loop

        Args:
            tester: TesterAgent instance
            programmer: ProgrammerAgent instance
            target_score: Target similarity score (default 0.9)
            max_iterations: Maximum iterations (default 10)
            min_improvement: Minimum improvement to continue (default 1%)
            on_iteration: Callback for each iteration
        """
        self.tester = tester
        self.programmer = programmer
        self.target_score = target_score
        self.max_iterations = max_iterations
        self.min_improvement = min_improvement
        self.on_iteration = on_iteration
        self.state = LoopState()

    def run(self, test_case: TestCase) -> OptimizationLoopResult:
        """
        Run the optimization loop for a single test case

        Args:
            test_case: TestCase to optimize for

        Returns:
            OptimizationLoopResult
        """
        print(f"\n{'='*60}")
        print(f"Starting Optimization Loop")
        print(f"Test Case: {test_case.id}")
        print(f"Question: {test_case.question[:50]}...")
        print(f"Target Score: {self.target_score:.0%}")
        print(f"Max Iterations: {self.max_iterations}")
        print(f"{'='*60}\n")

        test_results = []
        self.state = LoopState()

        while self.state.iteration < self.max_iterations:
            self.state.iteration += 1
            print(f"\n--- Iteration {self.state.iteration} ---")

            # Step 1: Run test
            print(f"Running test...")
            test_result = self.tester.run_test(test_case, self.state.iteration)
            test_results.append(test_result)

            self.state.current_score = test_result.evaluation.overall_score
            self.state.scores_history.append(self.state.current_score)

            print(f"Score: {self.state.current_score:.2%}")

            if self.state.current_score > self.state.best_score:
                self.state.best_score = self.state.current_score

            # Step 2: Check if target achieved
            if test_result.passed:
                print(f"[OK] Target achieved! Score: {self.state.current_score:.2%}")
                self.state.status = LoopStatus.TARGET_ACHIEVED
                break

            # Step 3: Analyze failure
            print(f"Analyzing failure...")
            analysis = self.programmer.analyze_failure(test_result)

            print(f"Missing data: {len(analysis.get('missing_data_points', []))} items")
            print(f"Inaccurate data: {len(analysis.get('inaccurate_data', []))} items")

            # Step 4: Get next optimization
            next_strategy = self.programmer.get_next_optimization(analysis)

            if next_strategy is None:
                print("[X] No more optimization strategies available")
                self.state.status = LoopStatus.NO_MORE_STRATEGIES
                break

            print(f"Applying strategy: {next_strategy.value}")

            # Step 5: Apply optimization
            opt_result = self.programmer.apply_optimization(
                next_strategy,
                analysis,
                self.state.current_score
            )

            if opt_result.success:
                print(f"Changes made: {len(opt_result.changes_made)}")
                for change in opt_result.changes_made:
                    print(f"  - {change}")
            else:
                print(f"Optimization failed: {opt_result.error}")

            # Step 6: Callback
            if self.on_iteration:
                self.on_iteration(self.state.iteration, self.state.current_score, self.state.status)

            # Step 7: Check for stagnation
            if len(self.state.scores_history) >= 3:
                recent = self.state.scores_history[-3:]
                if max(recent) - min(recent) < self.min_improvement:
                    print("[!] Score stagnation detected")

        # End of loop
        self.state.end_time = time.time()
        duration = self.state.end_time - self.state.start_time

        if self.state.status == LoopStatus.RUNNING:
            self.state.status = LoopStatus.MAX_ITERATIONS

        # Generate report
        report = self._generate_report(test_case, test_results)

        return OptimizationLoopResult(
            success=self.state.status == LoopStatus.TARGET_ACHIEVED,
            final_score=self.state.current_score,
            target_score=self.target_score,
            iterations=self.state.iteration,
            status=self.state.status,
            test_results=test_results,
            optimization_history=[h.to_dict() for h in self.programmer.state.history],
            duration_seconds=duration,
            report=report,
        )

    def run_with_validation(
        self,
        primary_test: TestCase,
        validation_tests: List[TestCase],
    ) -> OptimizationLoopResult:
        """
        Run optimization with cross-validation on other tests

        Args:
            primary_test: Main test case to optimize for
            validation_tests: Other tests to validate generalization

        Returns:
            OptimizationLoopResult
        """
        # Run primary optimization
        result = self.run(primary_test)

        # Validate on other tests
        if result.success:
            print("\n--- Validating Generalization ---")

            validation_results = self.tester.run_test_suite(
                validation_tests,
                self.state.iteration
            )

            print(f"Validation Results:")
            print(f"  Pass Rate: {validation_results.pass_rate:.0%}")
            print(f"  Average Score: {validation_results.average_score:.2%}")

            # Check if generalization is good
            if validation_results.pass_rate >= 0.8:
                print("[OK] Generalization successful!")
            else:
                print("[!] Poor generalization - may need additional optimization")

        return result

    def _generate_report(
        self,
        test_case: TestCase,
        test_results: List[TestResult]
    ) -> str:
        """Generate comprehensive report"""
        lines = [
            "# Optimization Loop Report",
            "",
            f"**Test Case**: {test_case.id}",
            f"**Question**: {test_case.question}",
            "",
            "## Summary",
            "",
            f"- **Final Score**: {self.state.current_score:.2%}",
            f"- **Target Score**: {self.target_score:.0%}",
            f"- **Status**: {self.state.status.value}",
            f"- **Iterations**: {self.state.iteration}",
            f"- **Duration**: {self.state.end_time - self.state.start_time:.1f}s" if self.state.end_time else "",
            "",
            "## Score Progression",
            "",
            "| Iteration | Score | Status |",
            "|-----------|-------|--------|",
        ]

        for i, result in enumerate(test_results, 1):
            status = "[PASS]" if result.passed else "[FAIL]"
            lines.append(f"| {i} | {result.evaluation.overall_score:.2%} | {status} |")

        lines.extend([
            "",
            "## Final Test Evaluation",
            "",
        ])

        if test_results:
            last_result = test_results[-1]
            eval_result = last_result.evaluation

            lines.append(f"### Dimension Scores")
            lines.append("")
            for dim, score in eval_result.dimension_scores.items():
                lines.append(f"- {dim}: {score:.2%}")

            if eval_result.missing_data_points:
                lines.append("")
                lines.append("### Missing Data Points")
                lines.append("")
                for dp in eval_result.missing_data_points[:10]:
                    lines.append(f"- {dp}")

            if eval_result.inaccurate_data:
                lines.append("")
                lines.append("### Inaccurate Data")
                lines.append("")
                for name, expected, actual in eval_result.inaccurate_data[:10]:
                    lines.append(f"- {name}: expected {expected}, got {actual}")

        # Add programmer's optimization report
        lines.append("")
        lines.append("## Optimizations Applied")
        lines.append("")
        lines.append(self.programmer.get_optimization_report())

        return '\n'.join(lines)


def create_workflow_runner(api_endpoint: str = "http://localhost:3001/api/chat") -> Callable[[str], str]:
    """
    Create a workflow runner that calls the API

    Args:
        api_endpoint: Chat API endpoint

    Returns:
        Function that takes question and returns response
    """
    try:
        import requests
    except ImportError:
        print("Please install requests: pip install requests")
        return lambda q: "Error: requests not installed"

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


def main():
    """Main entry point for running optimization loop"""
    parser = argparse.ArgumentParser(description="Run optimization loop for investment research assistant")
    parser.add_argument(
        '--test-case',
        type=str,
        required=True,
        help='Path to test case file (.md or .json)'
    )
    parser.add_argument(
        '--target-score',
        type=float,
        default=0.9,
        help='Target similarity score (default: 0.9)'
    )
    parser.add_argument(
        '--max-iterations',
        type=int,
        default=10,
        help='Maximum iterations (default: 10)'
    )
    parser.add_argument(
        '--api-endpoint',
        type=str,
        default='http://localhost:3001/api/chat',
        help='Chat API endpoint'
    )
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='Output file for results (JSON)'
    )

    args = parser.parse_args()

    # Load test case
    test_path = Path(args.test_case)
    if not test_path.exists():
        print(f"Error: Test case file not found: {args.test_case}")
        return 1

    if test_path.suffix == '.md':
        test_case = TestCase.from_markdown(str(test_path))
    elif test_path.suffix == '.json':
        with open(test_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        test_case = TestCase.from_dict(data)
    else:
        print(f"Error: Unsupported file format: {test_path.suffix}")
        return 1

    # Create agents
    workflow_runner = create_workflow_runner(args.api_endpoint)

    tester = TesterAgent(
        workflow_runner=workflow_runner,
        target_score=args.target_score,
    )

    programmer = ProgrammerAgent()

    # Create and run loop
    loop = OptimizationLoop(
        tester=tester,
        programmer=programmer,
        target_score=args.target_score,
        max_iterations=args.max_iterations,
    )

    result = loop.run(test_case)

    # Print report
    print("\n" + result.report)

    # Save results
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)
        print(f"\nResults saved to: {args.output}")

    return 0 if result.success else 1


if __name__ == "__main__":
    exit(main())