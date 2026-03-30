# Agent 0: Intent Recognition and Task Decomposition
# Analyzes user query and decomposes into sub-tasks

import re
import logging
from typing import Optional, List, Dict, Any

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.task_types import (
    TaskDecomposition, SubTask, TaskType, IntentCategory,
    get_task_template, create_sub_task_from_template,
    parse_time_range, infer_clarifications
)
from utils.company_resolver import get_company_resolver

logger = logging.getLogger(__name__)


class IntentDecompositionAgent:
    """
    Agent 0: Intent Recognition and Task Decomposition

    Responsibilities:
    1. Understand user intent structurally
    2. Complete ambiguous instructions (infer what user needs)
    3. Decompose into specific sub-tasks

    Input: User's raw question
    Output: TaskDecomposition (JSON with sub-tasks)
    """

    def __init__(self):
        self.company_resolver = get_company_resolver()

        # Intent detection patterns
        self.intent_patterns = {
            IntentCategory.FINANCIAL_ANALYSIS: [
                r"(.+)(财务|业绩|盈利|营收|利润)",
                r"分析(.+)(财务|业绩)",
                r"(.+)(毛利率|净利率|ROE)",
                r"(.+)这两年.*业绩",
            ],
            IntentCategory.COMPANY_ANALYSIS: [
                r"分析(.+)",
                r"研究一下(.+)",
                r"(.+)怎么样",
                r"(.+)的投资价值",
                r"了解一下(.+)",
            ],
            IntentCategory.COMPARISON: [
                r"对比(.+)和(.+)",
                r"(.+)与(.+)对比",
                r"比较(.+)和(.+)",
                r"(.+)和(.+)哪个",
            ],
            IntentCategory.VALUATION: [
                r"(.+)估值",
                r"(.+)贵不贵",
                r"(.+)值得买",
                r"(.+)合理估值",
            ],
            IntentCategory.RISK_ASSESSMENT: [
                r"(.+)风险",
                r"(.+)有什么问题",
                r"(.+)隐患",
            ],
        }

    def decompose(self, query: str) -> TaskDecomposition:
        """
        Main entry point: decompose user query into sub-tasks

        Args:
            query: User's raw question

        Returns:
            TaskDecomposition with sub-tasks
        """
        logger.info(f"Decomposing query: {query}")

        # Step 1: Detect intent
        intent = self._detect_intent(query)

        # Step 2: Extract entity (company name)
        entity, stock_code = self._extract_entity(query)

        # Step 3: Parse time range
        time_range = parse_time_range(query)

        # Step 4: Generate clarifications
        clarifications = infer_clarifications(query, intent)

        # Step 5: Generate sub-tasks from template
        sub_tasks = self._generate_sub_tasks(intent, time_range)

        # Step 6: Customize sub-tasks based on query
        sub_tasks = self._customize_sub_tasks(sub_tasks, query)

        result = TaskDecomposition(
            user_raw=query,
            intent=intent,
            entity=entity,
            stock_code=stock_code,
            time_range=time_range,
            clarifications=clarifications,
            sub_tasks=sub_tasks
        )

        logger.info(f"Decomposition complete: intent={intent.value}, entity={entity}, tasks={len(sub_tasks)}")
        return result

    def _detect_intent(self, query: str) -> IntentCategory:
        """Detect the primary intent from query"""
        # Check patterns for each intent
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query):
                    return intent_type

        # Default to company analysis if company name detected
        entity, _ = self._extract_entity(query)
        if entity:
            return IntentCategory.COMPANY_ANALYSIS

        return IntentCategory.GENERAL_QUESTION

    def _extract_entity(self, query: str) -> tuple:
        """Extract company name and stock code from query"""
        # Try to find company using resolver
        try:
            # Check for stock code pattern
            code_match = re.search(r'\b(\d{6})\b', query)
            if code_match:
                code = code_match.group(1)
                info = self.company_resolver.get_company_by_stock_code(code)
                if info:
                    return info.listed_name, code

            # Try to match any company name variant
            info = self.company_resolver.lookup(query)
            if info:
                return info.listed_name, info.stock_code

            # Check each word in query
            words = re.findall(r'[\u4e00-\u9fa5]{2,8}', query)
            for word in words:
                info = self.company_resolver.lookup(word)
                if info:
                    return info.listed_name, info.stock_code

        except Exception as e:
            logger.debug(f"Company resolver error: {e}")

        # Fallback: extract Chinese company name patterns
        patterns = [
            r'([\u4e00-\u9fa5]{2,6}(?:股份|集团|矿业|银行|科技|能源|医药|电子))',
            r'([\u4e00-\u9fa5]{2,8})',
        ]

        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                name = match.group(1)
                # Skip common non-company words
                skip_words = ['分析', '研究', '投资', '财务', '业绩', '怎么样', '今年', '去年']
                if name not in skip_words:
                    return name, None

        return None, None

    def _generate_sub_tasks(self, intent: IntentCategory, years: List[str]) -> List[SubTask]:
        """Generate sub-tasks from template"""
        templates = get_task_template(intent)
        tasks = []

        for template in templates:
            task = create_sub_task_from_template(template, years)
            tasks.append(task)

        return tasks

    def _customize_sub_tasks(self, tasks: List[SubTask], query: str) -> List[SubTask]:
        """Customize sub-tasks based on specific query content"""
        query_lower = query.lower()

        # Add specific keywords based on query
        for task in tasks:
            if "营收" in query or "收入" in query:
                if task.task_type == TaskType.FINANCIAL_DATA:
                    task.keywords.extend(["营业收入", "主营业务收入"])

            if "利润" in query:
                if task.task_type == TaskType.FINANCIAL_DATA:
                    task.keywords.extend(["净利润", "归母净利润", "扣非净利润"])

            if "毛利" in query or "毛利率" in query:
                if task.task_type == TaskType.PROFITABILITY:
                    task.keywords.extend(["毛利率", "毛利润"])

            if "现金流" in query or "现金" in query:
                if task.task_type == TaskType.CASHFLOW:
                    task.keywords.extend(["经营现金流", "自由现金流"])

        return tasks


# Convenience function
def decompose_query(query: str) -> TaskDecomposition:
    """Decompose a user query into sub-tasks"""
    agent = IntentDecompositionAgent()
    return agent.decompose(query)


# Test code
if __name__ == "__main__":
    import json

    agent = IntentDecompositionAgent()

    test_queries = [
        "牧原股份这两年的业绩怎么样",
        "紫金矿业2024年财务数据",
        "宁德时代和比亚迪对比",
        "中煤能源估值分析",
    ]

    print("=" * 60)
    print("Agent 0: Intent Decomposition Test")
    print("=" * 60)

    for query in test_queries:
        result = agent.decompose(query)
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print(f"Intent: {result.intent.value}")
        print(f"Entity: {result.entity}")
        print(f"Stock Code: {result.stock_code}")
        print(f"Time Range: {result.time_range}")
        print(f"Clarifications:")
        for c in result.clarifications:
            print(f"  - {c}")
        print(f"Sub-tasks ({len(result.sub_tasks)}):")
        for task in result.sub_tasks:
            print(f"  [{task.id}] {task.name} (priority={task.priority})")
            print(f"      Type: {task.task_type.value}")
            print(f"      Years: {task.target_years}")
            print(f"      Keywords: {task.keywords[:5]}...")
        print()