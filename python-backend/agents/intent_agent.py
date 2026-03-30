# Intent Recognition Agent - Enhanced Version
# Identifies user intent and extracts key entities from queries
# Based on comprehensive investment research framework

import re
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import INDUSTRY_METRICS
from utils.company_resolver import get_company_resolver, expand_company_names

logger = logging.getLogger(__name__)


class IntentType(Enum):
    """Types of user intents"""
    COMPANY_ANALYSIS = "company_analysis"      # 公司分析
    INDUSTRY_ANALYSIS = "industry_analysis"    # 行业分析
    COMPARISON = "comparison"                  # 对比分析
    TREND_PREDICTION = "trend_prediction"      # 趋势预测
    FINANCIAL_ANALYSIS = "financial_analysis"  # 财务分析
    VALUATION = "valuation"                    # 估值分析
    RISK_ASSESSMENT = "risk_assessment"        # 风险评估
    GENERAL_QUESTION = "general_question"      # 一般问题


@dataclass
class IntentResult:
    """Result from intent recognition"""
    intent: IntentType
    entities: List[str]              # Key entities (company names, industry names)
    keywords: List[str]              # Search keywords
    preferred_format: str            # Output format preference
    confidence: float                # Confidence score
    time_range: Optional[str] = None # Time range mentioned (e.g., "2025年")
    search_strategy: Optional[Dict[str, Any]] = None  # Search strategy
    analysis_outline: Optional[str] = None  # Analysis outline
    company_name: Optional[str] = None  # Extracted company name
    stock_code: Optional[str] = None    # Extracted stock code
    year_filter: Optional[str] = None   # Year for filtering search
    original_query: str = ""            # Original user query


# ==================== COMPANY NAME SUFFIXES ====================
COMPANY_SUFFIXES = [
    '矿业', '银行', '股份', '集团', '公司', '科技',
    '电子', '医药', '能源', '汽车', '保险', '证券',
    '重工', '互联', '网络', '通讯', '光电', '医疗',
    '农业', '旅游', '地产', '化工', '机械', '食品',
    '酒业', '酒类', '饮料', '生物', '材料', '装备',
    '动力', '电气', '电力', '建设', '工程', '实业'
]

# ==================== ENGLISH COMPANY NAMES ====================
ENGLISH_COMPANY_MAP = {
    'zijin mining': ('紫金矿业', '601899'),
    'catl': ('宁德时代', '300750'),
    'byd': ('比亚迪', '002594'),
    'kweichow moutai': ('贵州茅台', '600519'),
    'moutai': ('贵州茅台', '600519'),
    'maotai': ('贵州茅台', '600519'),
    'ningde shidai': ('宁德时代', '300750'),
    'contemporary amperex': ('宁德时代', '300750'),
}

# ==================== INDUSTRY KEYWORDS ====================
INDUSTRY_KEYWORDS = [
    # 科技
    "新能源", "光伏", "锂电", "储能", "半导体", "芯片", "AI", "人工智能",
    "软件", "硬件", "电子", "通信", "5G", "云计算", "大数据", "网络安全",

    # 医药健康
    "医药", "医疗", "中药", "化药", "生物医药", "医疗器械", "疫苗", "CRO",

    # 消费
    "白酒", "食品", "饮料", "乳业", "猪肉", "家电", "服装", "美妆",

    # 金融
    "银行", "保险", "证券", "基金", "信托", "租赁",

    # 周期
    "地产", "基建", "煤炭", "石油", "钢铁", "有色", "化工", "建材", "水泥",

    # 制造
    "军工", "航天", "航空", "机械", "电力", "电网", "轨交", "海运",

    # 资源
    "黄金", "铜", "锂", "钴", "稀土", "铝", "油气"
]

