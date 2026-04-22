from assistant.skill_registry import get_skill
from assistant.types import EvidenceBundle, QueryContext


class AssistantPromptBuilder:
    def build(self, query: QueryContext, bundle: EvidenceBundle) -> tuple[str, str]:
        skill = get_skill(bundle.skill_id)
        sections = "\n".join(f"- {section}" for section in skill.output_sections)
        banned = "\n".join(f"- {item}" for item in skill.banned_behaviors)
        stage = query.deep_mode_stage or "answer"
        evidence_lines = self._format_evidence(bundle)

        system_prompt = f"""你是 OPENINVEST 的金融分析助手。
当前 skill: {skill.label}
任务描述: {skill.description}
当前阶段: {stage}

回答必须遵守：
- 先基于证据，再给判断
- 事实与推断分开表达
- 如果证据不足，要明确说明
- 关键数字尽量标注日期和来源

禁止事项：
{banned}

标准输出章节：
{sections}

skill 写作要点：
{self._build_skill_directive(skill.id)}

阶段性要求：
{self._build_stage_directive(stage, query)}
"""

        user_prompt = f"""用户问题：{query.question}

上下文摘要：
{query.context_summary or '无'}

结构化证据：
{chr(10).join(evidence_lines)}

缺失的必需证据：{', '.join(bundle.missing_required) if bundle.missing_required else '无'}
"""

        return system_prompt, user_prompt

    def _format_evidence(self, bundle: EvidenceBundle) -> list[str]:
        evidence_lines: list[str] = []
        ordered_groups = [
            ("valuation_snapshots", "估值快照"),
            ("peer_metrics", "同行对比"),
            ("financial_facts", "财务事实"),
            ("annual_report_snippets", "财报片段"),
            ("macro_series", "宏观数据"),
            ("news_events", "事件与新闻"),
            ("research_views", "研报观点"),
        ]

        for group_name, label in ordered_groups:
            items = bundle.grouped.get(group_name, [])
            if not items:
                continue
            evidence_lines.append(f"## {label}")
            for item in items[:5]:
                line = self._format_item(item)
                if line:
                    evidence_lines.append(f"- {line}")

        if not evidence_lines:
            evidence_lines.append("- 当前未检索到充分证据，请明确指出证据不足。")

        return evidence_lines

    def _format_item(self, item) -> str:
        if item.kind == "valuation_snapshot":
            metrics = item.metadata.get("metrics", {}) if item.metadata else {}
            return (
                f"PE(TTM)={metrics.get('pe_ttm')}, PB={metrics.get('pb')}, PS={metrics.get('ps')}, "
                f"行业PE={metrics.get('industry_avg_pe')}, 行业PB={metrics.get('industry_avg_pb')}, "
                f"PE分位={item.metadata.get('pe_percentile')}, PB分位={item.metadata.get('pb_percentile')}, "
                f"价格日期={item.date or '未知'}"
            )
        if item.kind == "peer_metric":
            return f"{item.title or item.stock_code}: {item.snippet}"
        if item.kind == "macro_series":
            preview = item.metadata.get("series_preview", []) if item.metadata else []
            preview_text = ", ".join(f"{row.get('date')}={row.get('value')}" for row in preview[-3:])
            return f"{item.snippet}; recent=[{preview_text}]"
        if item.metric_name and item.metric_value:
            return (
                f"{item.metric_name}: {item.metric_value}"
                + (f" @ {item.date}" if item.date else "")
                + (f" | {item.source_name}" if item.source_name else "")
            )
        if item.snippet:
            return item.snippet
        return item.source_name

    def _build_stage_directive(self, stage: str, query: QueryContext) -> str:
        if stage == "outline":
            return """现在不要直接写完整文章。
- 产出一份可编辑的深度投研写作框架
- 使用 Markdown 标题和项目符号
- 应包含：标题候选、摘要、核心论点、证据位、反方观点、风险、估值、跟踪指标、附录
- 对每个章节写明建议写什么，不要展开成长篇正文
- 如证据不足，要在对应章节标出“待补证据”"""

        if stage == "article":
            return f"""现在要基于用户确认后的写作框架生成完整深度投研文章。
- 严格遵守用户编辑后的写作框架
- 输出完整文章，不要再输出提纲说明
- 保持金融分析语气，结构完整，可直接阅读
- 对关键数字和判断尽量结合证据

用户确认后的写作框架：
{query.writing_outline or '无，若无则按标准深度分析结构生成'}"""

        return """直接回答用户问题，采用金融分析师风格。
- 优先输出结论
- 再给证据链和风险
- 保持结构化和简洁"""

    def _build_skill_directive(self, skill_id: str) -> str:
        directives = {
            "valuation": """- 优先使用 valuation_snapshot 和 peer_metrics
- 先写当前估值水平、历史位置和行业比较，再给判断
- 结论里要说明估值与基本面是否匹配
- 没有估值数据时不能直接说低估或高估""",
            "peer_comparison": """- 优先使用 peer_metrics，明确说明对比样本
- 对比结构至少包含：财务质量、成长性、估值水平
- 如样本过少或可比性不足，要明确提示局限""",
            "macro_analysis": """- 优先使用 macro_series，说明最新值、最新日期和最近变化
- 先写数据现状，再写传导含义和市场影响
- 多指标情境下，先整理各指标方向，再做综合判断""",
            "earnings_review": """- 优先使用 annual_report_snippets 和 financial_facts
- 先总结核心财务变化，再解释原因和可持续性
- 区分财报事实、管理层表述和研报解读""",
            "company_analysis": """- 先给公司判断，再写核心逻辑、数据支撑、风险
- 如存在 valuation_snapshot，可把估值视角纳入结论
- 输出风格要像投研结论，不像百科摘要""",
        }

        return directives.get(
            skill_id,
            """- 按照标准金融分析结构回答
- 优先引用当前已提供的证据，而不是模型常识""",
        )
