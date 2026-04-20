"""
Financial routes.

Provides local-database-first implementations for radar, dupont, dcf,
growth, risk, and PE band endpoints with graceful degradation.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import math
from typing import Any, Dict, List, Optional

from flask import Blueprint, jsonify, request

financial_bp = Blueprint("financial", __name__)

try:
    from financial_adapter import (
        get_adapter,
        get_dcf_inputs_from_local,
        get_dupont_from_local,
        get_growth_from_local,
        get_radar_from_local,
        get_risk_from_local,
    )

    LOCAL_DB_AVAILABLE = get_adapter().is_available()
    if LOCAL_DB_AVAILABLE:
        print("[FinancialRoutes] 本地财报数据库已启用")
except Exception as exc:
    print(f"[FinancialRoutes] 本地数据库适配器加载失败: {exc}")
    LOCAL_DB_AVAILABLE = False
    get_adapter = None
    get_dcf_inputs_from_local = None
    get_dupont_from_local = None
    get_growth_from_local = None
    get_radar_from_local = None
    get_risk_from_local = None

try:
    from cache.redis_cache import cache_key, get_cache

    CACHE_AVAILABLE = True
except Exception as exc:
    print(f"[FinancialRoutes] Redis cache not available: {exc}")
    CACHE_AVAILABLE = False

    def cache_key(prefix, *args, **kwargs):
        return f"{prefix}:{':'.join(str(a) for a in args)}"


CACHE_TTL = {
    "radar": 3600,
    "dupont": 3600,
    "dcf": 3600,
    "growth": 3600,
    "risk": 3600,
    "pe_band": 1800,
    "comprehensive": 1800,
}


def _normalize_stock_code(stock_code: str) -> str:
    return "".join(ch for ch in str(stock_code).strip() if ch.isdigit())


def _get_cache_value(key: str) -> Optional[Dict[str, Any]]:
    if not CACHE_AVAILABLE:
        return None
    cache = get_cache()
    cached = cache.get(key)
    if cached:
        cached["cached"] = True
    return cached


def _set_cache_value(key: str, value: Dict[str, Any], ttl: int) -> None:
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache.set(key, value, ttl)


def _get_stock_adapter():
    from skills import get_stock_adapter

    return get_stock_adapter()


def _get_current_price(stock_code: str) -> float:
    start_date = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")
    result = _get_stock_adapter().get_stock_price(stock_code, start_date=start_date)
    if result.get("success"):
        closes = result.get("data", {}).get("close", [])
        if closes:
            return float(closes[-1])
    return 0.0


def _get_price_series(stock_code: str) -> Dict[str, List[Any]]:
    start_date = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")
    result = _get_stock_adapter().get_stock_price(stock_code, start_date=start_date)
    if result.get("success"):
        return result.get("data", {})
    return {}


def _get_latest_financial_row(stock_code: str) -> Dict[str, Any]:
    if not LOCAL_DB_AVAILABLE or not get_adapter:
        return {}

    data_by_year = get_adapter().get_latest_financial_data(stock_code, years=2)
    if not data_by_year:
        return {}

    latest_year = sorted(data_by_year.keys())[-1]
    latest = dict(data_by_year.get(latest_year, {}))
    latest["year"] = latest_year
    return latest


def _estimate_shares_outstanding(latest_row: Dict[str, Any]) -> Optional[float]:
    total_equity = latest_row.get("total_equity")
    bps = latest_row.get("bps")
    if not total_equity or not bps or bps <= 0:
        return None
    return float(total_equity) / float(bps)


def _percentile(values: List[float], ratio: float, fallback: float = 0.0) -> float:
    cleaned = sorted(v for v in values if v is not None and v > 0)
    if not cleaned:
        return fallback
    index = min(len(cleaned) - 1, max(0, int(round((len(cleaned) - 1) * ratio))))
    return round(cleaned[index], 2)


def _compute_dcf_payload(stock_code: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    params = params or {}
    wacc_adjustment = float(params.get("wacc_adjustment", 0) or 0)
    growth_adjustment = float(params.get("growth_adjustment", 0) or 0)
    projection_years = int(params.get("projection_years", 10) or 10)

    local_inputs = get_dcf_inputs_from_local(stock_code) if LOCAL_DB_AVAILABLE and get_dcf_inputs_from_local else {}
    latest_row = _get_latest_financial_row(stock_code)
    current_price = _get_current_price(stock_code)

    wacc_base = 10.0
    growth_base = 3.0
    wacc_used = max(4.0, min(20.0, wacc_base + wacc_adjustment))
    growth_used = max(0.0, min(8.0, growth_base + growth_adjustment))

    fcf_base = float(local_inputs.get("fcf_base", 0) or 0)
    fcf_history = list(local_inputs.get("fcf_history", []) or [])
    shares_outstanding = _estimate_shares_outstanding(latest_row)

    if not fcf_base or not shares_outstanding:
        intrinsic_value = round(current_price, 2) if current_price else 0.0
        return {
            "success": True,
            "stock_code": stock_code,
            "intrinsic_value": intrinsic_value,
            "current_price": current_price,
            "margin_of_safety": 0.0,
            "wacc_base": wacc_base,
            "growth_base": growth_base,
            "wacc_used": wacc_used,
            "growth_used": growth_used,
            "wacc_adjustment": wacc_adjustment,
            "growth_adjustment": growth_adjustment,
            "fcf_projection": [],
            "fcf_history": fcf_history,
            "sensitivity_matrix": [],
            "data_source": "fallback",
        }

    initial_growth = float(local_inputs.get("fcf_cagr", 8.0) or 8.0) / 100.0
    initial_growth = max(0.03, min(initial_growth, 0.18))

    def _project_value(wacc_value: float, terminal_growth: float) -> Dict[str, Any]:
        projections: List[float] = []
        fcf = fcf_base
        for year in range(projection_years):
            if projection_years == 1:
                growth_rate = terminal_growth / 100.0
            else:
                progress = year / max(1, projection_years - 1)
                growth_rate = initial_growth + ((terminal_growth / 100.0) - initial_growth) * progress
            fcf *= 1 + growth_rate
            projections.append(fcf)

        pv_fcf = sum(value / ((1 + wacc_value / 100.0) ** (idx + 1)) for idx, value in enumerate(projections))
        terminal_fcf = projections[-1] * (1 + terminal_growth / 100.0)
        spread = max(0.5, wacc_value - terminal_growth)
        terminal_value = terminal_fcf / (spread / 100.0)
        pv_terminal = terminal_value / ((1 + wacc_value / 100.0) ** projection_years)
        total_value_yi = pv_fcf + pv_terminal
        intrinsic = total_value_yi * 1e8 / shares_outstanding
        return {
            "intrinsic_value": intrinsic,
            "fcf_projection": projections,
            "total_value_yi": total_value_yi,
        }

    base_projection = _project_value(wacc_used, growth_used)
    intrinsic_value = round(base_projection["intrinsic_value"], 2)
    margin_of_safety = (
        round((intrinsic_value - current_price) / current_price * 100, 2) if current_price else 0.0
    )

    sensitivity_matrix = []
    for w_delta in (-2.0, -1.0, 0.0, 1.0, 2.0):
        for g_delta in (-1.0, -0.5, 0.0, 0.5, 1.0):
            wacc_candidate = max(4.0, wacc_used + w_delta)
            growth_candidate = max(0.0, min(wacc_candidate - 0.5, growth_used + g_delta))
            candidate = _project_value(wacc_candidate, growth_candidate)
            sensitivity_matrix.append(
                {
                    "wacc": round(wacc_candidate, 2),
                    "g": round(growth_candidate, 2),
                    "value": round(candidate["intrinsic_value"], 2),
                }
            )

    return {
        "success": True,
        "stock_code": stock_code,
        "intrinsic_value": intrinsic_value,
        "current_price": round(current_price, 2),
        "margin_of_safety": margin_of_safety,
        "wacc_base": wacc_base,
        "growth_base": growth_base,
        "wacc_used": round(wacc_used, 2),
        "growth_used": round(growth_used, 2),
        "wacc_adjustment": wacc_adjustment,
        "growth_adjustment": growth_adjustment,
        "fcf_projection": [round(value, 2) for value in base_projection["fcf_projection"]],
        "fcf_history": fcf_history,
        "sensitivity_matrix": sensitivity_matrix,
        "data_source": local_inputs.get("data_source", "local financial database"),
    }


def _compute_pe_band_payload(stock_code: str) -> Dict[str, Any]:
    latest_row = _get_latest_financial_row(stock_code)
    price_series = _get_price_series(stock_code)
    dates = price_series.get("dates", []) or []
    closes = price_series.get("close", []) or []

    eps = float(latest_row.get("eps", 0) or 0)
    bps = float(latest_row.get("bps", 0) or 0)
    current_price = float(closes[-1]) if closes else 0.0

    pe_history = []
    pe_values: List[float] = []
    if eps > 0:
        for date, close in zip(dates, closes):
            pe = float(close) / eps if close else 0.0
            if pe > 0:
                pe_history.append({"date": str(date), "pe": round(pe, 2), "price": round(float(close), 2)})
                pe_values.append(pe)

    current_pe = round(pe_values[-1], 2) if pe_values else 0.0
    pe_percentiles = {
        "p10": _percentile(pe_values, 0.10, current_pe),
        "p25": _percentile(pe_values, 0.25, current_pe),
        "p50": _percentile(pe_values, 0.50, current_pe),
        "p75": _percentile(pe_values, 0.75, current_pe),
        "p90": _percentile(pe_values, 0.90, current_pe),
    }

    def _target_price(pe_multiple: float) -> float:
        return round(pe_multiple * eps, 2) if eps > 0 else 0.0

    optimistic = _target_price(pe_percentiles["p90"])
    neutral = _target_price(pe_percentiles["p50"])
    pessimistic = _target_price(pe_percentiles["p10"])

    def _upside(target: float) -> float:
        if not current_price:
            return 0.0
        return round((target - current_price) / current_price * 100, 1)

    graham_number = round(math.sqrt(max(22.5 * eps * max(bps, 0), 0.0)), 2) if eps > 0 and bps > 0 else 0.0

    return {
        "success": True,
        "stock_code": stock_code,
        "pe_history": pe_history[-250:],
        "pe_percentiles": pe_percentiles,
        "current_pe": current_pe,
        "current_eps": round(eps, 4),
        "target_prices": {
            "optimistic": optimistic,
            "neutral": neutral,
            "pessimistic": pessimistic,
            "upside_potential": {
                "optimistic": _upside(optimistic),
                "neutral": _upside(neutral),
                "pessimistic": _upside(pessimistic),
            },
        },
        "graham_number": graham_number,
        "data_source": "local financial database + cached price history",
    }


@financial_bp.route("/api/financial/radar/<stock_code>", methods=["GET"])
def get_radar_scores(stock_code):
    stock_code = _normalize_stock_code(stock_code)
    cache_key_str = cache_key("financial", "radar", stock_code)
    cached = _get_cache_value(cache_key_str)
    if cached:
        return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_radar_from_local:
        try:
            local_data = get_radar_from_local(stock_code)
            if local_data and local_data.get("success"):
                _set_cache_value(cache_key_str, local_data, CACHE_TTL["radar"])
                return jsonify(local_data)
        except Exception as exc:
            print(f"[radar] 本地数据库查询失败: {exc}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route("/api/financial/dupont/<stock_code>", methods=["GET"])
def get_dupont_decomposition(stock_code):
    stock_code = _normalize_stock_code(stock_code)
    cache_key_str = cache_key("financial", "dupont", stock_code)
    cached = _get_cache_value(cache_key_str)
    if cached:
        return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_dupont_from_local:
        try:
            local_data = get_dupont_from_local(stock_code)
            if local_data and local_data.get("success"):
                _set_cache_value(cache_key_str, local_data, CACHE_TTL["dupont"])
                return jsonify(local_data)
        except Exception as exc:
            print(f"[dupont] 本地数据库查询失败: {exc}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route("/api/financial/dcf/<stock_code>", methods=["GET", "POST"])
def get_dcf_valuation(stock_code):
    stock_code = _normalize_stock_code(stock_code)
    params = request.get_json(silent=True) if request.method == "POST" else None
    cache_key_str = cache_key("financial", "dcf", stock_code, str(params or {}))
    cached = _get_cache_value(cache_key_str)
    if cached:
        return jsonify(cached)

    try:
        result = _compute_dcf_payload(stock_code, params)
        _set_cache_value(cache_key_str, result, CACHE_TTL["dcf"])
        return jsonify(result)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@financial_bp.route("/api/financial/growth/<stock_code>", methods=["GET"])
def get_growth_analysis(stock_code):
    stock_code = _normalize_stock_code(stock_code)
    cache_key_str = cache_key("financial", "growth", stock_code)
    cached = _get_cache_value(cache_key_str)
    if cached:
        return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_growth_from_local:
        try:
            local_data = get_growth_from_local(stock_code)
            if local_data and local_data.get("success"):
                _set_cache_value(cache_key_str, local_data, CACHE_TTL["growth"])
                return jsonify(local_data)
        except Exception as exc:
            print(f"[growth] 本地数据库查询失败: {exc}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route("/api/financial/risk/<stock_code>", methods=["GET"])
def get_risk_analysis(stock_code):
    stock_code = _normalize_stock_code(stock_code)
    cache_key_str = cache_key("financial", "risk", stock_code)
    cached = _get_cache_value(cache_key_str)
    if cached:
        return jsonify(cached)

    if LOCAL_DB_AVAILABLE and get_risk_from_local:
        try:
            local_data = get_risk_from_local(stock_code)
            if local_data and local_data.get("success"):
                _set_cache_value(cache_key_str, local_data, CACHE_TTL["risk"])
                return jsonify(local_data)
        except Exception as exc:
            print(f"[risk] 本地数据库查询失败: {exc}")

    return jsonify({"success": False, "error": "数据不可用"}), 404


@financial_bp.route("/api/financial/pe-band/<stock_code>", methods=["GET"])
def get_pe_band(stock_code):
    stock_code = _normalize_stock_code(stock_code)
    cache_key_str = cache_key("financial", "pe_band", stock_code)
    cached = _get_cache_value(cache_key_str)
    if cached:
        return jsonify(cached)

    try:
        result = _compute_pe_band_payload(stock_code)
        _set_cache_value(cache_key_str, result, CACHE_TTL["pe_band"])
        return jsonify(result)
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@financial_bp.route("/api/financial/comprehensive/<stock_code>", methods=["GET"])
def get_comprehensive_financial(stock_code):
    stock_code = _normalize_stock_code(stock_code)
    cache_key_str = cache_key("financial", "comprehensive", stock_code)
    cached = _get_cache_value(cache_key_str)
    if cached:
        return jsonify(cached)

    result = {
        "success": True,
        "stock_code": stock_code,
        "timestamp": datetime.now().isoformat(),
    }

    if LOCAL_DB_AVAILABLE:
        if get_radar_from_local:
            result["radar"] = get_radar_from_local(stock_code)
        if get_dupont_from_local:
            result["dupont"] = get_dupont_from_local(stock_code)
        if get_dcf_inputs_from_local:
            result["dcf"] = _compute_dcf_payload(stock_code)
        if get_growth_from_local:
            result["growth"] = get_growth_from_local(stock_code)
        if get_risk_from_local:
            result["risk"] = get_risk_from_local(stock_code)

    _set_cache_value(cache_key_str, result, CACHE_TTL["comprehensive"])
    return jsonify(result)


@financial_bp.route("/api/financial/batch", methods=["POST"])
def batch_financial_query():
    data = request.get_json() or {}
    stock_codes = data.get("stock_codes", [])
    modules = data.get("modules", ["radar", "dupont", "dcf", "growth", "risk"])

    results = {}
    cache_hits = 0

    for code in stock_codes:
        normalized_code = _normalize_stock_code(code)
        results[normalized_code] = {}
        for module in modules:
            try:
                cache_key_str = cache_key("financial", module, normalized_code)
                cached = _get_cache_value(cache_key_str)
                if cached:
                    results[normalized_code][module] = cached
                    cache_hits += 1
                    continue

                if module == "radar" and get_radar_from_local:
                    results[normalized_code]["radar"] = get_radar_from_local(normalized_code)
                elif module == "dupont" and get_dupont_from_local:
                    results[normalized_code]["dupont"] = get_dupont_from_local(normalized_code)
                elif module == "dcf":
                    results[normalized_code]["dcf"] = _compute_dcf_payload(normalized_code)
                elif module == "growth" and get_growth_from_local:
                    results[normalized_code]["growth"] = get_growth_from_local(normalized_code)
                elif module == "risk" and get_risk_from_local:
                    results[normalized_code]["risk"] = get_risk_from_local(normalized_code)
                elif module == "pe-band":
                    results[normalized_code]["pe-band"] = _compute_pe_band_payload(normalized_code)

                if module in results[normalized_code]:
                    _set_cache_value(cache_key_str, results[normalized_code][module], CACHE_TTL.get(module, 3600))
            except Exception as exc:
                results[normalized_code][module] = {"success": False, "error": str(exc)}

    return jsonify(
        {
            "success": True,
            "results": results,
            "cache_hits": cache_hits,
            "cached": cache_hits > 0,
        }
    )


@financial_bp.route("/api/financial/cache/clear", methods=["POST"])
def clear_financial_cache():
    if CACHE_AVAILABLE:
        cache = get_cache()
        cache.clear()
        return jsonify({"success": True, "message": "Cache cleared"})
    return jsonify({"success": False, "message": "Cache not available"})


@financial_bp.route("/api/financial/cache/stats", methods=["GET"])
def get_cache_stats():
    if CACHE_AVAILABLE:
        cache = get_cache()
        return jsonify({"success": True, "stats": cache.get_stats()})
    return jsonify({"success": True, "stats": {"backend": "none", "message": "Caching disabled"}})
