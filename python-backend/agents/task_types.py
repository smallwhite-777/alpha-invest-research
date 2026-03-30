# Task Decomposition Types and Schemas
# Defines the structure for multi-agent pipeline

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
import json


class TaskType(Enum):
    """Types of sub-tasks in the pipeline"""
    FINANCIAL_DATA = "financial_data"           # 核心财务数据提取
    PROFITABILITY = "profitability"             # 盈利能力分析
    BUSINESS_STRUCTURE = "business_structure"   # 业务结构分析
    MANAGEMENT_ANALYSIS = "management_analysis" # 管理层分析与展望
    INDUSTRY_COMPARISON = "industry_comparison" # 行业对比
    VALUATION = "valuation"                     # 估值分析
    RISK_ANALYSIS = "risk_analysis"            # 风险分析
    CASHFLOW = "cashflow"                       # 现金流分析


class IntentCategory(Enum):
    """High-level intent categories"""
    COMPANY_ANALYSIS = "company_analysis"
    FINANCIAL_ANALYSIS = "financial_analysis"
    INDUSTRY_ANALYSIS = "industry_analysis"
    COMPARISON = "comparison"
    TREND_PREDICTION = "trend_prediction"
    VALUATION = "valuation"
    RISK_ASSESSMENT = "risk_assessment"
    GENERAL_QUESTION = "general_question"


@dataclass
class SubTask:
    """A single sub-task in the pipeline"""
    id: str
    name: str
    description: str
    task_type: TaskType
    priority: int = 1
    keywords: List[str] = field(default_factory=list)
    target_years: List[str] = field(default_factory=list)
    status: str = "pending"
    result_file: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "task_type": self.task_type.value,
            "priority": self.priority,
            "keywords": self.keywords,
            "target_years": self.target_years,
            "status": self.status,
            "result_file": self.result_file,
            "error": self.error
        }


@dataclass
class TaskDecomposition:
    """Result from Agent 0: task decomposition"""
    user_raw: str
    intent: IntentCategory
    entity: str                                    # 公司名称
    stock_code: Optional[str] = None
    time_range: List[str] = field(default_factory=list)
    clarifications: List[str] = field(default_factory=list)
    sub_tasks: List[SubTask] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "user_raw": self.user_raw,
            "intent": self.intent.value,
            "entity": self.entity,
            "stock_code": self.stock_code,
            "time_range": self.time_range,
            "clarifications": self.clarifications,
            "sub_tasks": [t.to_dict() for t in self.sub_tasks]
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


# ==================== TASK TEMPLATES ====================
# Pre-defined templates for common analysis scenarios

TASK_TEMPLATES = {
    IntentCategory.FINANCIAL_ANALYSIS: [
        {
            "id": "T1",
            "name": "核心财务数据提取",
            "description": "提取主要会计数据：营业收入、归母净利润、总资产、净资产、每股收益、ROE、现金流、资产负债率",
            "task_type": TaskType.FINANCIAL_DATA,
            "priority": 1,
            "keywords": ["营业收入", "净利润", "总资产", "净资产", "每股收益", "ROE", "经营现金流", "资产负债率"]
        },
        {
            "id": "T2",
            "name": "盈利能力分析",
            "description": "提取毛利率、净利率、费用率，分析盈利变化趋势",
            "task_type": TaskType.PROFITABILITY,
            "priority": 2,
            "keywords": ["毛利率", "净利率", "销售费用率", "管理费用率", "财务费用率"]
        },
        {
            "id": "T3",
            "name": "现金流分析",
            "description": "提取经营性现金流、投资现金流、筹资现金流，分析现金流质量",
            "task_type": TaskType.CASHFLOW,
            "priority": 3,
            "keywords": ["经营活动现金流", "投资活动现金流", "筹资活动现金流", "自由现金流"]
        }
    ],
    IntentCategory.COMPANY_ANALYSIS: [
        {
            "id": "T1",
            "name": "核心财务数据提取",
            "description": "提取主要会计数据：营业收入、归母净利润、总资产、净资产、每股收益、ROE",
            "task_type": TaskType.FINANCIAL_DATA,
            "priority": 1,
            "keywords": ["营业收入", "净利润", "总资产", "净资产", "每股收益", "ROE"]
        },
        {
            "id": "T2",
            "name": "盈利能力分析",
            "description": "提取毛利率、净利率，分析盈利变化趋势",
            "task_type": TaskType.PROFITABILITY,
            "priority": 2,
            "keywords": ["毛利率", "净利率", "毛利率变化"]
        },
        {
            "id": "T3",
            "name": "业务结构分析",
            "description": "提取分产品/分行业收入构成、占比变化",
            "task_type": TaskType.BUSINESS_STRUCTURE,
            "priority": 3,
            "keywords": ["主营业务", "分产品", "分行业", "收入构成", "占比"]
        },
        {
            "id": "T4",
            "name": "管理层分析与展望",
            "description": "提取管理层讨论与分析中的经营总结、未来规划、风险提示",
            "task_type": TaskType.MANAGEMENT_ANALYSIS,
            "priority": 4,
            "keywords": ["管理层讨论", "经营总结", "未来规划", "风险提示", "发展战略"]
        }
    ],
    IntentCategory.COMPARISON: [
        {
            "id": "T1",
            "name": "核心财务数据对比",
            "description": "提取各公司的核心财务数据进行对比",
            "task_type": TaskType.FINANCIAL_DATA,
            "priority": 1,
            "keywords": ["营业收入", "净利润", "ROE", "毛利率"]
        },
        {
            "id": "T2",
            "name": "估值对比分析",
            "description": "提取PE、PB等估值指标进行对比",
            "task_type": TaskType.VALUATION,
            "priority": 2,
            "keywords": ["PE", "PB", "市盈率", "市净率", "估值"]
        }
    ],
    IntentCategory.VALUATION: [
        {
            "id": "T1",
            "name": "估值指标提取",
            "description": "提取PE、PB、PS、PEG等估值指标",
            "task_type": TaskType.VALUATION,
            "priority": 1,
            "keywords": ["PE", "PB", "PS", "PEG", "市盈率", "市净率"]
        },
        {
            "id": "T2",
            "name": "行业估值对比",
            "description": "与同行业公司估值进行对比分析",
            "task_type": TaskType.INDUSTRY_COMPARISON,
            "priority": 2,
            "keywords": ["行业平均", "可比公司", "估值水平"]
        }
    ],
    IntentCategory.RISK_ASSESSMENT: [
        {
            "id": "T1",
            "name": "风险因素识别",
            "description": "识别主要经营风险、财务风险、行业风险",
            "task_type": TaskType.RISK_ANALYSIS,
            "priority": 1,
            "keywords": ["风险", "风险因素", "风险提示", "经营风险", "财务风险"]
        },
        {
            "id": "T2",
            "name": "管理层风险分析",
            "description": "从管理层讨论中提取风险相关内容",
            "task_type": TaskType.MANAGEMENT_ANALYSIS,
            "priority": 2,
            "keywords": ["可能面临", "风险", "不确定性"]
        }
    ],
    IntentCategory.GENERAL_QUESTION: [
        {
            "id": "T1",
            "name": "通用信息检索",
            "description": "检索与问题相关的信息",
            "task_type": TaskType.FINANCIAL_DATA,
            "priority": 1,
            "keywords": []
        }
    ],
    IntentCategory.INDUSTRY_ANALYSIS: [
        {
            "id": "T1",
            "name": "行业概况分析",
            "description": "提取行业规模、增速、格局信息",
            "task_type": TaskType.INDUSTRY_COMPARISON,
            "priority": 1,
            "keywords": ["行业规模", "市场规模", "增速", "竞争格局"]
        }
    ],
    IntentCategory.TREND_PREDICTION: [
        {
            "id": "T1",
            "name": "历史数据分析",
            "description": "提取历史财务数据分析趋势",
            "task_type": TaskType.FINANCIAL_DATA,
            "priority": 1,
            "keywords": ["营业收入", "净利润", "增长趋势"]
        }
    ]
}


