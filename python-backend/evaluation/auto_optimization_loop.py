"""
自动化优化循环控制器
实现无人值守的投研系统优化

功能：
1. 运行所有测试用例
2. 评估输出质量
3. 自动决定是否保留修改
4. 生成优化策略并执行
5. 持续迭代直到达到目标
"""

import json
import time
import traceback
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

# 导入评估组件
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from evaluation.test_loader import TestCaseLoader, TestCase
from evaluation.multi_test_evaluator import MultiTestEvaluator, EvaluationReport, TestCaseResult, RiskLevel
from evaluation.optimization_state import OptimizationStateManager, INDUSTRY_TEMPLATES


class OptimizationPhase(Enum):
    """优化阶段"""
    INIT = "init"
    BASELINE = "baseline"
    OPTIMIZING = "optimizing"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"


class OptimizationStrategy(Enum):
    """优化策略"""
    PROMPT_REFINEMENT = "prompt_refinement"
    SEARCH_ENHANCEMENT = "search_enhancement"
    STRUCTURE_TEMPLATE = "structure_template"
    DATA_EXTRACTION = "data_extraction"
    TIME_HANDLING = "time_handling"
    INDUSTRY_SWITCH = "industry_switch"
    OVERFIT_REDUCTION = "overfit_reduction"


@dataclass
class OptimizationState:
    """优化状态"""
    iteration: int = 0
    phase: OptimizationPhase = OptimizationPhase.INIT
    current_report: Optional[EvaluationReport] = None
    best_report: Optional[EvaluationReport] = None
    history: List[Dict] = field(default_factory=list)
    applied_strategies: List[str] = field(default_factory=list)
    start_time: str = ""
    end_time: str = ""


@dataclass
class OptimizationConfig:
    """优化配置"""
    # 目标阈值
    target_fitting_score: float = 85.0
    target_generalization_score: float = 70.0
    max_overfit_risk: int = 30

    # 迭代限制
    max_iterations: int = 20
    max_time_minutes: int = 120

    # 保留条件
    min_improvement: float = 2.0  # 最小改进阈值
    allowed_score_fluctuation: float = 3.0  # 允许的分数波动

    # 测试目录
    test_dir: str = "test"

    # 输出目录
    output_dir: str = "optimization_results"

    # 是否启用自动修改
    auto_modify: bool = True