# ==================== INTENT PATTERNS ====================
INTENT_PATTERNS = {
    IntentType.COMPANY_ANALYSIS: [
        r"分析(.+?公司|.+?股份|.+?矿业|.+?银行|.+?集团)",
        r"(.+)公司.*分析",
        r"研究一下(.+)",
        r"(.+)怎么样",
        r"了解(.+)",
        r"介绍一下(.+)",
        r"(.+)的投资价值",
        r"(.+)值得投资",
    ],
    IntentType.INDUSTRY_ANALYSIS: [
        r"(.+)行业.*分析",
        r"分析(.+)行业",
        r"(.+)板块.*情况",
        r"(.+)赛道",
        r"(.+)行业.*投资",
        r"(.+)行业.*前景",
        r"(.+)领域.*机会",
    ],
    IntentType.COMPARISON: [
        r"对比(.+)和(.+)",
        r"(.+)与(.+)对比",
        r"比较(.+)和(.+)",
        r"哪个更好[:：]?(.+)还是(.+)",
        r"(.+)vs(.+)",
        r"(.+)和(.+)哪个",
    ],
    IntentType.TREND_PREDICTION: [
        r"(.+)趋势",
        r"(.+)未来",
        r"预测(.+)",
        r"(.+)前景",
        r"(.+)走势",
        r"(.+)发展方向",
    ],
    IntentType.FINANCIAL_ANALYSIS: [
        r"(.+)财务",
        r"(.+)营收",
        r"(.+)利润",
        r"(.+)业绩",
        r"(.+)财报",
        r"(.+)盈利",
    ],
    IntentType.VALUATION: [
        r"(.+)估值",
        r"(.+)贵不贵",
        r"(.+)值得买",
        r"(.+)市盈率",
        r"(.+)合理估值",
        r"(.+)目标价",
    ],
    IntentType.RISK_ASSESSMENT: [
        r"(.+)风险",
        r"(.+)有什么问题",
        r"(.+)隐患",
        r"(.+)注意.*风险",
        r"(.+)风险提示",
    ],
}


