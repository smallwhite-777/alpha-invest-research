"""
启动真实工作流的优化循环
"""

import sys
from pathlib import Path

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from evaluation.auto_optimization_loop import AutoOptimizationLoop, OptimizationConfig


def create_real_workflow_runner():
    """创建真实的工作流执行器"""
    from workflow.engine import create_engine

    engine = create_engine(
        llm_provider=None,  # 使用默认配置
        on_progress=lambda step, status: None  # 静默模式
    )

    def run_workflow(question: str) -> str:
        """执行工作流并返回结果"""
        try:
            result = engine.run(question)
            if result.status.value == "completed":
                return result.final_result.content
            else:
                return f"Error: {result.error}"
        except Exception as e:
            return f"Workflow error: {str(e)}"

    return run_workflow


def main():
    """主函数"""
    print("=" * 60)
    print("投研系统自动优化循环 - 真实工作流模式")
    print("=" * 60)
    print()

    # 配置优化参数
    config = OptimizationConfig(
        target_fitting_score=85.0,
        target_generalization_score=70.0,
        max_overfit_risk=30,
        max_iterations=10,
        max_time_minutes=60,
        auto_modify=True,  # Enable actual optimization
        test_dir=str(project_root / "test"),
        output_dir=str(project_root / "optimization_results")
    )

    # 创建优化循环
    loop = AutoOptimizationLoop(config)

    # 创建真实的工作流执行器
    print("[Init] Creating workflow runner...")
    try:
        workflow_runner = create_real_workflow_runner()
        print("[Init] Workflow runner created successfully")
    except Exception as e:
        print(f"[Error] Failed to create workflow runner: {e}")
        print("[Info] Exiting...")
        return

    # 运行优化
    print()
    print("[Start] Running optimization loop...")
    print()
    report = loop.run(workflow_runner)

    # 输出最终结果
    print()
    print("=" * 60)
    print("优化完成")
    print("=" * 60)
    if report:
        print(f"最终拟合分: {report.fitting_score:.1f} (目标: >=85)")
        print(f"最终泛化分: {report.generalization_score:.1f} (目标: >=70)")
        print(f"过拟合风险: {report.overfit_risk} (目标: <=30)")
        print(f"能力等级: Level {report.ability_level}")
        print(f"目标达成: {'是' if report.target_achieved else '否'}")
        print()
        print(f"详细报告已保存到: {config.output_dir}")
    else:
        print("未能生成报告")


if __name__ == "__main__":
    main()