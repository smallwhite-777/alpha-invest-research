"""
Programmer Agent
Analyzes test failures and applies optimizations to improve the workflow
"""

import json
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path
import copy

import sys
sys.path.append(str(Path(__file__).parent.parent))

from optimization.strategies import (
    OptimizationStrategy,
    OptimizationResult,
    OptimizationStrategySelector,
)


@dataclass
class OptimizationHistory:
    """Tracks optimization history for analysis"""
    iteration: int
    strategy: OptimizationStrategy
    result: OptimizationResult
    score_before: float
    score_after: Optional[float] = None
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'iteration': self.iteration,
            'strategy': self.strategy.value,
            'result': self.result.to_dict(),
            'score_before': self.score_before,
            'score_after': self.score_after,
            'timestamp': self.timestamp,
        }


@dataclass
class ProgrammerState:
    """State of the programmer agent"""
    total_optimizations: int = 0
    successful_optimizations: int = 0
    strategies_applied: List[OptimizationStrategy] = field(default_factory=list)
    history: List[OptimizationHistory] = field(default_factory=list)


class ProgrammerAgent:
    """
    Agent that analyzes test failures and applies optimizations

    Responsibilities:
    1. Analyze test failure patterns
    2. Select appropriate optimization strategies
    3. Apply optimizations (generalized, not hardcoded)
    4. Track optimization history
    5. Validate generalization
    """

    # Maximum times the same strategy can be applied
    MAX_STRATEGY_REPEATS = 2

    def __init__(
        self,
        config_path: Optional[str] = None,
        on_optimization: Optional[Callable[[OptimizationResult], None]] = None,
    ):
        """
        Initialize Programmer Agent

        Args:
            config_path: Path to configuration file
            on_optimization: Callback for when optimization is applied
        """
        self.config_path = config_path or "python-backend/config/optimization_config.json"
        self.selector = OptimizationStrategySelector(self.config_path)
        self.on_optimization = on_optimization
        self.state = ProgrammerState()
        self.strategy_counts: Dict[OptimizationStrategy, int] = {}

    def analyze_failure(self, test_result: Any) -> Dict[str, Any]:
        """
        Analyze why a test failed

        Args:
            test_result: TestResult from TesterAgent

        Returns:
            Analysis dict with failure reasons and suggestions
        """
        return self.selector.analyze_failure(test_result)

    def get_next_optimization(self, analysis: Dict[str, Any]) -> Optional[OptimizationStrategy]:
        """
        Determine the next optimization to apply

        Considers:
        - Which strategies haven't been tried
        - Which strategies are most likely to help
        - Avoid repeating strategies too many times

        Args:
            analysis: Analysis from analyze_failure

        Returns:
            OptimizationStrategy to apply, or None if no more strategies
        """
        strategies = self.selector.select_strategies(analysis)

        for strategy in strategies:
            count = self.strategy_counts.get(strategy, 0)
            if count < self.MAX_STRATEGY_REPEATS:
                return strategy

        return None

    def apply_optimization(
        self,
        strategy: OptimizationStrategy,
        analysis: Dict[str, Any],
        current_score: float,
    ) -> OptimizationResult:
        """
        Apply an optimization strategy

        Args:
            strategy: Strategy to apply
            analysis: Analysis of the failure
            current_score: Current test score

        Returns:
            OptimizationResult
        """
        # Apply the strategy
        result = self.selector.apply_strategy(strategy, analysis)

        # Update state
        self.state.total_optimizations += 1
        self.state.strategies_applied.append(strategy)
        self.strategy_counts[strategy] = self.strategy_counts.get(strategy, 0) + 1

        if result.success:
            self.state.successful_optimizations += 1

        # Record in history
        history_entry = OptimizationHistory(
            iteration=len(self.state.history),
            strategy=strategy,
            result=result,
            score_before=current_score,
        )
        self.state.history.append(history_entry)

        # Callback
        if self.on_optimization:
            self.on_optimization(result)

        return result

    def update_score(self, new_score: float):
        """
        Update the last optimization with the new score

        Args:
            new_score: Score after optimization was applied
        """
        if self.state.history:
            self.state.history[-1].score_after = new_score

    def validate_generalization(
        self,
        test_results: List[Any],
    ) -> bool:
        """
        Validate that optimizations generalize to other test cases

        Args:
            test_results: Results from running multiple test cases

        Returns:
            True if optimizations generalize well
        """
        # Check if other tests are passing or improving
        if not test_results:
            return True

        passing = sum(1 for r in test_results if hasattr(r, 'passed') and r.passed)
        total = len(test_results)

        # At least 80% should be passing
        pass_rate = passing / total if total > 0 else 0

        return pass_rate >= 0.8

    def check_hardcoding(self) -> List[str]:
        """
        Check if optimizations contain hardcoded values

        Returns:
            List of warnings about potential hardcoding
        """
        warnings = []

        for entry in self.state.history:
            config_changes = entry.result.config_changes

            # Check for specific company names or stock codes
            for key, value in config_changes.items():
                value_str = json.dumps(value, ensure_ascii=False)

                # Check for stock codes (6-digit numbers starting with 0, 3, 6)
                if re.search(r'[06]\d{5}', value_str):
                    warnings.append(
                        f"Iteration {entry.iteration}: Potential stock code in {key}"
                    )

                # Check for specific company names
                companies = ['紫金矿业', '牧原股份', '贵州茅台', '宁德时代']
                for company in companies:
                    if company in value_str:
                        warnings.append(
                            f"Iteration {entry.iteration}: Potential company name hardcoding in {key}"
                        )

        return warnings

    def get_optimization_report(self) -> str:
        """
        Generate a report of all optimizations applied

        Returns:
            Markdown report string
        """
        lines = [
            "# Optimization Report",
            "",
            f"Total Optimizations: {self.state.total_optimizations}",
            f"Successful: {self.state.successful_optimizations}",
            "",
            "## Strategy Usage",
            "",
        ]

        for strategy, count in self.strategy_counts.items():
            lines.append(f"- {strategy.value}: {count} times")

        lines.append("")
        lines.append("## History")
        lines.append("")

        for entry in self.state.history:
            status = "[OK]" if entry.result.success else "[FAIL]"
            score_change = ""
            if entry.score_after is not None:
                delta = entry.score_after - entry.score_before
                score_change = f" (Score: {entry.score_before:.2%} → {entry.score_after:.2%}, {'+' if delta >= 0 else ''}{delta:.2%})"
            else:
                score_change = f" (Score before: {entry.score_before:.2%})"

            lines.append(f"### {status} Iteration {entry.iteration}: {entry.strategy.value}{score_change}")

            if entry.result.changes_made:
                lines.append("")
                lines.append("Changes:")
                for change in entry.result.changes_made:
                    lines.append(f"- {change}")

            lines.append("")

        # Add hardcoding warnings
        warnings = self.check_hardcoding()
        if warnings:
            lines.append("## [!] Hardcoding Warnings")
            lines.append("")
            for warning in warnings:
                lines.append(f"- {warning}")
            lines.append("")

        return '\n'.join(lines)

    def reset(self):
        """Reset the programmer agent state"""
        self.state = ProgrammerState()
        self.strategy_counts = {}

    def save_config(self, path: Optional[str] = None):
        """
        Save current configuration

        Args:
            path: Path to save to (defaults to self.config_path)
        """
        save_path = path or self.config_path
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)

        config = {
            'optimization_history': [h.to_dict() for h in self.state.history],
            'strategy_counts': {k.value: v for k, v in self.strategy_counts.items()},
        }

        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, ensure_ascii=False, indent=2)


# Import re for check_hardcoding
import re