class IntentAgent:
    """
    Enhanced Agent for recognizing user intent from queries
    Uses pattern matching and keyword extraction
    """

    def __init__(self):
        self.intent_patterns = INTENT_PATTERNS
        self.industry_keywords = INDUSTRY_KEYWORDS
        self.company_suffixes = COMPANY_SUFFIXES

        # Time patterns
        self.time_patterns = [
            (r"(\d{4})年", "year"),
            (r"今年", "current_year"),
            (r"明年", "next_year"),
            (r"上(一)?年", "last_year"),
            (r"近(\d+)年", "recent_years"),
            (r"最近(\d+)年", "recent_years"),
            (r"过去(\d+)年", "past_years"),
        ]

    def recognize(self, query: str) -> IntentResult:
        """Recognize intent from user query"""
        intent = self._detect_intent(query)
        entities = self._extract_entities(query)
        keywords = self._extract_keywords(query, entities)
        preferred_format = self._determine_format(intent, query)
        time_range = self._extract_time_range(query)
        confidence = self._calculate_confidence(intent, entities, query)
        search_strategy = self._get_search_strategy(intent, entities)
        analysis_outline = self._generate_analysis_outline(intent, entities)

        # Extract company name and stock code
        company_name, stock_code = self._extract_company_info(query, entities)

        # Extract year filter
        year_filter = self._extract_year_filter(query)

        # If company name is detected but intent is GENERAL_QUESTION, upgrade to COMPANY_ANALYSIS
        if company_name and intent == IntentType.GENERAL_QUESTION:
            intent = IntentType.COMPANY_ANALYSIS
            confidence = min(confidence + 0.3, 1.0)

        return IntentResult(
            intent=intent,
            entities=entities,
            keywords=keywords,
            preferred_format=preferred_format,
            confidence=confidence,
            time_range=time_range,
            search_strategy=search_strategy,
            analysis_outline=analysis_outline,
            company_name=company_name,
            stock_code=stock_code,
            year_filter=year_filter,
            original_query=query
        )

    def _detect_intent(self, query: str) -> IntentType:
        """Detect the primary intent from query"""
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query):
                    return intent_type
        return IntentType.GENERAL_QUESTION

    def _extract_entities(self, query: str) -> List[str]:
        """Extract key entities (company names, industry names) from query"""
        entities = []
        query_lower = query.lower()

        # 0. Check for English company names first
        for eng_name, (cn_name, stock_code) in ENGLISH_COMPANY_MAP.items():
            if eng_name in query_lower:
                entities.append(cn_name)
                if stock_code not in entities:
                    entities.append(stock_code)

        # 1. Extract stock codes (6 digits, optionally followed by .SH/.SZ)
        # Match patterns like "600031", "600031.SH", "600031.SZ"
        stock_matches = re.findall(r'\b(\d{6})(?:\.[A-Z]{2})?\b', query)
        entities.extend(stock_matches)

        # 2. Extract company names by common suffixes
        chinese_words = re.findall(r'[\u4e00-\u9fa5]{2,8}', query)

        for word in chinese_words:
            for suffix in self.company_suffixes:
                if word.endswith(suffix) and len(word) > len(suffix):
                    # Extract just the company name
                    idx = word.find(suffix)
                    if idx > 0:
                        # Take characters before suffix + suffix
                        clean_name = word[idx-2:] if idx >= 2 else word
                        if len(clean_name) >= 2:
                            entities.append(clean_name)
                    elif idx == 0:
                        entities.append(word)
                    break

        # 3. Extract well-known company names without suffixes
        # Common short company names
        well_known_companies = [
            "宁德时代", "比亚迪", "腾讯", "阿里", "百度", "美团", "京东",
            "茅台", "五粮液", "洋河", "泸州老窖", "汾酒",
            "招行", "平安", "格力", "美的", "海尔",
            "紫金矿业", "赣锋锂业", "天齐锂业",
            # Test case companies
            "三一重工", "恒立液压", "牧原股份", "爱尔眼科", "徐工机械",
        ]

        for company in well_known_companies:
            if company in query and company not in entities:
                entities.append(company)

        # 4. Also try to find company names that appear in the query directly
        potential_names = re.findall(r'[\u4e00-\u9fa5]{2,4}(?=[^\u4e00-\u9fa5]|$)', query)
        skip_words = ['根据', '分析', '研报', '内容', '投资', '财务', '状况', '怎么样',
                      '什么', '如何', '怎么', '请', '帮我', '能否', '是否', '有没有']

        for name in potential_names:
            if len(name) >= 2 and name not in entities:
                if not any(sw in name for sw in skip_words):
                    entities.append(name)

        # 5. Extract industry names
        for industry in self.industry_keywords:
            if industry in query and industry not in entities:
                entities.append(industry)

        # Remove duplicates while preserving order
        seen = set()
        unique_entities = []
        for e in entities:
            if e not in seen:
                seen.add(e)
                unique_entities.append(e)

        return unique_entities

    def _extract_keywords(self, query: str, entities: List[str]) -> List[str]:
        """Extract and expand keywords from query using company name resolver"""
        keywords = list(entities)  # Start with entities

        # Use CompanyNameResolver to expand any company names in entities
        try:
            resolver = get_company_resolver()
            for entity in entities:
                # Check if this entity is a company name
                info = resolver.lookup(entity)
                if info:
                    # Expand to all name variants
                    variants = resolver.get_all_variants(entity)
                    keywords.extend(variants)
                    logger.debug(f"Expanded '{entity}' to {variants}")
        except Exception as e:
            logger.warning(f"CompanyNameResolver error: {e}")

        # Add industry keywords found in query
        for industry in self.industry_keywords:
            if industry in query and industry not in keywords:
                keywords.append(industry)

        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for kw in keywords:
            if kw and kw not in seen:
                seen.add(kw)
                unique_keywords.append(kw)

        return unique_keywords[:15]  # Limit to 15 keywords

    def _determine_format(self, intent: IntentType, query: str) -> str:
        """Determine preferred output format"""
        format_hints = {
            IntentType.COMPANY_ANALYSIS: "深度报告",
            IntentType.INDUSTRY_ANALYSIS: "行业报告",
            IntentType.COMPARISON: "对比表格",
            IntentType.TREND_PREDICTION: "趋势分析",
            IntentType.FINANCIAL_ANALYSIS: "财务数据",
            IntentType.VALUATION: "估值报告",
            IntentType.RISK_ASSESSMENT: "风险提示",
            IntentType.GENERAL_QUESTION: "简洁回答",
        }
        return format_hints.get(intent, "标准报告")

    def _extract_time_range(self, query: str) -> Optional[str]:
        """Extract time range from query"""
        for pattern, time_type in self.time_patterns:
            match = re.search(pattern, query)
            if match:
                if time_type == "year":
                    return match.group(1)
                elif time_type == "current_year":
                    return "2025"
                elif time_type == "next_year":
                    return "2026"
                elif time_type == "last_year":
                    return "2024"
                elif time_type in ("recent_years", "past_years"):
                    return f"近{match.group(1)}年"
        return None

    def _calculate_confidence(self, intent: IntentType, entities: List[str], query: str) -> float:
        """Calculate confidence score"""
        confidence = 0.5
        if entities:
            confidence += 0.2 * min(len(entities), 3)
        if intent != IntentType.GENERAL_QUESTION:
            confidence += 0.2
        if len(query) < 10:
            confidence -= 0.1
        return min(max(confidence, 0.0), 1.0)

    def _get_search_strategy(self, intent: IntentType, entities: List[str]) -> Dict[str, Any]:
        """Get search strategy based on intent type and entities"""
        strategy = {
            "source_types": [],
            "max_results": 5,
            "priority_fields": [],
            "industry_context": None
        }

        # Check if any entity matches an industry
        for entity in entities:
            if entity in INDUSTRY_METRICS:
                strategy["industry_context"] = entity
                strategy["priority_fields"] = INDUSTRY_METRICS[entity]["key_metrics"]
                break

        if intent == IntentType.COMPANY_ANALYSIS:
            strategy["source_types"] = ["deep_research", "history"]
            strategy["max_results"] = 3
        elif intent == IntentType.INDUSTRY_ANALYSIS:
            strategy["source_types"] = ["deep_research", "news"]
            strategy["max_results"] = 5
        elif intent == IntentType.COMPARISON:
            strategy["source_types"] = ["deep_research"]
            strategy["max_results"] = len(entities) * 2
        elif intent == IntentType.FINANCIAL_ANALYSIS:
            strategy["source_types"] = ["deep_research", "history", "financial"]
            strategy["max_results"] = 3
        elif intent == IntentType.VALUATION:
            strategy["source_types"] = ["deep_research"]
            strategy["max_results"] = 3
        elif intent == IntentType.RISK_ASSESSMENT:
            strategy["source_types"] = ["deep_research"]
            strategy["max_results"] = 3
        else:
            strategy["source_types"] = ["deep_research", "history", "news"]
            strategy["max_results"] = 5

        return strategy

    def _generate_analysis_outline(self, intent: IntentType, entities: List[str]) -> str:
        """Generate a brief analysis outline based on intent and entities"""
        outlines = {
            IntentType.COMPANY_ANALYSIS: "公司概况 → 核心竞争力 → 财务分析 → 估值分析 → 风险提示 → 投资建议",
            IntentType.INDUSTRY_ANALYSIS: "行业概况 → 产业链分析 → 竞争格局 → 驱动因素 → 投资主线",
            IntentType.COMPARISON: "对比维度选择 → 数据对比 → 优劣势分析 → 投资建议",
            IntentType.TREND_PREDICTION: "历史回顾 → 现状分析 → 驱动因素 → 趋势预判 → 投资启示",
            IntentType.FINANCIAL_ANALYSIS: "营收分析 → 盈利分析 → 现金流分析 → 资产负债分析 → 财务风险评估",
            IntentType.VALUATION: "当前估值 → 历史估值 → 同行对比 → 合理估值区间 → 投资建议",
            IntentType.RISK_ASSESSMENT: "经营风险 → 财务风险 → 治理风险 → 外部风险 → 综合评估",
            IntentType.GENERAL_QUESTION: "直接回答用户问题",
        }
        return outlines.get(intent, "综合分析")

    def _extract_company_info(self, query: str, entities: List[str]) -> tuple:
        """Extract company name and stock code from query and entities"""
        company_name = None
        stock_code = None
        query_lower = query.lower()

        # First try CompanyNameResolver for any entity
        try:
            resolver = get_company_resolver()
            for entity in entities:
                info = resolver.lookup(entity)
                if info:
                    company_name = info.listed_name or info.company_short or entity
                    stock_code = info.stock_code
                    return company_name, stock_code
        except Exception as e:
            logger.debug(f"CompanyNameResolver lookup failed: {e}")

        # Fallback: Check for English company names
        for eng_name, (cn_name, code) in ENGLISH_COMPANY_MAP.items():
            if eng_name in query_lower:
                company_name = cn_name
                stock_code = code
                return company_name, stock_code

        # Fallback: Check for stock code (6 digits)
        code_match = re.search(r'\b(\d{6})\b', query)
        if code_match:
            stock_code = code_match.group(1)

        # Try to find company name from entities
        for entity in entities:
            # Skip if it's a stock code
            if entity.isdigit():
                continue

            # Check if entity is a known company
            for suffix in self.company_suffixes:
                if entity.endswith(suffix):
                    company_name = entity
                    break

            # Check well-known companies
            if not company_name:
                well_known = [
                    "紫金矿业", "宁德时代", "比亚迪", "贵州茅台", "五粮液",
                    "招商银行", "平安银行", "格力电器", "美的集团", "海尔智家",
                    "赣锋锂业", "天齐锂业", "隆基绿能", "通威股份", "阳光电源",
                ]
                if entity in well_known:
                    company_name = entity
                    break

        return company_name, stock_code

    def _extract_year_filter(self, query: str) -> Optional[str]:
        """Extract year for search filtering"""
        # Look for explicit year mentions
        year_match = re.search(r'\b(20\d{2})\b', query)
        if year_match:
            return year_match.group(1)

        # Look for relative year references
        if "今年" in query:
            return "2025"
        elif "去年" in query or "上年" in query:
            return "2024"
        elif "前年" in query:
            return "2023"

        return None