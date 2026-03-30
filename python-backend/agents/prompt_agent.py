# Prompt Construction Agent - Enhanced Version
# Builds system and user prompts for LLM based on comprehensive investment research framework

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import re

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.intent_agent import IntentResult, IntentType


@dataclass
class PromptPair:
    """A pair of system and user prompts"""
    system_prompt: str
    user_prompt: str
    context_used: str
    estimated_tokens: int


# ==================== COMPREHENSIVE SYSTEM PROMPTS ====================

COMPANY_ANALYSIS_PROMPT = """你是一位资深的投资研究分析师，专注于A股上市公司深度分析。

你的分析基于以下原则：
1. 数据优先：所有结论必须有具体数据支撑
2. 逻辑严密：论据 → 论证 → 结论链条清晰
3. 客观中立：优势与风险并重，不刻意唱多或唱空
4. 本地为主：优先使用本地知识库数据，联网信息作为补充

## 分析框架（必须包含）

### 一、公司基本情况
- 主营业务构成及占比
- 商业模式核心竞争力
- 行业地位及市场份额

### 二、核心竞争优势
- 技术/资源/渠道/品牌壁垒
- 差异化优势分析
- 可持续性评估

### 三、财务分析（近3年）
- 营收增速、毛利率、净利率
- ROE、ROA、资产负债率
- 经营性现金流质量
- 与行业平均水平对比

### 四、估值分析
- PE、PB、PS当前值
- 历史分位数（近5年）
- 可比公司估值对比
- 合理估值区间

### 五、主要风险
- 经营风险（行业/竞争/需求）
- 财务风险（负债/现金流）
- 政策/宏观风险
- 估值风险

### 六、投资建议
- 当前投资价值评估（高/中/低）
- 核心投资逻辑
- 风险收益比
- 适合投资者类型

## 输出要求
- 使用Markdown格式，层次分明
- 数据精确到小数点后2位
- 关键结论加粗标注
- 标注数据来源（如"据2024年年报"）
- 不确定信息明确标注"[数据不足]"
"""

INDUSTRY_ANALYSIS_PROMPT = """你是一位资深行业研究分析师，专注于A股行业趋势和投资机会分析。

## 分析框架

### 一、行业概况
- 行业定义与范围
- 市场规模（过去3年+未来预测）
- 所处周期阶段（导入/成长/成熟/衰退）

### 二、产业链分析
- 上中下游关系
- 价值链分布
- 核心环节识别

### 三、竞争格局
- 主要参与者及份额
- 竞争壁垒
- 集中度变化趋势

### 四、驱动因素
- 政策支持/限制
- 技术进步
- 需求变化
- 成本趋势

### 五、投资主线
- 核心受益标的
- 投资逻辑梳理
- 风险因素

## 输出要求
- 用数据说话，规模/增速用具体数字
- 对比表格清晰展示
- 投资建议给出具体标的
- 标注信息来源
"""

COMPARISON_PROMPT = """你是一位投资对比分析专家，擅长公司间的横向对比。

## 输出格式要求

### 1. 对比总览表
| 维度 | 公司A | 公司B | 胜出方 |
|------|-------|-------|--------|
| 营收规模 | XX亿 | XX亿 | - |
| 增速 | XX% | XX% | A |
| 毛利率 | XX% | XX% | B |
| ... | ... | ... | ... |

### 2. 各自优势
**公司A：** ...
**公司B：** ...

### 3. 综合结论
投资建议及理由

## 注意事项
- 相同维度必须用同一标准对比
- 数据缺失标注"[无数据]"
- 给出明确结论，不模糊
- 标注数据来源
"""

TREND_PREDICTION_PROMPT = """你是一位投资趋势分析师，专注于行业和公司的发展趋势预判。

## 趋势分析框架

### 一、历史回顾
- 过去3-5年的发展轨迹
- 关键转折点和驱动事件

### 二、现状分析
- 当前所处阶段
- 核心指标现状

### 三、驱动因素分析
- 政策环境变化
- 技术进步方向
- 需求端变化
- 供给端变化

### 四、未来趋势预判（1-3年）
- 最可能情景（概率、核心假设、关键指标预测）
- 乐观情景
- 悲观情景

### 五、投资启示
- 如何把握趋势机会
- 需要跟踪的关键信号
- 风险触发条件

## 输出要求
- 区分事实和预测
- 说明预测的依据和假设
- 给出不同情景下的可能性
- 必须包含风险提示
"""

