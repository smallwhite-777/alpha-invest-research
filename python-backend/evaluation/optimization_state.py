"""
Optimization State Manager
Tracks and applies optimization changes to the system
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime


@dataclass
class PromptEnhancement:
    """Prompt enhancement configuration"""
    # Additional sections to require in output
    required_sections: List[str] = field(default_factory=lambda: [
        "投资摘要", "核心观点", "行业概况", "公司介绍",
        "财务分析", "盈利预测", "估值分析", "风险提示"
    ])

    # Additional formatting requirements
    format_requirements: List[str] = field(default_factory=lambda: [
        "数据精确到小数点后2位",
        "关键结论加粗标注",
        "标注数据来源"
    ])

    # Industry-specific keywords to emphasize
    industry_keywords: Dict[str, List[str]] = field(default_factory=dict)


@dataclass
class SearchEnhancement:
    """Search enhancement configuration"""
    # Additional search directories to check
    additional_paths: List[str] = field(default_factory=list)

    # File patterns to prioritize
    priority_patterns: List[str] = field(default_factory=lambda: [
        "*.md", "*.txt", "*.json"
    ])

    # Max results to return (can be increased)
    max_results: int = 10

    # Year filter enabled
    year_filter_enabled: bool = True


@dataclass
class StructureTemplate:
    """Report structure template"""
    name: str
    sections: List[str]
    required_data_points: List[str]
    industry_specific: Optional[str] = None


@dataclass
class OptimizationState:
    """Current optimization state"""
    version: int = 1
    last_updated: str = ""

    # Prompt enhancements applied
    prompt_enhancements: PromptEnhancement = field(default_factory=PromptEnhancement)

    # Search enhancements applied
    search_enhancements: SearchEnhancement = field(default_factory=SearchEnhancement)

    # Structure templates added
    structure_templates: List[StructureTemplate] = field(default_factory=list)

    # Applied strategies history
    applied_strategies: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        return {
            "version": self.version,
            "last_updated": self.last_updated,
            "prompt_enhancements": asdict(self.prompt_enhancements),
            "search_enhancements": asdict(self.search_enhancements),
            "structure_templates": [asdict(t) for t in self.structure_templates],
            "applied_strategies": self.applied_strategies
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'OptimizationState':
        """Create from dictionary"""
        state = cls()
        state.version = data.get("version", 1)
        state.last_updated = data.get("last_updated", "")

        pe = data.get("prompt_enhancements", {})
        state.prompt_enhancements = PromptEnhancement(
            required_sections=pe.get("required_sections", state.prompt_enhancements.required_sections),
            format_requirements=pe.get("format_requirements", state.prompt_enhancements.format_requirements),
            industry_keywords=pe.get("industry_keywords", {})
        )

        se = data.get("search_enhancements", {})
        state.search_enhancements = SearchEnhancement(
            additional_paths=se.get("additional_paths", []),
            priority_patterns=se.get("priority_patterns", state.search_enhancements.priority_patterns),
            max_results=se.get("max_results", 10),
            year_filter_enabled=se.get("year_filter_enabled", True)
        )

        state.structure_templates = [
            StructureTemplate(**t) for t in data.get("structure_templates", [])
        ]

        state.applied_strategies = data.get("applied_strategies", [])

        return state


class OptimizationStateManager:
    """Manages optimization state persistence"""

    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or Path("optimization_config.json")
        self.state = self._load_state()

    def _load_state(self) -> OptimizationState:
        """Load state from file"""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return OptimizationState.from_dict(data)
            except Exception as e:
                print(f"[Warning] Failed to load optimization state: {e}")
                return OptimizationState()
        return OptimizationState()

    def save_state(self):
        """Save state to file"""
        self.state.last_updated = datetime.now().isoformat()
        with open(self.config_path, 'w', encoding='utf-8') as f:
            json.dump(self.state.to_dict(), f, ensure_ascii=False, indent=2)

    def apply_prompt_enhancement(self, sections: List[str] = None,
                                  format_reqs: List[str] = None,
                                  industry_keywords: Dict[str, List[str]] = None):
        """Apply prompt enhancements"""
        if sections:
            self.state.prompt_enhancements.required_sections.extend(sections)
            self.state.prompt_enhancements.required_sections = list(
                set(self.state.prompt_enhancements.required_sections)
            )

        if format_reqs:
            self.state.prompt_enhancements.format_requirements.extend(format_reqs)

        if industry_keywords:
            self.state.prompt_enhancements.industry_keywords.update(industry_keywords)

        self.save_state()

    def apply_search_enhancement(self, max_results: int = None,
                                  additional_paths: List[str] = None):
        """Apply search enhancements"""
        if max_results:
            self.state.search_enhancements.max_results = max_results

        if additional_paths:
            self.state.search_enhancements.additional_paths.extend(additional_paths)

        self.save_state()

    def add_structure_template(self, template: StructureTemplate):
        """Add a structure template"""
        self.state.structure_templates.append(template)
        self.save_state()

    def record_strategy(self, strategy: str, details: Dict[str, Any]):
        """Record applied strategy"""
        self.state.applied_strategies.append({
            "strategy": strategy,
            "timestamp": datetime.now().isoformat(),
            "details": details
        })
        self.save_state()


# Industry-specific structure templates
INDUSTRY_TEMPLATES = {
    "工程机械": StructureTemplate(
        name="工程机械行业报告模板",
        sections=[
            "投资摘要", "核心观点", "行业概况", "市场规模",
            "行业周期", "公司介绍", "主营业务", "竞争优势",
            "财务分析", "盈利预测", "估值分析", "风险提示"
        ],
        required_data_points=[
            "挖掘机销量", "电动化渗透率", "市场份额",
            "海外收入", "起重机", "混凝土"
        ],
        industry_specific="工程机械"
    ),
    "液压件": StructureTemplate(
        name="液压件行业报告模板",
        sections=[
            "投资摘要", "核心观点", "行业概况", "国产替代",
            "公司介绍", "产品结构", "竞争优势",
            "财务分析", "盈利预测", "估值分析", "风险提示"
        ],
        required_data_points=[
            "液压件", "泵阀", "国产替代率", "油缸", "挖机配套"
        ],
        industry_specific="液压件"
    ),
    "养猪": StructureTemplate(
        name="养殖业报告模板",
        sections=[
            "投资摘要", "核心观点", "行业概况", "猪周期分析",
            "公司介绍", "产能布局", "成本优势",
            "财务分析", "盈利预测", "估值分析", "风险提示"
        ],
        required_data_points=[
            "能繁母猪", "猪周期", "完全成本", "PSY", "出栏量", "饲料成本"
        ],
        industry_specific="养猪"
    ),
    "眼科医疗": StructureTemplate(
        name="眼科医疗服务报告模板",
        sections=[
            "投资摘要", "核心观点", "行业概况", "市场规模",
            "公司介绍", "业务结构", "连锁优势",
            "财务分析", "盈利预测", "估值分析", "风险提示"
        ],
        required_data_points=[
            "眼科", "屈光", "白内障", "视光", "连锁医院", "医师"
        ],
        industry_specific="眼科医疗"
    )
}


def get_optimization_manager() -> OptimizationStateManager:
    """Get the global optimization manager instance"""
    return OptimizationStateManager()