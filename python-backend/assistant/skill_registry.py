from assistant.types import SkillDefinition


SKILL_REGISTRY = {
    "company_analysis": SkillDefinition(
        id="company_analysis",
        label="公司分析",
        description="用于公司基本面、经营逻辑、竞争力与投资结论分析",
        required_evidence=["financial_fact", "research_view"],
        optional_evidence=["valuation_snapshot", "annual_report_snippet", "news_event"],
        banned_behaviors=["没有事实证据时下确定性结论", "忽略风险因素只输出正面逻辑"],
        output_sections=["结论", "核心逻辑", "数据支撑", "风险与跟踪"],
    ),
    "earnings_review": SkillDefinition(
        id="earnings_review",
        label="财报解读",
        description="用于分析年报或季报的核心变化、驱动和持续性",
        required_evidence=["annual_report_snippet", "financial_fact"],
        optional_evidence=["research_view", "news_event"],
        banned_behaviors=["未核对财报数据就总结业绩", "把管理层口径当作事实"],
        output_sections=["结论", "核心财务数据", "变化原因", "持续性", "风险提示"],
    ),
    "valuation": SkillDefinition(
        id="valuation",
        label="估值判断",
        description="用于判断标的当前估值水平、历史位置与同业比较",
        required_evidence=["valuation_snapshot"],
        optional_evidence=["peer_metric", "financial_fact", "research_view"],
        banned_behaviors=["没有估值数据时直接判断低估或高估", "只依据单一估值指标得出绝对结论"],
        output_sections=["结论", "当前估值", "同业比较", "历史位置", "风险提示"],
    ),
    "peer_comparison": SkillDefinition(
        id="peer_comparison",
        label="同行对比",
        description="用于同业公司经营、财务和估值对比",
        required_evidence=["peer_metric"],
        optional_evidence=["financial_fact", "valuation_snapshot", "research_view"],
        banned_behaviors=["没有同业样本就给出竞争排名"],
        output_sections=["对比范围", "优势", "短板", "结论"],
    ),
    "macro_analysis": SkillDefinition(
        id="macro_analysis",
        label="宏观分析",
        description="用于分析宏观指标变化、趋势和市场含义",
        required_evidence=["macro_series"],
        optional_evidence=["macro_signal", "news_event", "web_result"],
        banned_behaviors=["没有指标数据只凭常识讲宏观"],
        output_sections=["现状", "变化", "传导逻辑", "关注点"],
    ),
    "macro_to_asset": SkillDefinition(
        id="macro_to_asset",
        label="宏观传导",
        description="用于分析宏观变量变化对行业或资产的传导影响",
        required_evidence=["macro_series", "macro_signal"],
        optional_evidence=["research_view", "news_event"],
        banned_behaviors=["没有传导链条就直接推荐资产"],
        output_sections=["变量变化", "传导路径", "受益/受损方向", "验证指标"],
    ),
    "event_impact": SkillDefinition(
        id="event_impact",
        label="事件影响",
        description="用于分析政策、新闻、公告等事件影响",
        required_evidence=["news_event"],
        optional_evidence=["intelligence_note", "research_view", "financial_fact"],
        banned_behaviors=["只复述新闻不分析影响"],
        output_sections=["事件摘要", "影响路径", "受影响对象", "风险与不确定性"],
    ),
    "risk_diagnosis": SkillDefinition(
        id="risk_diagnosis",
        label="风险诊断",
        description="用于识别公司、行业或宏观层面的关键风险",
        required_evidence=["financial_fact"],
        optional_evidence=["research_view", "news_event", "intelligence_note"],
        banned_behaviors=["泛泛而谈风险", "不区分已发生风险和潜在风险"],
        output_sections=["核心风险", "触发条件", "验证指标", "风险结论"],
    ),
    "fact_check": SkillDefinition(
        id="fact_check",
        label="事实核验",
        description="用于核验具体事实、数据点或观点是否有证据支持",
        required_evidence=["financial_fact"],
        optional_evidence=["annual_report_snippet", "research_view", "news_event", "macro_series"],
        banned_behaviors=["没有证据仍然给出肯定判断"],
        output_sections=["核验结果", "证据", "结论"],
        supports_follow_up=False,
    ),
}


def get_skill(skill_id: str) -> SkillDefinition:
    return SKILL_REGISTRY.get(skill_id, SKILL_REGISTRY["company_analysis"])