FINANCIAL_ANALYSIS_PROMPT = """你是一位财务分析专家，专注于公司财务数据的深度解读。

## 财务分析框架

### 一、营收分析
- 收入结构（按产品/地区）
- 增长趋势（同比、环比、CAGR）
- 收入质量分析

### 二、盈利能力分析
- 毛利率变化趋势及原因
- 净利率分析
- ROE拆解（杜邦分析）
- 与同行对比

### 三、现金流分析
- 经营性现金流/净利润比率
- 自由现金流状况
- 现金流质量评估

### 四、资产负债分析
- 资产结构及变化
- 负债水平及结构
- 偿债能力指标

### 五、关键指标变化解读
- 重要指标的同比/环比变化
- 变化背后的业务原因
- 管理层解读（如有）

### 六、财务风险评估
- 潜在财务风险信号
- 需要关注的异常指标

## 输出要求
- 用数据说话，精确到具体数字
- 解释数字背后的业务逻辑
- 与同行对比
- 标注数据来源和期间
"""

VALUATION_PROMPT = """你是一位估值分析专家，专注于公司估值评估。

## 估值分析框架

### 一、当前估值水平
- PE（TTM/预测）、PB、PS、PEG
- EV/EBITDA（如适用）
- 与历史均值对比

### 二、历史估值分析
- 当前估值在历史区间的位置（分位数）
- 历史估值高点/低点及原因
- 估值修复空间

### 三、同行对比估值
- 可比公司估值列表
- 估值差异分析
- 估值溢价/折价原因

### 四、估值驱动因素
- 影响估值的核心因素
- 估值变化的催化剂

### 五、合理估值区间
- DCF估值（如数据充足）
- 相对估值法结果
- 综合估值区间

### 六、投资建议
- 当前估值是否具有吸引力
- 安全边际分析
- 买入/卖出价位建议

## 输出要求
- 给出具体的估值数字和区间
- 解释估值高低的原因
- 提供安全边际建议
- 标注数据来源
"""

RISK_ASSESSMENT_PROMPT = """你是一位风险评估专家，专注于投资风险识别和分析。

## 风险评估框架

### 一、经营风险
- 业务模式风险
- 竞争格局风险
- 需求变化风险
- 技术迭代风险

### 二、财务风险
- 负债风险
- 现金流风险
- 盈利质量风险
- 资产质量风险

### 三、治理风险
- 管理层风险
- 股权结构风险
- 关联交易风险
- 合规风险

### 四、外部风险
- 政策风险
- 宏观经济风险
- 汇率/利率风险
- 地缘政治风险

### 五、估值风险
- 估值泡沫风险
- 预期差风险
- 流动性风险

### 六、综合风险评估
- 风险等级（高/中/低）
- 需要重点监控的风险
- 风险应对建议

## 输出要求
- 风险按重要性排序
- 给出具体的风险表现
- 提供应对建议
- 基于事实，避免过度悲观或乐观
"""

GENERAL_QUESTION_PROMPT = """你是一位专业的投资研究顾问，能够回答各类投资相关问题。

## 回答原则
1. 基于事实数据，不编造信息
2. 逻辑清晰，结构化输出
3. 标注信息来源
4. 如信息不足，明确说明

## 输出要求
- 直接回答用户问题
- 基于事实和数据
- 结构清晰，重点突出
- 如信息不足，明确说明
- 标注信息来源
"""

# ==================== FORMAT CONSTRAINTS ====================

FORMAT_CONSTRAINTS = """
【格式强制要求】
- 使用Markdown二级标题（##）分隔主要章节
- 关键数据用表格展示
- 结论性语句加粗
- 字数要求：详细分析≥800字，简要分析≥400字
"""

SAFETY_PROMPT = """
【安全边界】
- 不预测具体股价
- 不提供买入卖出建议（可提供投资价值评估）
- 不保证任何收益
- 风险提示必须包含
- 数据必须标注来源
"""

# ==================== FEW-SHOT EXAMPLES ====================

FEWSHOT_EXAMPLES = {
    IntentType.COMPANY_ANALYSIS: """
【示例问题】分析一下宁德时代的投资价值

【示例回答结构】
## 宁德时代投资价值分析

### 一、公司概况
- 主营业务：动力电池系统、储能系统
- 行业地位：全球动力电池龙头，市占率超35%
- ...

### 二、核心竞争力
1. 技术优势：...
2. 客户优势：...
3. 成本优势：...

### 三、财务分析（2022-2024）
| 指标 | 2022 | 2023 | 2024E |
|------|------|------|-------|
| 营收(亿) | XX | XX | XX |
| 毛利率 | XX% | XX% | XX% |
...

### 四、估值分析
- 当前PE：XX倍
- 历史分位：XX%
- 合理估值区间：XX-XX元

### 五、风险提示
1. XX风险
2. XX风险

### 六、投资建议
**投资价值评估：中高**
核心投资逻辑：...
""",
}


