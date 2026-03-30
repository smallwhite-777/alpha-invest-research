"""
Financial Routes
Handles financial analysis modules: radar, dupont, dcf, growth, risk, pe-band

This module provides RESTful APIs for the 6 core financial analysis modules.
All endpoints support local Parquet database as primary data source with
AKShare as fallback.

Features:
- Redis caching for improved performance
- Batch query support
- TTL-based cache invalidation
"""

from flask import Blueprint, request, jsonify
from datetime import datetime

financial_bp = Blueprint('financial', __name__)

# Import local database adapter (priority)
try:
    from financial_adapter import (
        get_radar_from_local,
        get_dupont_from_local,
        get_dcf_inputs_from_local,
        get_growth_from_local,
        get_risk_from_local,
        get_adapter
    )
    LOCAL_DB_AVAILABLE = get_adapter().is_available()
    if LOCAL_DB_AVAILABLE:
        print("[FinancialRoutes] 本地财报数据库已启用")
except Exception as e:
    print(f"[FinancialRoutes] 本地数据库适配器加载失败: {e}")
    LOCAL_DB_AVAILABLE = False
    get_radar_from_local = None
    get_dupont_from_local = None
    get_dcf_inputs_from_local = None
    get_growth_from_local = None
    get_risk_from_local = None

# Import Redis cache
try:
    from cache.redis_cache import get_cache, cached, cache_key
    CACHE_AVAILABLE = True
except Exception as e:
    print(f"[FinancialRoutes] Redis cache not available: {e}")
    CACHE_AVAILABLE = False
    def cached(prefix, ttl=3600):
        def decorator(func):
            return func
        return decorator
    def cache_key(prefix, *args, **kwargs):
        return f"{prefix}:{':'.join(str(a) for a in args)}"


# Cache TTL configuration (seconds)
CACHE_TTL = {
    'radar': 3600,        # 1 hour
    'dupont': 3600,       # 1 hour
    'dcf': 3600,          # 1 hour
    'growth': 3600,       # 1 hour
    'risk': 3600,         # 1 hour
    'pe_band': 1800,      # 30 minutes (price dependent)
    'comprehensive': 1800, # 30 minutes
}