# ==================== HELPER FUNCTIONS ====================

def get_task_template(intent: IntentCategory) -> List[Dict]:
    """Get task template for a given intent"""
    return TASK_TEMPLATES.get(intent, TASK_TEMPLATES[IntentCategory.GENERAL_QUESTION])


def create_sub_task_from_template(template: Dict, years: List[str]) -> SubTask:
    """Create a SubTask from template"""
    return SubTask(
        id=template["id"],
        name=template["name"],
        description=template["description"],
        task_type=template["task_type"],
        priority=template.get("priority", 1),
        keywords=template.get("keywords", []),
        target_years=years
    )


def parse_time_range(query: str) -> List[str]:
    """Parse time range from query"""
    import re

    years = []

    # Explicit year mentions
    year_matches = re.findall(r'\b(20\d{2})\b', query)
    years.extend(year_matches)

    # Relative time expressions
    if "今年" in query:
        years.append("2025")
    elif "去年" in query:
        years.append("2024")
    elif "前年" in query:
        years.append("2023")

    if "这两年" in query or "近两年" in query:
        years = ["2023", "2024"]
    elif "近三年" in query or "三年" in query:
        years = ["2022", "2023", "2024"]
    elif "近五年" in query or "五年" in query:
        years = ["2020", "2021", "2022", "2023", "2024"]

    # Default to recent 2 years if no time range specified
    if not years:
        years = ["2023", "2024"]

    # Deduplicate and sort
    years = sorted(list(set(years)), reverse=True)
    return years


def infer_clarifications(query: str, intent: IntentCategory) -> List[str]:
    """Infer clarifications based on query and intent"""
    clarifications = []

    query_lower = query.lower()

    # Performance/业绩 related
    if "业绩" in query or "财务" in query:
        clarifications.append("用户问'业绩/财务'→ 需要营收、利润、毛利率、ROE等核心财务指标")

    # Growth/增长 related
    if "增长" in query or "变化" in query:
        clarifications.append("用户问'增长/变化'→ 需要同比、环比数据分析")

    # Valuation/估值 related
    if "估值" in query or "贵不贵" in query or "值得" in query:
        clarifications.append("用户问'估值'→ 需要PE、PB、历史分位数")

    # Comparison/对比 related
    if "对比" in query or "比较" in query or "哪个" in query:
        clarifications.append("用户问'对比/比较'→ 需要多公司横向对比表格")

    # Risk/风险 related
    if "风险" in query or "问题" in query:
        clarifications.append("用户问'风险/问题'→ 需要风险因素分析")

    # Time range inference
    if "这两年" in query:
        clarifications.append("用户说'这两年'→ 推断为最近两个完整年度（2023+2024）")
    elif "今年" in query:
        clarifications.append("用户说'今年'→ 推断为2025年")

    return clarifications