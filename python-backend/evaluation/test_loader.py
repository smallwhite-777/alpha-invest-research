"""
测试用例加载器
从test文件夹加载所有测试问题和标准答案
"""

import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class TestCase:
    """测试用例"""
    test_id: str
    question: str
    expected_answer: str
    company_name: str
    test_group: str  # anchor, same_type, cross, time
    weight: float
    description: str = ""


class TestCaseLoader:
    """测试用例加载器"""

    # 测试用例配置
    TEST_CONFIG = {
        "Q1": {
            "group": "anchor",
            "weight": 1.0,
            "company": "三一重工",
            "description": "锚点任务 - 基础拟合能力"
        },
        "Q2": {
            "group": "same_type",
            "weight": 0.8,
            "company": "恒立液压",
            "description": "同类迁移 - 零部件框架迁移"
        },
        "Q3": {
            "group": "cross",
            "weight": 0.8,
            "company": "牧原股份",
            "description": "跨行业迁移 - 养殖业框架"
        },
        "Q4": {
            "group": "cross",
            "weight": 0.8,
            "company": "爱尔眼科",
            "description": "跨行业迁移 - 医疗服务框架"
        },
        "Q5": {
            "group": "time",
            "weight": 0.8,
            "company": "三一重工",
            "description": "时间扰动 - 历史态处理"
        },
        "Q6": {
            "group": "same_type",
            "weight": 0.8,
            "company": "徐工机械",
            "description": "同类迁移 - 整机厂差异化"
        },
        "Q7": {
            "group": "anchor",
            "weight": 1.0,
            "company": "三一重工",
            "description": "锚点任务 - 完整拟合能力"
        }
    }

    def __init__(self, test_dir: str = "test"):
        self.test_dir = Path(test_dir)

    def load_all_tests(self) -> Dict[str, TestCase]:
        """加载所有测试用例"""
        tests = {}

        for test_id, config in self.TEST_CONFIG.items():
            test_case = self.load_test(test_id)
            if test_case:
                tests[test_id] = test_case

        return tests

    def load_test(self, test_id: str) -> Optional[TestCase]:
        """加载单个测试用例"""
        config = self.TEST_CONFIG.get(test_id)
        if not config:
            return None

        # 读取问题
        question = self._read_question(test_id)
        if not question:
            print(f"[Warning] Could not load question for {test_id}")
            question = f"请分析{config['company']}的投资价值"

        # 读取标准答案
        expected_answer = self._read_answer(test_id)
        if not expected_answer:
            print(f"[Warning] Could not load answer for {test_id}")
            expected_answer = ""

        return TestCase(
            test_id=test_id,
            question=question,
            expected_answer=expected_answer,
            company_name=config["company"],
            test_group=config["group"],
            weight=config["weight"],
            description=config["description"]
        )

    def _read_question(self, test_id: str) -> str:
        """读取问题文件"""
        q_file = self.test_dir / f"test_{test_id.lower()}.md"

        if not q_file.exists():
            # 尝试不同的文件名格式
            q_file = self.test_dir / f"test_q{test_id[1]}.md"

        if not q_file.exists():
            return ""

        content = self._read_file(q_file)

        # 提取问题（通常在"测试问题"或"## 测试问题"之后）
        question = self._extract_question(content)
        return question

    def _read_answer(self, test_id: str) -> str:
        """读取标准答案文件"""
        a_file = self.test_dir / f"test_a{test_id[1].lower()}.md"

        if not a_file.exists():
            return ""

        return self._read_file(a_file)

    def _read_file(self, file_path: Path) -> str:
        """读取文件内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"[Error] Failed to read {file_path}: {e}")
            return ""

    def _extract_question(self, content: str) -> str:
        """从内容中提取问题"""
        # 尝试匹配"**问题**"格式
        match = re.search(r'\*\*(.+?)\*\*', content)
        if match:
            return match.group(1)

        # 尝试匹配"测试问题"后的内容
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if '测试问题' in line or '问题' in line:
                # 返回下一行或当前行的内容
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line and not next_line.startswith('#'):
                        return next_line

        # 返回整个内容
        return content.strip()

    def get_tests_by_group(self, tests: Dict[str, TestCase], group: str) -> List[TestCase]:
        """按组获取测试用例"""
        return [t for t in tests.values() if t.test_group == group]

    def get_anchor_tests(self, tests: Dict[str, TestCase]) -> List[TestCase]:
        """获取锚点测试用例"""
        return self.get_tests_by_group(tests, "anchor")

    def get_same_type_tests(self, tests: Dict[str, TestCase]) -> List[TestCase]:
        """获取同类迁移测试用例"""
        return self.get_tests_by_group(tests, "same_type")

    def get_cross_industry_tests(self, tests: Dict[str, TestCase]) -> List[TestCase]:
        """获取跨行业迁移测试用例"""
        return self.get_tests_by_group(tests, "cross")

    def get_time_tests(self, tests: Dict[str, TestCase]) -> List[TestCase]:
        """获取时间扰动测试用例"""
        return self.get_tests_by_group(tests, "time")


def main():
    """测试加载器"""
    loader = TestCaseLoader("test")
    tests = loader.load_all_tests()

    print(f"Loaded {len(tests)} test cases:")
    for test_id, test in tests.items():
        print(f"  {test_id}: {test.company_name} ({test.test_group})")
        print(f"    Question: {test.question[:50]}...")
        print(f"    Answer length: {len(test.expected_answer)} chars")


if __name__ == "__main__":
    main()