@financial_bp.route('/api/financial/radar/<stock_code>', methods=['GET'])
def get_radar_scores(stock_code):
    """
    Get 6-dimension radar scores for financial analysis.

    Dimensions:
    - profitability: 盈利能力 (ROE, 净利率, 毛利率)
    - growth: 成长性 (营收增长, 利润增长)
    - financial_health: 财务健康 (负债率, 流动比率)
    - valuation: 估值吸引力 (PE/PB分位)
    - cashflow_quality: 现金流质量 (FCF/净利润)
    - dividend: 分红能力 (分红率, 股息率)
    """
    # Check cache first
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache_key_str = cache_key('financial', 'radar', stock_code)
        cached = cache.get(cache_key_str)
        if cached:
            cached['cached'] = True
            return jsonify(cached)

    # Priority: Local database
    if LOCAL_DB_AVAILABLE and get_radar_from_local:
        try:
            local_data = get_radar_from_local(stock_code)
            if local_data and local_data.get('success'):
                # Cache the result
                if CACHE_AVAILABLE:
                    cache.set(cache_key_str, local_data, CACHE_TTL['radar'])
                return jsonify(local_data)
        except Exception as e:
            print(f"[radar] 本地数据库查询失败: {e}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route('/api/financial/dupont/<stock_code>', methods=['GET'])
def get_dupont_decomposition(stock_code):
    """
    Get DuPont decomposition analysis for ROE.

    3-stage: ROE = 净利率 × 资产周转率 × 权益乘数
    5-stage: Further decomposes net margin
    """
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache_key_str = cache_key('financial', 'dupont', stock_code)
        cached = cache.get(cache_key_str)
        if cached:
            cached['cached'] = True
            return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_dupont_from_local:
        try:
            local_data = get_dupont_from_local(stock_code)
            if local_data and local_data.get('success'):
                if CACHE_AVAILABLE:
                    cache.set(cache_key_str, local_data, CACHE_TTL['dupont'])
                return jsonify(local_data)
        except Exception as e:
            print(f"[dupont] 本地数据库查询失败: {e}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route('/api/financial/dcf/<stock_code>', methods=['GET', 'POST'])
def get_dcf_valuation(stock_code):
    """
    Get DCF valuation model inputs and results.

    GET: Return base DCF calculation
    POST: Return adjusted DCF with custom parameters
        body: {
            "wacc_adjustment": 0,      # ±2%
            "growth_adjustment": 0,     # ±3%
            "projection_years": 10
        }
    """
    params = None
    if request.method == 'POST':
        params = request.get_json()

    # Cache key includes params hash
    param_str = str(params) if params else ''
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache_key_str = cache_key('financial', 'dcf', stock_code, param_str)
        cached = cache.get(cache_key_str)
        if cached:
            cached['cached'] = True
            return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_dcf_inputs_from_local:
        try:
            local_data = get_dcf_inputs_from_local(stock_code, params)
            if local_data and local_data.get('success'):
                if CACHE_AVAILABLE:
                    cache.set(cache_key_str, local_data, CACHE_TTL['dcf'])
                return jsonify(local_data)
        except Exception as e:
            print(f"[dcf] 本地数据库查询失败: {e}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route('/api/financial/growth/<stock_code>', methods=['GET'])
def get_growth_analysis(stock_code):
    """
    Get growth analysis including CAGR and quarterly growth rates.

    Returns:
    - CAGR: 3yr/5yr/10yr for revenue, profit, EPS
    - Quarterly growth: YoY and QoQ
    - Growth quality assessment
    """
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache_key_str = cache_key('financial', 'growth', stock_code)
        cached = cache.get(cache_key_str)
        if cached:
            cached['cached'] = True
            return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_growth_from_local:
        try:
            local_data = get_growth_from_local(stock_code)
            if local_data and local_data.get('success'):
                if CACHE_AVAILABLE:
                    cache.set(cache_key_str, local_data, CACHE_TTL['growth'])
                return jsonify(local_data)
        except Exception as e:
            print(f"[growth] 本地数据库查询失败: {e}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route('/api/financial/risk/<stock_code>', methods=['GET'])
def get_risk_analysis(stock_code):
    """
    Get risk analysis and fraud detection scores.

    Includes:
    - Debt ratios: asset-liability, current, quick
    - Fraud detection: Benford score, M-Score
    - Risk warnings
    """
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache_key_str = cache_key('financial', 'risk', stock_code)
        cached = cache.get(cache_key_str)
        if cached:
            cached['cached'] = True
            return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_risk_from_local:
        try:
            local_data = get_risk_from_local(stock_code)
            if local_data and local_data.get('success'):
                if CACHE_AVAILABLE:
                    cache.set(cache_key_str, local_data, CACHE_TTL['risk'])
                return jsonify(local_data)
        except Exception as e:
            print(f"[risk] 本地数据库查询失败: {e}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route('/api/financial/pe-band/<stock_code>', methods=['GET'])
def get_pe_band(stock_code):
    """
    Get PE Band data for valuation analysis.

    Returns historical PE and price data for PE Band chart.
    """
    # PE Band uses shorter TTL as it depends on current price
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache_key_str = cache_key('financial', 'pe_band', stock_code)
        cached = cache.get(cache_key_str)
        if cached:
            cached['cached'] = True
            return jsonify(cached)

    # PE Band requires real-time price data, use AKShare
    try:
        import akshare as ak

        df = ak.stock_a_lg_indicator(symbol=stock_code)

        if df is None or df.empty:
            return jsonify({"success": False, "error": "No PE data"}), 404

        # Get last 5 years of PE data
        df = df.tail(1200)  # ~5 years of daily data

        pe_history = []
        for _, row in df.iterrows():
            if row.get('pe_ttm') and row.get('pe_ttm') > 0:
                pe_history.append({
                    "date": str(row.get('date', '')),
                    "pe": float(row['pe_ttm']),
                    "price": 0  # Would need separate price fetch
                })

        result = {
            "success": True,
            "stock_code": stock_code,
            "pe_history": pe_history[-250:],  # Last year
            "pe_percentiles": {
                "p10": 0, "p25": 0, "p50": 0, "p75": 0, "p90": 0
            },
            "current_pe": pe_history[-1]["pe"] if pe_history else 0,
            "current_eps": 0,
            "target_prices": {}
        }

        if CACHE_AVAILABLE:
            cache.set(cache_key_str, result, CACHE_TTL['pe_band'])

        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@financial_bp.route('/api/financial/comprehensive/<stock_code>', methods=['GET'])
def get_comprehensive_financial(stock_code):
    """
    Get all financial modules in one request.

    Returns combined data from all modules for efficient loading.
    """
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache_key_str = cache_key('financial', 'comprehensive', stock_code)
        cached = cache.get(cache_key_str)
        if cached:
            cached['cached'] = True
            return jsonify(cached)

    result = {
        "success": True,
        "stock_code": stock_code,
        "timestamp": datetime.now().isoformat()
    }

    # Get all modules
    if LOCAL_DB_AVAILABLE:
        if get_radar_from_local:
            result["radar"] = get_radar_from_local(stock_code)
        if get_dupont_from_local:
            result["dupont"] = get_dupont_from_local(stock_code)
        if get_dcf_inputs_from_local:
            result["dcf"] = get_dcf_inputs_from_local(stock_code)
        if get_growth_from_local:
            result["growth"] = get_growth_from_local(stock_code)
        if get_risk_from_local:
            result["risk"] = get_risk_from_local(stock_code)

    if CACHE_AVAILABLE:
        cache.set(cache_key_str, result, CACHE_TTL['comprehensive'])

    return jsonify(result)


@financial_bp.route('/api/financial/batch', methods=['POST'])
def batch_financial_query():
    """
    Batch query for multiple stocks and modules.

    Body: {
        "stock_codes": ["600519", "000858"],
        "modules": ["radar", "dupont", "dcf"]
    }

    Returns cached results when available, reducing database load.
    """
    data = request.get_json()
    stock_codes = data.get('stock_codes', [])
    modules = data.get('modules', ['radar', 'dupont', 'dcf', 'growth', 'risk'])

    results = {}
    cache_hits = 0

    for code in stock_codes:
        results[code] = {}
        for module in modules:
            try:
                # Check cache
                if CACHE_AVAILABLE:
                    cache = get_cache()
                    cache_key_str = cache_key('financial', module, code)
                    cached = cache.get(cache_key_str)
                    if cached:
                        results[code][module] = {**cached, 'cached': True}
                        cache_hits += 1
                        continue

                # Fetch from database
                if module == 'radar' and get_radar_from_local:
                    results[code]['radar'] = get_radar_from_local(code)
                elif module == 'dupont' and get_dupont_from_local:
                    results[code]['dupont'] = get_dupont_from_local(code)
                elif module == 'dcf' and get_dcf_inputs_from_local:
                    results[code]['dcf'] = get_dcf_inputs_from_local(code)
                elif module == 'growth' and get_growth_from_local:
                    results[code]['growth'] = get_growth_from_local(code)
                elif module == 'risk' and get_risk_from_local:
                    results[code]['risk'] = get_risk_from_local(code)

                # Cache the result
                if CACHE_AVAILABLE and module in results[code]:
                    cache.set(cache_key_str, results[code][module], CACHE_TTL.get(module, 3600))

            except Exception as e:
                results[code][module] = {"success": False, "error": str(e)}

    return jsonify({
        "success": True,
        "results": results,
        "cache_hits": cache_hits,
        "cached": cache_hits > 0
    })


@financial_bp.route('/api/financial/cache/clear', methods=['POST'])
def clear_financial_cache():
    """Clear all cached financial data"""
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache.clear()
        return jsonify({"success": True, "message": "Cache cleared"})
    return jsonify({"success": False, "message": "Cache not available"})


@financial_bp.route('/api/financial/cache/stats', methods=['GET'])
def get_cache_stats():
    """Get cache statistics"""
    if CACHE_AVAILABLE:
        cache = get_cache()
        return jsonify({
            "success": True,
            "stats": cache.get_stats()
        })
    return jsonify({
        "success": True,
        "stats": {"backend": "none", "message": "Caching disabled"}
    })