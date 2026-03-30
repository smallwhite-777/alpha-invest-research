"""
财务API响应速度测试
验证本地数据库优化效果
"""

import requests
import time
from datetime import datetime

PYTHON_BACKEND_URL = "http://localhost:5001"

def test_api_speed(name, url, expected_max_ms=5000):
    """测试API响应速度"""
    try:
        start = time.time()
        resp = requests.get(url, timeout=30)
        elapsed_ms = (time.time() - start) * 1000

        if resp.status_code == 200:
            data = resp.json()
            data_source = data.get('data_source', 'unknown')
            success = data.get('success', False)
            return True, elapsed_ms, data_source, success
        else:
            return False, elapsed_ms, f"HTTP {resp.status_code}", False
    except requests.exceptions.Timeout:
        return False, 30000, "Timeout", False
    except Exception as e:
        return False, 0, str(e)[:30], False

def main():
    print("=" * 70)
    print("[财务API速度测试] 本地数据库优化验证")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    print()

    # 测试股票代码
    stock_code = "600519"

    tests = [
        # 财务分析API
        ("Radar雷达评分", f"{PYTHON_BACKEND_URL}/api/financial/radar/{stock_code}", 5000),
        ("Dupont杜邦分解", f"{PYTHON_BACKEND_URL}/api/financial/dupont/{stock_code}", 5000),
        ("DCF估值输入", f"{PYTHON_BACKEND_URL}/api/financial/dcf/{stock_code}", 10000),
        ("Growth成长分析", f"{PYTHON_BACKEND_URL}/api/financial/growth/{stock_code}", 5000),
        ("Risk风险预警", f"{PYTHON_BACKEND_URL}/api/financial/risk/{stock_code}", 5000),
        ("PE-Band", f"{PYTHON_BACKEND_URL}/api/financial/pe-band/{stock_code}", 10000),

        # 其他API
        ("股票价格", f"{PYTHON_BACKEND_URL}/api/stock/price/{stock_code}", 10000),
        ("热门股票", f"{PYTHON_BACKEND_URL}/api/stock/hot?count=5", 10000),
    ]

    results = []
    total_time = 0

    for name, url, max_ms in tests:
        success, elapsed, detail, api_success = test_api_speed(name, url, max_ms)
        total_time += elapsed

        status = "PASS" if success and elapsed < max_ms else "FAIL"
        speed_indicator = "FAST" if elapsed < 1000 else "OK" if elapsed < 5000 else "SLOW"

        print(f"{name:20} [{status:4}] {speed_indicator:4} {elapsed:7.1f}ms  {detail}")

        results.append({
            'name': name,
            'success': success,
            'elapsed': elapsed,
            'data_source': detail
        })

    print()
    print("=" * 70)
    passed = sum(1 for r in results if r['success'])
    local_count = sum(1 for r in results if '本地' in str(r['data_source']))

    print(f"结果: {passed}/{len(results)} 通过, 总耗时: {total_time/1000:.2f}s")
    print(f"本地数据源: {local_count} 个API使用本地财报数据库")

    if passed == len(results):
        print("\n[OK] 所有财务API响应正常！")
    elif passed >= len(results) * 0.7:
        print("\n[WARN] 大部分API正常，部分可能需要检查")
    else:
        print("\n[ERROR] 多个API异常，请检查后端服务")

    return passed == len(results)

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)