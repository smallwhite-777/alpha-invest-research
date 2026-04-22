from assistant.types import AssistantResult


class AssistantValidator:
    """First-phase lightweight validator for answer quality."""

    def validate(self, result: AssistantResult) -> list[str]:
        warnings = list(result.warnings)
        if not result.sources:
            warnings.append("本次回答未附带显式来源，请谨慎使用。")
        if result.evidence_bundle.missing_required:
            warnings.append("部分必需证据缺失，结论可信度受限。")
        return warnings
