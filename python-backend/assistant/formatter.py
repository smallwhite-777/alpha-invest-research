from typing import Dict, List

from agents.result_agent import FormattedResult, OutputFormat
from assistant.types import AssistantResult, EvidenceBundle


class AssistantFormatter:
    def format(
        self,
        content: str,
        skill_id: str,
        bundle: EvidenceBundle,
    ) -> AssistantResult:
        sources = self._build_sources(bundle)
        warnings = list(bundle.warnings)
        if bundle.missing_required:
            warnings.append("回答存在证据缺口，已按谨慎模式输出。")

        return AssistantResult(
            content=content.strip(),
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
