"""
网站功能检测脚本
检测所有关键功能是否正常工作
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Tuple

# 配置
PYTHON_BACKEND_URL = "http://localhost:5001"
NEXTJS_URL = "http://localhost:3000"

class TestResult:
    def __init__(self, name: str, success: bool, message: str = "", data: any = None):
        self.name = name
        self.success = success
        self.message = message
        self.data = data

    def __str__(self):
        status = "[PASS]" if self.success else "[FAIL]"
        return f"{status} | {self.name}: {self.message}"


def test_python_backend_health() -> TestResult:
    """测试Python后端健康状态"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/health", timeout=5)
        if resp.status_code == 200:
            return TestResult("Python后端健康检查", True, "后端运行正常")
        return TestResult("Python后端健康检查", False, f"状态码: {resp.status_code}")
    except requests.exceptions.ConnectionError:
        return TestResult("Python后端健康检查", False, "无法连接到后端 - 请启动Python后端")
    except Exception as e:
        return TestResult("Python后端健康检查", False, f"错误: {str(e)}")


def test_macro_indicators() -> TestResult:
    """测试宏观指标API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/macro/indicators", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success") and len(data.get("indicators", [])) > 0:
                return TestResult("宏观指标API", True, f"返回{len(data['indicators'])}个指标")
            return TestResult("宏观指标API", False, "无数据返回")
        return TestResult("宏观指标API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("宏观指标API", False, f"错误: {str(e)}")


def test_sector_performance() -> TestResult:
    """测试板块行情API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/market/sectors", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success") and len(data.get("sectors", [])) > 0:
                return TestResult("板块行情API", True, f"返回{len(data['sectors'])}个板块")
            return TestResult("板块行情API", False, "无数据返回")
        return TestResult("板块行情API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("板块行情API", False, f"错误: {str(e)}")


def test_hot_stocks() -> TestResult:
    """测试热门股票API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/stock/hot?count=10", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("stocks") and len(data["stocks"]) > 0:
                stocks = data["stocks"]
                has_price = any(s.get("price") for s in stocks)
                if has_price:
                    return TestResult("热门股票API", True, f"返回{len(stocks)}只股票, 有价格数据")
                return TestResult("热门股票API", True, f"返回{len(stocks)}只股票, 但无价格数据")
            return TestResult("热门股票API", False, "无股票数据返回")
        return TestResult("热门股票API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("热门股票API", False, f"错误: {str(e)}")


def test_stock_search() -> TestResult:
    """测试股票搜索API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/stock/search?keyword=茅台", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("stocks") and len(data["stocks"]) > 0:
                return TestResult("股票搜索API", True, f"搜索'茅台'返回{len(data['stocks'])}条结果")
            return TestResult("股票搜索API", False, "搜索无结果")
        return TestResult("股票搜索API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("股票搜索API", False, f"错误: {str(e)}")


def test_stock_price() -> TestResult:
    """测试股票价格API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/stock/price/600519", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success") and data.get("data"):
                closes = data["data"].get("close", [])
                if closes and len(closes) > 0:
                    return TestResult("股票价格API", True, f"茅台价格: {closes[-1]:.2f}元")
                return TestResult("股票价格API", False, "无价格数据")
            return TestResult("股票价格API", False, "API返回失败")
        return TestResult("股票价格API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("股票价格API", False, f"错误: {str(e)}")


def test_financial_radar() -> TestResult:
    """测试财务雷达API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/financial/radar/600519", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success") and data.get("scores"):
                return TestResult("财务雷达API", True, f"综合评分: {data.get('composite_score', 'N/A')}")
            return TestResult("财务雷达API", False, "无雷达数据")
        return TestResult("财务雷达API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("财务雷达API", False, f"错误: {str(e)}")


def test_dcf_valuation() -> TestResult:
    """测试DCF估值API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/financial/dcf/600519", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                intrinsic = data.get("intrinsic_value", 0)
                current = data.get("current_price", 0)
                margin = data.get("margin_of_safety", 0)
                shares = data.get("shares_outstanding", 0)

                # 检查DCF结果是否合理
                if shares > 0 and intrinsic > 0:
                    # 内在价值不应该超过当前价格10倍以上
                    if intrinsic > current * 10:
                        return TestResult("DCF估值API", False,
                            f"内在价值({intrinsic:.2f})远超当前价格({current:.2f}), 可能计算错误")
                    return TestResult("DCF估值API", True,
                        f"内在价值: {intrinsic:.2f}元, 当前价: {current:.2f}元, 股本: {shares:.2f}亿股")
                else:
                    return TestResult("DCF估值API", False,
                        f"股本数据缺失: shares={shares}, intrinsic={intrinsic}")
            return TestResult("DCF估值API", False, f"API返回失败: {data.get('error', 'Unknown')}")
        return TestResult("DCF估值API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("DCF估值API", False, f"错误: {str(e)}")


def test_valuation_metrics() -> TestResult:
    """测试估值指标API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/stock/valuation/600519", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success") and data.get("metrics"):
                m = data["metrics"]
                pe = m.get("pe_ttm")
                pb = m.get("pb")
                market_cap = m.get("market_cap")
                industry = data.get("stock_info", {}).get("industry", "")

                info_parts = []
                if pe: info_parts.append(f"PE={pe}")
                if pb: info_parts.append(f"PB={pb}")
                if market_cap: info_parts.append(f"市值={market_cap}")
                if industry: info_parts.append(f"行业={industry}")

                return TestResult("估值指标API", True, ", ".join(info_parts) if info_parts else "部分数据缺失")
            return TestResult("估值指标API", False, "无估值数据")
        return TestResult("估值指标API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("估值指标API", False, f"错误: {str(e)}")


def test_scheduler_status() -> TestResult:
    """测试定时任务状态"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/scheduler/status", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("running"):
                return TestResult("定时任务状态", True, f"运行中, {len(data.get('tasks', []))}个任务")
            return TestResult("定时任务状态", True, "未启用(可选)")
        return TestResult("定时任务状态", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("定时任务状态", False, f"错误: {str(e)}")


def test_news_api() -> TestResult:
    """测试新闻API"""
    try:
        resp = requests.get(f"{PYTHON_BACKEND_URL}/api/news/hot?count=5", timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("news") and len(data["news"]) > 0:
                return TestResult("新闻API", True, f"返回{len(data['news'])}条新闻")
            return TestResult("新闻API", True, "API正常但暂无新闻数据")
        return TestResult("新闻API", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("新闻API", False, f"错误: {str(e)}")


def test_nextjs_api() -> TestResult:
    """测试Next.js API代理"""
    try:
        resp = requests.get(f"{NEXTJS_URL}/api/stock/hot?count=5", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("stocks"):
                return TestResult("Next.js API代理", True, f"代理正常, 返回{len(data['stocks'])}只股票")
            return TestResult("Next.js API代理", False, "代理返回空数据")
        return TestResult("Next.js API代理", False, f"状态码: {resp.status_code}")
    except requests.exceptions.ConnectionError:
        return TestResult("Next.js API代理", False, "无法连接 - 请启动Next.js前端")
    except Exception as e:
        return TestResult("Next.js API代理", False, f"错误: {str(e)}")


def test_intelligence_db() -> TestResult:
    """测试情报数据库"""
    try:
        resp = requests.get(f"{NEXTJS_URL}/api/intelligence?limit=5", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            total = data.get("total", 0)
            items = data.get("items", [])
            if total > 0:
                return TestResult("情报数据库", True, f"共{total}条情报, 返回{len(items)}条")
            return TestResult("情报数据库", True, "数据库正常但暂无情报数据")
        return TestResult("情报数据库", False, f"状态码: {resp.status_code}")
    except Exception as e:
        return TestResult("情报数据库", False, f"错误: {str(e)}")


def run_all_tests():
    """运行所有测试"""
    print("=" * 60)
    print("[TEST] 网站功能检测报告")
    print(f"   时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    tests = [
        ("后端服务", [
            test_python_backend_health,
            test_scheduler_status,
        ]),
        ("数据API", [
            test_macro_indicators,
            test_sector_performance,
            test_hot_stocks,
            test_news_api,
        ]),
        ("股票功能", [
            test_stock_search,
            test_stock_price,
            test_valuation_metrics,
        ]),
        ("财务分析", [
            test_financial_radar,
            test_dcf_valuation,
        ]),
        ("前端服务", [
            test_nextjs_api,
            test_intelligence_db,
        ]),
    ]

    results: List[TestResult] = []
    passed = 0
    failed = 0

    for category, test_funcs in tests:
        print(f"\n>> {category}")
        print("-" * 40)
        for test_func in test_funcs:
            result = test_func()
            results.append(result)
            print(f"  {result}")
            if result.success:
                passed += 1
            else:
                failed += 1

    print("\n" + "=" * 60)
    print(f"[RESULT] 测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)

    # 关键功能检查
    critical_failures = [r for r in results if not r.success and
                        "Python后端" in r.name or "股票价格" in r.name or "DCF" in r.name]

    if critical_failures:
        print("\n[WARNING] 关键问题:")
        for r in critical_failures:
            print(f"  - {r.name}: {r.message}")
        print("\n请先修复以上关键问题后再测试。")
        return False

    if failed == 0:
        print("\n[OK] 所有功能正常，可以进行用户测试。")
        return True
    else:
        print(f"\n[WARNING] 有 {failed} 项测试失败，建议修复后再测试。")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)