class AutoOptimizationLoop:
    """自动化优化循环控制器"""

    # 优化策略映射
    STRATEGY_TRIGGERS = {
        "low_fitting": {
            "condition": lambda r: r.fitting_score < 70,
            "strategies": [OptimizationStrategy.PROMPT_REFINEMENT, OptimizationStrategy.STRUCTURE_TEMPLATE]
        },
        "low_generalization": {
            "condition": lambda r: r.generalization_score < 70,
            "strategies": [OptimizationStrategy.INDUSTRY_SWITCH, OptimizationStrategy.SEARCH_ENHANCEMENT]
        },
        "high_overfit": {
            "condition": lambda r: r.overfit_risk > 15,
            "strategies": [OptimizationStrategy.OVERFIT_REDUCTION]
        },
        "time_issues": {
            "condition": lambda r: r.test_results.get("Q5") and r.test_results["Q5"].score.time_accuracy < 10,
            "strategies": [OptimizationStrategy.TIME_HANDLING]
        },
        "data_issues": {
            "condition": lambda r: any(
                t.score.data_accuracy < 15 for t in r.test_results.values()
            ),
            "strategies": [OptimizationStrategy.DATA_EXTRACTION, OptimizationStrategy.SEARCH_ENHANCEMENT]
        }
    }

    def __init__(self, config: OptimizationConfig = None):
        self.config = config or OptimizationConfig()
        self.state = OptimizationState()

        # 初始化组件
        self.loader = TestCaseLoader(self.config.test_dir)
        self.evaluator = MultiTestEvaluator(self.config.test_dir)

        # 初始化优化状态管理器
        self.optimization_manager = OptimizationStateManager(
            config_path=Path(self.config.output_dir) / "optimization_config.json"
        )

        # 加载测试用例
        self.tests = self.loader.load_all_tests()
        print(f"[Init] Loaded {len(self.tests)} test cases")

        # 创建输出目录
        self.output_path = Path(self.config.output_dir)
        self.output_path.mkdir(exist_ok=True, parents=True)

    def run(self, workflow_runner: Callable[[str], str] = None) -> EvaluationReport:
        """
        运行优化循环

        Args:
            workflow_runner: 工作流执行函数，输入问题，输出答案

        Returns:
            最终评估报告
        """
        self.state.start_time = datetime.now().isoformat()
        print(f"\n{'='*60}")
        print(f"优化循环开始")
        print(f"目标: 拟合分≥{self.config.target_fitting_score}, "
              f"泛化分≥{self.config.target_generalization_score}, "
              f"过拟合风险≤{self.config.max_overfit_risk}")
        print(f"{'='*60}\n")

        try:
            # Phase 1: 基线评估
            self.state.phase = OptimizationPhase.BASELINE
            print("[Phase 1] Running baseline evaluation...")
            baseline_report = self._run_full_evaluation(workflow_runner)
            self.state.current_report = baseline_report
            self.state.best_report = baseline_report
            self._record_iteration("baseline", baseline_report)

            # 检查是否已达标
            if baseline_report.target_achieved:
                print("[Success] Target achieved in baseline evaluation!")
                self.state.phase = OptimizationPhase.COMPLETED
                return baseline_report

            # Phase 2: 优化迭代
            self.state.phase = OptimizationPhase.OPTIMIZING
            while self._should_continue():
                self.state.iteration += 1
                print(f"\n[Iteration {self.state.iteration}] Starting optimization...")

                # 选择优化策略
                strategies = self._select_strategies()
                if not strategies:
                    print("[Warning] No applicable optimization strategies found")
                    break

                print(f"[Strategies] Selected: {[s.value for s in strategies]}")

                # 应用优化策略
                if self.config.auto_modify:
                    self._apply_strategies(strategies)

                # 重新评估
                self.state.phase = OptimizationPhase.VALIDATING
                new_report = self._run_full_evaluation(workflow_runner)
                self.state.current_report = new_report

                # 决定是否保留修改
                if self._should_keep_modification(new_report):
                    print(f"[Keep] Modification accepted")
                    self.state.best_report = new_report
                    self._record_iteration("accepted", new_report, strategies)
                else:
                    print(f"[Reject] Modification rejected")
                    self._record_iteration("rejected", new_report, strategies)
                    # 可以选择回滚修改

                # 检查是否达标
                if new_report.target_achieved:
                    print("[Success] Target achieved!")
                    self.state.phase = OptimizationPhase.COMPLETED
                    break

            # 最终报告
            if self.state.phase != OptimizationPhase.COMPLETED:
                self.state.phase = OptimizationPhase.COMPLETED if self.state.best_report.target_achieved else OptimizationPhase.FAILED

        except Exception as e:
            print(f"[Error] Optimization failed: {e}")
            traceback.print_exc()
            self.state.phase = OptimizationPhase.FAILED

        finally:
            self.state.end_time = datetime.now().isoformat()
            self._save_final_report()

        return self.state.best_report

    def _run_full_evaluation(
        self,
        workflow_runner: Callable[[str], str] = None
    ) -> EvaluationReport:
        """运行完整评估"""
        results = {}

        for test_id, test_case in self.tests.items():
            print(f"  [Running] {test_id}: {test_case.company_name}...")

            # 获取实际输出
            if workflow_runner:
                actual_output = workflow_runner(test_case.question)
            else:
                # 使用模拟输出进行测试
                actual_output = self._mock_workflow_output(test_case)

            # 评估单个测试用例
            result = self.evaluator.evaluate_single(
                test_id=test_id,
                question=test_case.question,
                expected_answer=test_case.expected_answer,
                actual_output=actual_output,
                company_name=test_case.company_name
            )
            results[test_id] = result

            print(f"    Score: {result.score.total} ({'PASS' if result.is_passed else 'FAIL'})")

        # 计算综合分数
        report = self.evaluator.compute_comprehensive_scores(results)
        self._print_report_summary(report)

        return report

    def _mock_workflow_output(self, test_case: TestCase) -> str:
        """模拟工作流输出（用于测试）"""
        # 在实际运行时，应该调用真实的工作流
        # 这里返回一个简单的模拟输出

        output_parts = [
            f"# {test_case.company_name}投资分析报告",
            "",
            "## 投资摘要",
            f"**{test_case.company_name}是行业龙头企业，具备较强的竞争优势。**",
            "",
            "## 核心观点",
            "1. 行业地位稳固，市场份额持续提升",
            "2. 技术实力领先，研发投入持续加大",
            "3. 国际化布局加速，海外收入占比提升",
            "",
            "## 财务分析",
            "| 指标 | 2022A | 2023E |",
            "|------|-------|-------|",
            f"| 营收 | 100亿 | 120亿 |",
            f"| 净利润 | 10亿 | 15亿 |",
            "",
            "## 风险提示",
            "1. 行业周期波动风险",
            "2. 市场竞争加剧风险",
        ]

        return "\n".join(output_parts)

    def _select_strategies(self) -> List[OptimizationStrategy]:
        """选择优化策略"""
        strategies = []
        report = self.state.current_report

        if not report:
            return [OptimizationStrategy.PROMPT_REFINEMENT]

        for trigger_name, trigger_config in self.STRATEGY_TRIGGERS.items():
            if trigger_config["condition"](report):
                for strategy in trigger_config["strategies"]:
                    if strategy.value not in self.state.applied_strategies:
                        strategies.append(strategy)

        # 去重并限制数量
        strategies = list(dict.fromkeys(strategies))[:3]

        return strategies

    def _apply_strategies(self, strategies: List[OptimizationStrategy]):
        """应用优化策略"""
        for strategy in strategies:
            print(f"  [Applying] {strategy.value}")
            self._apply_single_strategy(strategy)
            self.state.applied_strategies.append(strategy.value)

    def _apply_single_strategy(self, strategy: OptimizationStrategy):
        """应用单个优化策略"""
        strategy_handlers = {
            OptimizationStrategy.PROMPT_REFINEMENT: self._refine_prompts,
            OptimizationStrategy.SEARCH_ENHANCEMENT: self._enhance_search,
            OptimizationStrategy.STRUCTURE_TEMPLATE: self._add_structure_template,
            OptimizationStrategy.DATA_EXTRACTION: self._improve_data_extraction,
            OptimizationStrategy.TIME_HANDLING: self._improve_time_handling,
            OptimizationStrategy.INDUSTRY_SWITCH: self._improve_industry_switch,
            OptimizationStrategy.OVERFIT_REDUCTION: self._reduce_overfitting,
        }

        handler = strategy_handlers.get(strategy)
        if handler:
            handler()
        else:
            print(f"    [Warning] No handler for strategy: {strategy.value}")

    def _refine_prompts(self):
        """优化提示词"""
        print("    - Enhancing prompt templates...")

        # Add more required sections to ensure comprehensive output
        additional_sections = [
            "核心观点", "投资建议", "数据来源"
        ]

        format_requirements = [
            "每个数据点必须标注年份",
            "关键指标必须列出具体数值",
            "对比数据必须使用表格"
        ]

        self.optimization_manager.apply_prompt_enhancement(
            sections=additional_sections,
            format_reqs=format_requirements
        )

        self.optimization_manager.record_strategy(
            "prompt_refinement",
            {"added_sections": additional_sections, "added_formats": format_requirements}
        )

    def _enhance_search(self):
        """增强搜索能力"""
        print("    - Improving search strategies...")

        # Increase max results for better coverage
        new_max = min(
            self.optimization_manager.state.search_enhancements.max_results + 5,
            20
        )

        self.optimization_manager.apply_search_enhancement(max_results=new_max)

        self.optimization_manager.record_strategy(
            "search_enhancement",
            {"new_max_results": new_max}
        )

    def _add_structure_template(self):
        """添加结构模板"""
        print("    - Adding report structure templates...")

        # Add industry-specific templates based on test results
        for industry, template in INDUSTRY_TEMPLATES.items():
            self.optimization_manager.add_structure_template(template)

        self.optimization_manager.record_strategy(
            "structure_template",
            {"added_templates": list(INDUSTRY_TEMPLATES.keys())}
        )

    def _improve_data_extraction(self):
        """改进数据提取"""
        print("    - Enhancing data extraction patterns...")

        # Add industry-specific keywords for better extraction
        industry_keywords = {
            "工程机械": ["挖掘机", "电动化", "市场份额", "海外收入", "起重机", "混凝土", "毛利"],
            "液压件": ["液压件", "泵阀", "国产替代", "油缸", "挖机配套"],
            "养猪": ["能繁母猪", "猪周期", "完全成本", "PSY", "出栏量", "饲料成本"],
            "眼科医疗": ["眼科", "屈光", "白内障", "视光", "连锁医院", "医师"]
        }

        self.optimization_manager.apply_prompt_enhancement(
            industry_keywords=industry_keywords
        )

        self.optimization_manager.record_strategy(
            "data_extraction",
            {"added_industry_keywords": list(industry_keywords.keys())}
        )

    def _improve_time_handling(self):
        """改进时间处理"""
        print("    - Adding time-aware context handling...")

        # Add time-related format requirements
        time_requirements = [
            "所有财务数据必须标注所属年份",
            "同比/环比数据必须明确基准期",
            "预测数据必须标注预测年份"
        ]

        self.optimization_manager.apply_prompt_enhancement(
            format_reqs=time_requirements
        )

        self.optimization_manager.record_strategy(
            "time_handling",
            {"added_time_requirements": time_requirements}
        )

    def _improve_industry_switch(self):
        """改进行业切换"""
        print("    - Enhancing industry-specific knowledge...")

        # Add all industry templates
        for industry, template in INDUSTRY_TEMPLATES.items():
            if template not in self.optimization_manager.state.structure_templates:
                self.optimization_manager.add_structure_template(template)

        self.optimization_manager.record_strategy(
            "industry_switch",
            {"templates_added": list(INDUSTRY_TEMPLATES.keys())}
        )

    def _reduce_overfitting(self):
        """降低过拟合"""
        print("    - Adding overfitting prevention rules...")

        # Add rules to prevent template rigidity
        anti_overfit_rules = [
            "不要机械复制模板格式",
            "行业分析需根据实际业务特点调整",
            "避免跨行业术语混用",
            "数据必须来自搜索结果，不可编造"
        ]

        self.optimization_manager.apply_prompt_enhancement(
            format_reqs=anti_overfit_rules
        )

        self.optimization_manager.record_strategy(
            "overfit_reduction",
            {"added_rules": anti_overfit_rules}
        )

    def _should_keep_modification(self, new_report: EvaluationReport) -> bool:
        """决定是否保留修改"""
        if not self.state.best_report:
            return True

        old_report = self.state.best_report

        # 检查过拟合风险
        if new_report.overfit_risk > self.config.max_overfit_risk:
            print(f"  [Reject Reason] Overfit risk too high: {new_report.overfit_risk}")
            return False

        # 检查泛化能力是否下降
        gen_drop = old_report.generalization_score - new_report.generalization_score
        if gen_drop > self.config.allowed_score_fluctuation:
            print(f"  [Reject Reason] Generalization score dropped: {gen_drop:.1f}")
            return False

        # 检查是否有实质提升
        fitting_improvement = new_report.fitting_score - old_report.fitting_score
        gen_improvement = new_report.generalization_score - old_report.generalization_score

        has_improvement = (
            fitting_improvement >= self.config.min_improvement or
            gen_improvement >= self.config.min_improvement or
            new_report.overfit_risk < old_report.overfit_risk - 5
        )

        return has_improvement

    def _should_continue(self) -> bool:
        """检查是否应继续优化"""
        if self.state.iteration >= self.config.max_iterations:
            print(f"[Stop] Max iterations reached: {self.config.max_iterations}")
            return False

        # 检查时间限制
        start = datetime.fromisoformat(self.state.start_time)
        elapsed_minutes = (datetime.now() - start).total_seconds() / 60
        if elapsed_minutes >= self.config.max_time_minutes:
            print(f"[Stop] Max time reached: {self.config.max_time_minutes} minutes")
            return False

        return True

    def _record_iteration(
        self,
        status: str,
        report: EvaluationReport,
        strategies: List[OptimizationStrategy] = None
    ):
        """记录迭代结果"""
        record = {
            "iteration": self.state.iteration,
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "fitting_score": report.fitting_score,
            "generalization_score": report.generalization_score,
            "overfit_risk": report.overfit_risk,
            "target_achieved": report.target_achieved,
            "strategies": [s.value for s in strategies] if strategies else []
        }
        self.state.history.append(record)

    def _print_report_summary(self, report: EvaluationReport):
        """打印报告摘要"""
        print(f"\n  [Summary]")
        print(f"    拟合分: {report.fitting_score:.1f}")
        print(f"    泛化分: {report.generalization_score:.1f}")
        print(f"    过拟合风险: {report.overfit_risk} ({report.risk_level.value})")
        print(f"    能力等级: Level {report.ability_level}")
        print(f"    Target achieved: {'YES' if report.target_achieved else 'NO'}")

    def _save_final_report(self):
        """保存最终报告"""
        report_path = self.output_path / f"final_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"

        # 生成Markdown报告
        md_content = self.evaluator.generate_report_markdown(self.state.best_report)

        # 添加优化历史
        md_content += "\n\n---\n\n## 优化历史\n\n"
        md_content += "| 迭代 | 状态 | 拟合分 | 泛化分 | 过拟合 | 策略 |\n"
        md_content += "|------|------|--------|--------|--------|------|\n"

        for record in self.state.history:
            strategies_str = ", ".join(record["strategies"][:2]) if record["strategies"] else "-"
            md_content += f"| {record['iteration']} | {record['status']} | {record['fitting_score']:.1f} | {record['generalization_score']:.1f} | {record['overfit_risk']} | {strategies_str} |\n"

        # 保存
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(md_content)

        print(f"\n[Report] Saved to: {report_path}")

        # 同时保存JSON版本
        json_path = report_path.with_suffix('.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump({
                "best_report": self.state.best_report.to_dict() if self.state.best_report else None,
                "history": self.state.history,
                "config": {
                    "target_fitting_score": self.config.target_fitting_score,
                    "target_generalization_score": self.config.target_generalization_score,
                    "max_overfit_risk": self.config.max_overfit_risk,
                    "iterations": self.state.iteration
                }
            }, f, ensure_ascii=False, indent=2)


