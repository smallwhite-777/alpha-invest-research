"""
多测试用例综合评估器
支持7个测试用例的综合评估，计算拟合分、泛化分、过拟合风险
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class TestGroup(Enum):
    """测试用例分组"""
    ANCHOR = "anchor"           # 锚点任务 (Q1, Q7)
    SAME_TYPE = "same_type"     # 同类迁移 (Q2, Q6)
    CROSS_INDUSTRY = "cross"    # 跨行业迁移 (Q3, Q4)
    TIME_DISTURB = "time"       # 时间扰动 (Q5)


class RiskLevel(Enum):
    """过拟合风险等级"""
    LOW = "低风险"
    MEDIUM = "中风险"
    HIGH = "高风险"


@dataclass
class DimensionScore:
    """维度得分"""
    structure: int = 0          # 结构完整性 (满分20)
    core_viewpoint: int = 0     # 核心观点准确性 (满分25)
    data_accuracy: int = 0      # 数据引用正确性 (满分20)
    industry_variable: int = 0  # 行业变量正确性 (满分20)
    time_accuracy: int = 0      # 时间态准确性 (满分15)
    overfit_penalty: int = 0    # 过拟合扣分

    @property
    def total(self) -> int:
        return (self.structure + self.core_viewpoint +
                self.data_accuracy + self.industry_variable +
                self.time_accuracy - self.overfit_penalty)


@dataclass
class TestCaseResult:
    """单个测试用例结果"""
    test_id: str
    question: str
    expected_answer: str
    actual_output: str
    score: DimensionScore
    is_passed: bool
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EvaluationReport:
    """综合评估报告"""
    # 各测试用例结果
    test_results: Dict[str, TestCaseResult] = field(default_factory=dict)

    # 三项能力指标
    fitting_score: float = 0.0          # 拟合分
    generalization_score: float = 0.0   # 泛化分
    overfit_risk: int = 0               # 过拟合风险分
    risk_level: RiskLevel = RiskLevel.LOW

    # 能力等级
    ability_level: int = 0

    # 是否达到目标
    target_achieved: bool = False

    def to_dict(self) -> Dict:
        return {
            "fitting_score": self.fitting_score,
            "generalization_score": self.generalization_score,
            "overfit_risk": self.overfit_risk,
            "risk_level": self.risk_level.value,
            "ability_level": self.ability_level,
            "target_achieved": self.target_achieved,
            "test_results": {
                tid: {
                    "total_score": r.score.total,
                    "is_passed": r.is_passed,
                    "details": r.details
                }
                for tid, r in self.test_results.items()
            }
        }


class MultiTestEvaluator:
    """多测试用例综合评估器"""

    # 九大标准章节
    STANDARD_SECTIONS = [
        "投资摘要", "评级", "目标价",
        "行业概况", "市场规模",
        "行业周期",
        "公司介绍", "主营业务",
        "竞争优势",
        "财务分析",
        "盈利预测",
        "估值分析",
        "风险提示"
    ]

    # 各行业必须变量
    INDUSTRY_VARIABLES = {
        "工程机械": ["挖掘机", "电动化", "市场份额", "海外收入", "起重机", "混凝土"],
        "液压件": ["液压件", "泵阀", "国产替代", "油缸", "挖机配套"],
        "养猪": ["能繁母猪", "猪周期", "完全成本", "PSY", "出栏量", "饲料成本"],
        "眼科医疗": ["眼科", "屈光", "白内障", "视光", "连锁医院", "医师"]
    }

    # 跨行业禁止词汇
    FORBIDDEN_WORDS = {
        "牧原股份": ["基建", "挖掘机", "工程机械", "电动化", "混凝土", "起重机", "搅拌车", "卡特彼勒"],
        "爱尔眼科": ["基建", "挖掘机", "工程机械", "电动化", "混凝土", "卡特彼勒", "挖机"]
    }

    # 行业特征词（可能错误迁移）
    INDUSTRY_SIGNATURES = {
        "三一重工": ["电动搅拌车62%", "电动起重机93.5%", "新能源重卡17.3%"],
        "工程机械": ["挖机销量", "电动化渗透率"]
    }

    # 标准数据点
    STANDARD_DATA = {
        "Q1": {
            "三一重工": {
                "目标价": "19.70",
                "评级": "跑赢行业",
                "电动起重机份额": "93.5%",
                "电动搅拌车份额": "62%",
                "新能源重卡份额": "17.3%"
            }
        },
        "Q2": {
            "恒立液压": {
                "营收2021": "93.1亿",
                "净利润2021": "24.9亿",
                "毛利率": "43.8%"
            }
        },
        "Q3": {
            "牧原股份": {
                "出栏量2022": "~6100万头",
                "完全成本": "~15.7元/kg",
                "PSY": "~24头"
            }
        }
    }

    def __init__(self, test_dir: str = "test"):
        self.test_dir = Path(test_dir)

    def evaluate_single(
        self,
        test_id: str,
        question: str,
        expected_answer: str,
        actual_output: str,
        company_name: str = ""
    ) -> TestCaseResult:
        """评估单个测试用例"""

        score = DimensionScore()
        details = {}

        # 1. 结构完整性评估 (20分)
        score.structure, structure_details = self._evaluate_structure(actual_output)
        details["structure"] = structure_details

        # 2. 核心观点准确性评估 (25分)
        score.core_viewpoint, core_details = self._evaluate_core_viewpoint(
            actual_output, expected_answer
        )
        details["core_viewpoint"] = core_details

        # 3. 数据引用正确性评估 (20分)
        score.data_accuracy, data_details = self._evaluate_data_accuracy(
            actual_output, test_id
        )
        details["data_accuracy"] = data_details

        # 4. 行业变量正确性评估 (20分)
        score.industry_variable, var_details = self._evaluate_industry_variables(
            actual_output, company_name
        )
        details["industry_variable"] = var_details

        # 5. 时间态准确性评估 (15分) - 仅对Q5
        if test_id == "Q5":
            score.time_accuracy, time_details = self._evaluate_time_accuracy(actual_output)
            details["time_accuracy"] = time_details
        else:
            score.time_accuracy = 15  # 其他测试默认满分

        # 6. 过拟合检测
        score.overfit_penalty, overfit_details = self._detect_overfitting(
            actual_output, company_name, test_id
        )
        details["overfitting"] = overfit_details

        is_passed = score.total >= 70

        return TestCaseResult(
            test_id=test_id,
            question=question,
            expected_answer=expected_answer,
            actual_output=actual_output,
            score=score,
            is_passed=is_passed,
            details=details
        )

    def _evaluate_structure(self, output: str) -> Tuple[int, Dict]:
        """评估结构完整性"""
        found_sections = []
        for section in self.STANDARD_SECTIONS:
            if section in output:
                found_sections.append(section)

        count = len(found_sections)

        if count >= 9:
            score = 20
        elif count >= 7:
            score = 17
        elif count >= 5:
            score = 13
        elif count >= 3:
            score = 8
        else:
            score = min(count * 2, 4)

        return score, {
            "found_count": count,
            "found_sections": found_sections[:10]
        }

    def _evaluate_core_viewpoint(
        self, output: str, expected: str
    ) -> Tuple[int, Dict]:
        """评估核心观点准确性"""
        # 提取预期答案中的核心观点关键词
        expected_keywords = self._extract_keywords(expected)
        output_keywords = self._extract_keywords(output)

        # 计算关键词覆盖率
        if expected_keywords:
            coverage = len(output_keywords & expected_keywords) / len(expected_keywords)
        else:
            coverage = 0.5

        # 检查是否有明确的观点陈述
        has_viewpoint = any(kw in output for kw in
            ["核心观点", "投资建议", "评级", "推荐", "看好", "维持"])

        # 检查逻辑结构
        has_logic = any(kw in output for kw in
            ["因为", "由于", "因此", "所以", "基于", "鉴于"])

        details = {
            "keyword_coverage": f"{coverage:.1%}",
            "has_viewpoint": has_viewpoint,
            "has_logic": has_logic
        }

        if coverage >= 0.7 and has_viewpoint and has_logic:
            score = 23
        elif coverage >= 0.5 and has_viewpoint:
            score = 18
        elif coverage >= 0.3:
            score = 13
        elif has_viewpoint:
            score = 10
        else:
            score = 5

        return min(score, 25), details

    def _evaluate_data_accuracy(
        self, output: str, test_id: str
    ) -> Tuple[int, Dict]:
        """评估数据引用正确性"""
        # 提取输出中的数字
        numbers = re.findall(r'(\d+\.?\d*)\s*(亿|万|元|%|头|公斤|台)', output)

        details = {
            "numbers_found": len(numbers),
            "sample_numbers": numbers[:5] if numbers else []
        }

        # 基础分数
        if len(numbers) >= 5:
            score = 16
        elif len(numbers) >= 3:
            score = 12
        elif len(numbers) >= 1:
            score = 8
        else:
            score = 3

        return min(score, 20), details

    def _evaluate_industry_variables(
        self, output: str, company_name: str
    ) -> Tuple[int, Dict]:
        """评估行业变量正确性"""
        # 确定行业
        industry = self._get_industry(company_name)

        if not industry:
            return 15, {"industry": "unknown"}

        # 检查行业变量出现情况
        required_vars = self.INDUSTRY_VARIABLES.get(industry, [])
        found_vars = [v for v in required_vars if v in output]

        coverage = len(found_vars) / len(required_vars) if required_vars else 0.5

        details = {
            "industry": industry,
            "required_vars": required_vars,
            "found_vars": found_vars,
            "coverage": f"{coverage:.1%}"
        }

        if coverage >= 0.7:
            score = 18
        elif coverage >= 0.5:
            score = 14
        elif coverage >= 0.3:
            score = 10
        else:
            score = 6

        return min(score, 20), details

    def _evaluate_time_accuracy(self, output: str) -> Tuple[int, Dict]:
        """评估时间态准确性（Q5专用）"""
        # 检查是否使用了2022年及之后的数据
        forbidden_years = re.findall(r'202[2-9]', output)

        # 检查是否正确使用2021年数据
        correct_years = re.findall(r'2021', output)

        # 检查禁止内容
        forbidden_content = []
        if "2022年营收808亿" in output:
            forbidden_content.append("2022年营收808亿")
        if "2022年净利润43亿" in output:
            forbidden_content.append("2022年净利润43亿")
        if "下降64.5%" in output:
            forbidden_content.append("下降64.5%")

        details = {
            "forbidden_years_found": forbidden_years,
            "correct_years_found": len(correct_years),
            "forbidden_content": forbidden_content
        }

        if forbidden_content or forbidden_years:
            score = max(0, 15 - len(forbidden_content) * 5 - len(forbidden_years) * 2)
        elif correct_years:
            score = 15
        else:
            score = 10

        return score, details

    def _detect_overfitting(
        self, output: str, company_name: str, test_id: str
    ) -> Tuple[int, Dict]:
        """检测过拟合"""
        penalty = 0
        violations = []

        # 检查禁止词汇
        forbidden = self.FORBIDDEN_WORDS.get(company_name, [])
        for word in forbidden:
            if word in output:
                penalty += 2
                violations.append(f"禁止词: {word}")

        # 检查行业特征词残留
        for source_company, signatures in self.INDUSTRY_SIGNATURES.items():
            if company_name and source_company not in company_name:
                for sig in signatures:
                    if sig in output:
                        penalty += 1
                        violations.append(f"行业残留: {sig}")

        # 检查跨行业任务中的模板僵化
        if test_id in ["Q3", "Q4"]:
            # 检查是否机械复制工程机械框架
            mechanical_keywords = ["电动化是主要趋势", "老牌龙头优势延续"]
            for kw in mechanical_keywords:
                if kw in output:
                    penalty += 3
                    violations.append(f"模板僵化: {kw}")

        return penalty, {
            "penalty": penalty,
            "violations": violations
        }

    def _extract_keywords(self, text: str) -> set:
        """提取关键词"""
        # 简单的关键词提取
        keywords = set()

        # 提取公司名、行业词
        patterns = [
            r'([\u4e00-\u9fff]{2,6}(股份|集团|公司))',
            r'(电动化|国际化|市场份额|竞争优势|龙头|周期|成本|估值)',
            r'(买入|增持|跑赢|中性|卖出)'
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if isinstance(match, tuple):
                    keywords.add(match[0])
                else:
                    keywords.add(match)

        return keywords

    def _get_industry(self, company_name: str) -> Optional[str]:
        """根据公司名判断行业"""
        if not company_name:
            return None

        if any(kw in company_name for kw in ["三一", "徐工", "工程机械"]):
            return "工程机械"
        elif "恒立" in company_name or "液压" in company_name:
            return "液压件"
        elif "牧原" in company_name or "养殖" in company_name:
            return "养猪"
        elif "爱尔" in company_name or "眼科" in company_name:
            return "眼科医疗"

        return None

    def compute_comprehensive_scores(
        self,
        results: Dict[str, TestCaseResult]
    ) -> EvaluationReport:
        """计算综合评估分数"""
        report = EvaluationReport()
        report.test_results = results

        # 1. 计算拟合分 = (Q1得分 + Q7得分) / 2
        q1_score = results.get("Q1", TestCaseResult("", "", "", "", DimensionScore(), False)).score.total
        q7_score = results.get("Q7", TestCaseResult("", "", "", "", DimensionScore(), False)).score.total
        report.fitting_score = (q1_score + q7_score) / 2

        # 2. 计算泛化分
        # 同类迁移分 = (Q2得分 + Q6得分) / 2
        q2_score = results.get("Q2", TestCaseResult("", "", "", "", DimensionScore(), False)).score.total
        q6_score = results.get("Q6", TestCaseResult("", "", "", "", DimensionScore(), False)).score.total
        same_type_score = (q2_score + q6_score) / 2

        # 跨行业迁移分 = (Q3得分 + Q4得分) / 2
        q3_score = results.get("Q3", TestCaseResult("", "", "", "", DimensionScore(), False)).score.total
        q4_score = results.get("Q4", TestCaseResult("", "", "", "", DimensionScore(), False)).score.total
        cross_industry_score = (q3_score + q4_score) / 2

        # 时间扰动分 = Q5得分
        q5_score = results.get("Q5", TestCaseResult("", "", "", "", DimensionScore(), False)).score.total

        report.generalization_score = (
            same_type_score * 0.5 +
            cross_industry_score * 0.3 +
            q5_score * 0.2
        )

        # 3. 计算过拟合风险
        total_penalty = sum(
            r.score.overfit_penalty for r in results.values()
        )
        report.overfit_risk = total_penalty

        # 确定风险等级
        if total_penalty <= 15:
            report.risk_level = RiskLevel.LOW
        elif total_penalty <= 30:
            report.risk_level = RiskLevel.MEDIUM
        else:
            report.risk_level = RiskLevel.HIGH

        # 4. 计算能力等级
        if report.fitting_score >= 90 and report.generalization_score >= 90 and total_penalty < 15:
            report.ability_level = 5  # 专家
        elif report.generalization_score >= 85:
            report.ability_level = 4  # 精通
        elif report.generalization_score >= 70:
            report.ability_level = 3  # 迁移
        elif report.fitting_score >= 85:
            report.ability_level = 2  # 熟练
        elif report.fitting_score >= 70:
            report.ability_level = 1  # 入门
        else:
            report.ability_level = 0  # 未达标

        # 5. 判断是否达到目标
        # 目标：拟合分>=85, 泛化分>=70, 过拟合风险<=30
        report.target_achieved = (
            report.fitting_score >= 85 and
            report.generalization_score >= 70 and
            report.overfit_risk <= 30
        )

        return report

    def generate_report_markdown(self, report: EvaluationReport) -> str:
        """生成Markdown格式的评估报告"""
        lines = [
            "# 综合评估报告",
            "",
            f"**评估日期**: {self._get_current_date()}",
            "",
            "---",
            "",
            "## 三项能力指标",
            "",
            f"| 指标 | 分数 | 目标 | 状态 |",
            f"|------|------|------|------|",
            f"| 拟合分 | {report.fitting_score:.1f} | >=85 | {'OK' if report.fitting_score >= 85 else 'X'} |",
            f"| 泛化分 | {report.generalization_score:.1f} | >=70 | {'OK' if report.generalization_score >= 70 else 'X'} |",
            f"| 过拟合风险 | {report.overfit_risk} | <=30 | {'OK' if report.overfit_risk <= 30 else 'X'} |",
            "",
            f"**风险等级**: {report.risk_level.value}",
            f"**能力等级**: Level {report.ability_level}",
            "",
            "---",
            "",
            "## 各测试用例得分",
            "",
            "| 编号 | 总分 | 结构 | 观点 | 数据 | 行业 | 时间 | 过拟合 | 通过 |",
            "|------|------|------|------|------|------|------|--------|------|",
        ]

        for tid in ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"]:
            if tid in report.test_results:
                r = report.test_results[tid]
                lines.append(
                    f"| {tid} | {r.score.total} | {r.score.structure} | "
                    f"{r.score.core_viewpoint} | {r.score.data_accuracy} | "
                    f"{r.score.industry_variable} | {r.score.time_accuracy} | "
                    f"-{r.score.overfit_penalty} | {'OK' if r.is_passed else 'X'} |"
                )

        lines.extend([
            "",
            "---",
            "",
            f"## 结论",
            "",
            f"**目标达成**: {'YES' if report.target_achieved else 'NO'}",
            "",
            "### 改进建议",
            ""
        ])

        # 根据结果生成改进建议
        if report.fitting_score < 85:
            lines.append("1. 需要提升锚点任务的拟合能力，加强对标准报告结构的学习")
        if report.generalization_score < 70:
            lines.append("2. 需要提升迁移能力，加强对不同行业、不同公司研究框架的理解")
        if report.overfit_risk > 15:
            lines.append("3. 需要降低过拟合风险，避免行业术语泄漏和模板僵化")

        return "\n".join(lines)

    def _get_current_date(self) -> str:
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M")