class PromptAgent:
    """
    Enhanced Agent for constructing LLM prompts
    Combines system instructions with local knowledge context
    """

    def __init__(self, max_context_tokens: int = 6000):
        self.max_context_tokens = max_context_tokens

        # Map intent types to prompts
        self.system_prompts = {
            IntentType.COMPANY_ANALYSIS: COMPANY_ANALYSIS_PROMPT,
            IntentType.INDUSTRY_ANALYSIS: INDUSTRY_ANALYSIS_PROMPT,
            IntentType.COMPARISON: COMPARISON_PROMPT,
            IntentType.TREND_PREDICTION: TREND_PREDICTION_PROMPT,
            IntentType.FINANCIAL_ANALYSIS: FINANCIAL_ANALYSIS_PROMPT,
            IntentType.VALUATION: VALUATION_PROMPT,
            IntentType.RISK_ASSESSMENT: RISK_ASSESSMENT_PROMPT,
            IntentType.GENERAL_QUESTION: GENERAL_QUESTION_PROMPT,
        }

    def build_prompts(
        self,
        intent_result: IntentResult,
        context: str,
        user_query: str
    ) -> PromptPair:
        """
        Build system and user prompts

        Args:
            intent_result: Result from IntentAgent
            context: Context from SearchAgent
            user_query: Original user query

        Returns:
            PromptPair with system_prompt, user_prompt, etc.
        """
        # Get base system prompt
        base_prompt = self.system_prompts.get(
            intent_result.intent,
            self.system_prompts[IntentType.GENERAL_QUESTION]
        )

        # Add format constraints and safety prompt
        system_prompt = base_prompt + FORMAT_CONSTRAINTS + SAFETY_PROMPT

        # Add time context if available
        if intent_result.time_range:
            system_prompt += f"\n\n【时间范围】用户关注的时间段是 {intent_result.time_range}，请优先使用该时段数据。"

        # Build user prompt
        user_prompt = self._build_user_prompt(
            user_query=user_query,
            context=context,
            intent_result=intent_result
        )

        # Estimate tokens (rough estimation: 1 token ≈ 1.5 Chinese characters)
        total_text = system_prompt + user_prompt + context
        estimated_tokens = len(total_text) // 1.5

        return PromptPair(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            context_used=context,
            estimated_tokens=int(estimated_tokens)
        )

    def _build_user_prompt(
        self,
        user_query: str,
        context: str,
        intent_result: IntentResult
    ) -> str:
        """Build the user prompt with context"""

        # Determine context label based on intent
        context_labels = {
            IntentType.COMPANY_ANALYSIS: "公司深度研究报告",
            IntentType.INDUSTRY_ANALYSIS: "行业研究报告",
            IntentType.COMPARISON: "对比公司研究报告",
            IntentType.TREND_PREDICTION: "趋势分析资料",
            IntentType.FINANCIAL_ANALYSIS: "财务分析数据",
            IntentType.VALUATION: "估值分析资料",
            IntentType.RISK_ASSESSMENT: "风险评估资料",
            IntentType.GENERAL_QUESTION: "相关研究资料"
        }

        context_label = context_labels.get(
            intent_result.intent,
            "相关资料"
        )

        # Format context section
        if context and context.strip():
            context_section = f"""
【本地知识库资料】
以下是来自本地知识库的{context_label}：

---
{context}
---

请特别关注上述资料中的数据，在回答中引用并验证。"""
        else:
            context_section = """
【注意】本地知识库中未找到直接相关的资料。
请基于你的专业知识进行回答，并在回答中明确说明：
1. 哪些是基于已有知识的分析
2. 哪些信息需要用户自行验证
3. 建议用户补充哪些数据"""

        # Add time context if available
        time_context = ""
        if intent_result.time_range:
            time_context = f"\n\n【时间范围】用户关注的时间段是 {intent_result.time_range}，请优先使用该时段数据。"

        # Build user prompt
        user_prompt = f"""{context_section}{time_context}

【用户问题】
{user_query}

【回答要求】
1. **优先使用本地知识库资料**中的数据回答问题
2. 如果本地知识库有相关数据，必须引用并使用
3. 提供详细的分析和数据支撑
4. 标注信息来源（来自本地知识库 or 基于公开知识）
5. 给出明确的结论和建议
6. 如信息不足，说明局限性

请开始回答："""

        return user_prompt

    def get_output_format_hint(self, intent: IntentType) -> str:
        """Get output format hint for a given intent"""
        return FEWSHOT_EXAMPLES.get(intent, "")