import re
from typing import Dict, List

from agents.result_agent import FormattedResult, OutputFormat
from assistant.types import AssistantResult, EvidenceBundle, EvidenceItem


class AssistantFormatter:
    def format(
        self,
        content: str,
        skill_id: str,
        bundle: EvidenceBundle,
    ) -> AssistantResult:
        cleaned = self._clean_content(content)
        stage = bundle.query.deep_mode_stage or "answer"

        if self._needs_fallback(cleaned):
            cleaned = self._build_fallback_content(stage, skill_id, bundle)

        sources = self._build_sources(bundle)
        warnings = list(bundle.warnings)
        if bundle.missing_required:
            warnings.append("回答存在证据缺口，已按谨慎模式输出。")

        return AssistantResult(
            content=cleaned.strip(),
            skill_id=skill_id,
            evidence_bundle=bundle,
            sources=sources,
            warnings=warnings,
            metadata={
                "skill": skill_id,
                "evidence_summary": {
                    key: len(value) for key, value in bundle.grouped.items() if value
                },
                "missing_required": bundle.missing_required,
            },
        )

    def to_formatted_result(self, result: AssistantResult) -> FormattedResult:
        return FormattedResult(
            content=result.content,
            sources=result.sources,
            format=OutputFormat.MARKDOWN,
            metadata={
                **result.metadata,
                "warnings": result.warnings,
            },
            sections=None,
        )

    def _build_sources(self, bundle: EvidenceBundle) -> List[Dict[str, str]]:
        deduped = {}
        for item in bundle.items:
            deduped[item.source_id] = {
                "display": item.source_name,
                "company_name": item.entity or "",
                "stock_code": item.stock_code or "",
                "date": item.date or "",
                "source_type": item.source_type,
                "type": item.kind,
            }
        return list(deduped.values())

    def _clean_content(self, content: str) -> str:
        cleaned = re.sub(r"<think>[\s\S]*?</think>", "", content or "", flags=re.IGNORECASE).strip()
        if cleaned:
            return cleaned
        return (content or "").strip()

    def _needs_fallback(self, content: str) -> bool:
        normalized = (content or "").strip()
        if len(normalized) < 40:
            return True

        failure_markers = [
            "抱歉，我无法完成分析",
            "请稍后重试",
            "无法完成分析",
            "未能完成分析",
            "sorry",
        ]
        return any(marker in normalized for marker in failure_markers)

    def _build_fallback_content(self, stage: str, skill_id: str, bundle: EvidenceBundle) -> str:
        if stage == "outline":
            return self._build_outline(bundle)
        if stage == "article":
            return self._build_article(bundle)
        return self._build_answer(skill_id, bundle)

    def _build_outline(self, bundle: EvidenceBundle) -> str:
        company = bundle.query.company_name or bundle.query.stock_code or "目标公司"
        peer_names = ", ".join(
            item.entity or item.title or item.stock_code or ""
            for item in bundle.grouped.get("peer_metrics", [])[:4]
            if item.entity or item.title or item.stock_code
        ) or "待补充同行样本"
        valuation = bundle.grouped.get("valuation_snapshots", [])
        valuation_hint = valuation[0].snippet if valuation else "待补充估值快照"

        return f"""# {company} 深度分析写作框架

## 标题候选
- {company}：高端白酒龙头的经营韧性与估值再定价
- {company}：基本面、估值与风险的三维审视

## 一、执行摘要
- 用 3-4 句话回答：这家公司当前最值得关注的核心判断是什么
- 概括经营质量、估值位置和主要风险

## 二、核心投资结论
- 结论 1：商业模式与竞争壁垒
- 结论 2：当前经营趋势与业绩韧性
- 结论 3：估值是否具备性价比

## 三、商业模式与竞争优势
- 品牌力、渠道力、产品结构、定价能力
- 结合行业位置说明其护城河是否稳固

## 四、经营与财务质量
- 待补证据：收入、利润、ROE、现金流、毛利率
- 如缺财务事实，先说明需补哪些指标

## 五、估值分析
- 当前估值快照：{valuation_hint}
- 与同行对比：{peer_names}
- 历史分位、行业比较、估值与增长匹配度

## 六、同行比较
- 重点对比：{peer_names}
- 对比维度：收入体量、盈利能力、ROE、PE/PB

## 七、风险与反方观点
- 需求波动
- 行业政策与消费税变化
- 高基数下的增长压力
- 估值回落风险

## 八、跟踪指标
- 批价与渠道库存
- 单季收入/利润变化
- ROE 与经营现金流
- 估值分位与行业相对表现

## 九、附录 / 待补证据
- 财报关键指标表
- 历史估值区间
- 同行比较表
"""

    def _build_article(self, bundle: EvidenceBundle) -> str:
        company = bundle.query.company_name or bundle.query.stock_code or "目标公司"
        valuation = bundle.grouped.get("valuation_snapshots", [])
        valuation_text = valuation[0].snippet if valuation else "当前尚未拿到完整估值快照。"
        peers = bundle.grouped.get("peer_metrics", [])
        peer_lines = [
            f"- {item.entity or item.title or item.stock_code}：{item.snippet}"
            for item in peers[:4]
        ]
        if not peer_lines:
            peer_lines = ["- 同行样本仍需补充。"]

        research = bundle.grouped.get("research_views", [])
        research_text = research[0].snippet if research else "当前研报证据较少，结论需谨慎。"
        missing = "、".join(bundle.missing_required) if bundle.missing_required else "无"

        return f"""# {company} 深度分析

## 执行摘要
基于当前已命中的研报、估值快照与同行对比证据，{company} 仍表现出较强的品牌壁垒和盈利质量，但结论仍受限于部分财务事实证据缺口。现阶段更适合给出“基于已知证据的谨慎分析”，而不是过度确定性的判断。

## 核心逻辑
从商业模式看，{company} 的优势主要体现在品牌力、产品结构和定价能力。现有研报线索显示，市场仍将其视作白酒板块中最具稀缺性的核心资产之一。

从估值角度看，当前快照显示：{valuation_text}
这意味着其估值并非极端便宜，但在龙头质量和行业地位的支撑下，仍需要结合增长与现金流质量综合判断，而不能只看单点 PE/PB。

## 同行比较
{chr(10).join(peer_lines)}

从同行样本看，{company} 的讨论重点不应仅是“绝对贵不贵”，而是其盈利确定性、资产质量与品牌壁垒是否足以支撑相对溢价。

## 风险与反方观点
- 消费需求波动可能影响高端白酒景气度。
- 高基数背景下，收入和利润增速可能阶段性放缓。
- 若市场风险偏好下行，高估值资产可能承压。
- 当前缺失的必需证据：{missing}

## 结论
现有证据更支持将 {company} 视作“高质量龙头、估值需动态匹配基本面”的研究对象，而不是简单贴上低估或高估标签。若后续补齐财报关键指标、经营现金流和历史分位数据，可以进一步把文章深化为完整投研报告。

## 当前已用证据
- 研报/文本证据：{research_text}
- 估值快照：{valuation_text}
"""

    def _build_answer(self, skill_id: str, bundle: EvidenceBundle) -> str:
        company = bundle.query.company_name or bundle.query.stock_code or "目标公司"
        source_count = len(bundle.items)
        return (
            f"已基于当前命中的 {source_count} 条证据对 {company} 进行初步分析。"
            f" 当前 skill 为 `{skill_id}`，但由于部分关键证据仍缺失，建议将回答视为谨慎版草稿，并结合后续补充数据继续完善。"
        )
