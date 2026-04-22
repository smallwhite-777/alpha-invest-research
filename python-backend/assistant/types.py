from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class QueryContext:
    question: str
    page_type: Optional[str] = None
    entity_type: Optional[str] = None
    stock_code: Optional[str] = None
    company_name: Optional[str] = None
    indicator_codes: List[str] = field(default_factory=list)
    compare_targets: List[str] = field(default_factory=list)
    time_range: Optional[str] = None
    context_summary: Optional[str] = None
    recent_messages: List[Dict[str, str]] = field(default_factory=list)
    requested_skill: Optional[str] = None
    deep_mode_stage: Optional[str] = None
    writing_outline: Optional[str] = None


@dataclass
class SkillDefinition:
    id: str
    label: str
    description: str
    required_evidence: List[str]
    optional_evidence: List[str]
    banned_behaviors: List[str]
    output_sections: List[str]
    supports_follow_up: bool = True


@dataclass
class EvidenceItem:
    kind: str
    source_id: str
    source_name: str
    source_type: str
    title: Optional[str] = None
    entity: Optional[str] = None
    stock_code: Optional[str] = None
    date: Optional[str] = None
    metric_name: Optional[str] = None
    metric_value: Optional[str] = None
    snippet: Optional[str] = None
    confidence: float = 0.8
    is_fact: bool = False
    is_recent: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceBundle:
    skill_id: str
    query: QueryContext
    items: List[EvidenceItem]
    grouped: Dict[str, List[EvidenceItem]]
    warnings: List[str] = field(default_factory=list)
    missing_required: List[str] = field(default_factory=list)
    freshness_summary: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AssistantResult:
    content: str
    skill_id: str
    evidence_bundle: EvidenceBundle
    sources: List[Dict[str, str]]
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
