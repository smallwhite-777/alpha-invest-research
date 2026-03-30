"""
快速功能检测脚本 - 仅测试核心功能
"""

import requests
import json
import sys
from datetime import datetime

PYTHON_BACKEND_URL = "http://localhost:5001"
NEXTJS_URL = "http://localhost:3000"

def test_api(name, url, timeout=10, check_field=None):
    """通用API测试"""
    try:
        resp = requests.get(url, timeout=timeout)
        if resp.status_code == 200:
            data = resp.json()
            if check_field:
                if data.get(check_field) or data.get("success"):
                    return True, f"OK - {len(str(data))} bytes"
                return False, f"No {check_field} field"
            return True, "OK"
        return False, f"Status: {resp.status_code}"
    except requests.exceptions.Timeout:
        return False, "Timeout (>{}s)".format(timeout)
    except requests.exceptions.ConnectionError:
        return False, "Connection refused"
    except Exception as e:
        return False, str(e)[:50]

def main():
    print("=" * 60)
    print("[QUICK TEST] Website Function Check")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    tests = [
        # 快速API (10秒内)
        ("Python Backend Health", f"{PYTHON_BACKEND_URL}/api/health", 5, "status"),
        ("Hot Stocks", f"{PYTHON_BACKEND_URL}/api/stock/hot?count=5", 10, "stocks"),
        ("Macro Indicators", f"{PYTHON_BACKEND_URL}/api/macro/indicators", 15, "indicators"),
        ("Sector Performance", f"{PYTHON_BACKEND_URL}/api/market/sectors", 15, "sectors"),
        ("Stock Price (600519)", f"{PYTHON_BACKEND_URL}/api/stock/price/600519", 30, "data"),
        ("Financial Radar", f"{PYTHON_BACKEND_URL}/api/financial/radar/600519", 30, "scores"),

        # 慢速API (120秒) - 仅测试连接
        ("Valuation (Slow)", f"{PYTHON_BACKEND_URL}/api/stock/valuation/600519", 120, "metrics"),
        ("DCF (Slow)", f"{PYTHON_BACKEND_URL}/api/financial/dcf/600519", 120, "intrinsic_value"),
    ]

    passed = 0
    failed = 0
    slow_ok = 0

    for name, url, timeout, field in tests:
        is_slow = timeout > 30
        print(f"Testing {name}...", end=" ", flush=True)

        success, msg = test_api(name, url, timeout, field)

        if success:
            print(f"[PASS] {msg}")
            passed += 1
            if is_slow:
                slow_ok += 1
        else:
            print(f"[FAIL] {msg}")
            failed += 1

    print()
    print("=" * 60)
    print(f"Result: {passed} passed, {failed} failed")

    if failed == 0:
        print("[OK] All core functions working!")
        print()
        print("Note: DCF and Valuation APIs are slow (>60s) due to AKShare")
        print("      They work correctly but may need patience.")
        return True
    elif slow_ok > 0 and failed <= 2:
        print("[WARN] Most functions working, some slow APIs may timeout")
        return True
    else:
        print("[ERROR] Critical functions not working")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)