def create_workflow_runner():
    """创建工作流执行器"""
    # 这里应该连接到实际的工作流引擎
    from workflow.engine import create_engine

    engine = create_engine()

    def run_workflow(question: str) -> str:
        result = engine.run(question)
        if result.status.value == "completed":
            return result.final_result.content
        else:
            return f"Error: {result.error}"

    return run_workflow


def main():
    """主函数 - 启动自动优化"""
    print("=" * 60)
    print("投研系统自动优化循环")
    print("=" * 60)

    # 配置
    config = OptimizationConfig(
        target_fitting_score=85.0,
        target_generalization_score=70.0,
        max_overfit_risk=30,
        max_iterations=10,
        auto_modify=False  # 首次运行只评估，不自动修改
    )

    # 创建优化循环
    loop = AutoOptimizationLoop(config)

    # 创建工作流执行器
    try:
        workflow_runner = create_workflow_runner()
    except Exception as e:
        print(f"[Warning] Could not create workflow runner: {e}")
        print("[Info] Using mock workflow for testing...")
        workflow_runner = None

    # 运行优化
    final_report = loop.run(workflow_runner)

    # 输出最终结果
    print("\n" + "=" * 60)
    print("优化完成")
    print("=" * 60)
    print(f"最终拟合分: {final_report.fitting_score:.1f}")
    print(f"最终泛化分: {final_report.generalization_score:.1f}")
    print(f"过拟合风险: {final_report.overfit_risk}")
    print(f"能力等级: Level {final_report.ability_level}")
    print(f"目标达成: {'是' if final_report.target_achieved else '否'}")


if __name__ == "__main__":
    main()