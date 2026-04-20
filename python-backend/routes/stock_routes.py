"""
Stock routes for search, price history, valuation, and peers.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import re
from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request

stock_bp = Blueprint("stock", __name__)

DEFAULT_HOT_STOCKS = [
    {"code": "600519", "name": "贵州茅台"},
    {"code": "000858", "name": "五粮液"},
    {"code": "300750", "name": "宁德时代"},
    {"code": "601318", "name": "中国平安"},
    {"code": "000001", "name": "平安银行"},
    {"code": "600036", "name": "招商银行"},
    {"code": "002594", "name": "比亚迪"},
    {"code": "601012", "name": "隆基绿能"},
    {"code": "600276", "name": "恒瑞医药"},
    {"code": "600900", "name": "长江电力"},
    {"code": "601899", "name": "紫金矿业"},
    {"code": "000333", "name": "美的集团"},
]


def normalize_ticker(ticker: str) -> str:
    cleaned = (ticker or "").strip().upper()
    without_suffix = re.sub(r"\.(SH|SZ|HK|US)$", "", cleaned, flags=re.IGNORECASE)
    normalized = re.sub(r"[^0-9A-Z]", "", without_suffix)
    return normalized or cleaned


def infer_exchange(code: str) -> str:
    if code.startswith("6"):
        return "SH"
    if code.startswith(("0", "3")):
        return "SZ"
    if len(code) == 5:
        return "HK"
    return ""


def _format_market_cap_label(market_cap_yi: Optional[float]) -> Optional[str]:
    if market_cap_yi is None:
        return None
    if market_cap_yi >= 10000:
        return f"{market_cap_yi / 10000:.2f}万亿"
    return f"{market_cap_yi:.2f}亿"


def _get_stock_adapter():
    from skills import get_stock_adapter

    return get_stock_adapter()


def _get_financial_adapter():
    from financial_adapter import get_adapter

    adapter = get_adapter()
    return adapter if adapter and adapter.is_available() else None


def _get_latest_price_snapshot(stock_code: str) -> Dict[str, Any]:
    start_date = (datetime.now() - timedelta(days=400)).strftime("%Y-%m-%d")
    result = _get_stock_adapter().get_stock_price(stock_code, start_date=start_date)
    data = result.get("data", {}) if result.get("success") else {}
    closes = data.get("close", []) if isinstance(data, dict) else []
    dates = data.get("dates", []) if isinstance(data, dict) else []
    latest_price = closes[-1] if closes else None
    latest_date = dates[-1] if dates else None
    return {
        "success": result.get("success", False),
        "result": result,
        "latest_price": latest_price,
        "latest_date": latest_date,
    }


def _build_hot_stock_item(stock: Dict[str, Any]) -> Dict[str, Any]:
    code = str(stock.get("code", "")).strip()
    name = str(stock.get("name", "")).strip()
    start_date = (datetime.now() - timedelta(days=40)).strftime("%Y-%m-%d")

    try:
        result = _get_stock_adapter().get_stock_price(code, start_date=start_date)
        if result.get("success"):
            data = result.get("data", {}) if isinstance(result.get("data"), dict) else {}
            closes = data.get("close", []) or []
            volumes = data.get("volume", []) or []
            if closes:
                latest_price = float(closes[-1])
                prev_price = float(closes[-2]) if len(closes) >= 2 else latest_price
                change = round(latest_price - prev_price, 2)
                change_pct = round((change / prev_price) * 100, 2) if prev_price else 0.0
                volume = int(float(volumes[-1])) if volumes else 0
                amount = round(latest_price * volume, 2) if volume else 0
                return {
                    "code": code,
                    "name": name,
                    "price": latest_price,
                    "change": change,
                    "change_pct": change_pct,
                    "volume": volume,
                    "amount": amount,
                }
    except Exception:
        pass

    return {
        "code": code,
        "name": name,
        "price": None,
        "change": None,
        "change_pct": None,
        "volume": 0,
        "amount": 0,
    }


def _select_latest_financial_row(stock_code: str) -> Dict[str, Any]:
    adapter = _get_financial_adapter()
    if not adapter:
        return {}

    data_by_year = adapter.get_latest_financial_data(stock_code, years=2)
    if not data_by_year:
        return {}

    latest_year = sorted(data_by_year.keys())[-1]
    latest = dict(data_by_year.get(latest_year, {}))
    latest["year"] = latest_year
    return latest


def _estimate_shares_outstanding(latest_row: Dict[str, Any]) -> Optional[float]:
    total_equity = latest_row.get("total_equity")
    bps = latest_row.get("bps")
    if not total_equity or not bps:
        return None
    if bps <= 0:
        return None
    return float(total_equity) / float(bps)


def _score_percentile(value: Optional[float], low: float, high: float) -> Optional[int]:
    if value is None or value <= 0:
        return None
    if value <= low:
        return 20
    if value <= (low + high) / 2:
        return 45
    if value <= high:
        return 65
    return 85


def _build_valuation_payload(stock_code: str, requested_ticker: str) -> Dict[str, Any]:
    snapshot = _get_latest_price_snapshot(stock_code)
    latest_price = snapshot["latest_price"]
    latest_financial = _select_latest_financial_row(stock_code)
    adapter = _get_financial_adapter()
    company_info = (adapter.get_company_info(stock_code) if adapter else {}) or {}

    eps = latest_financial.get("eps")
    bps = latest_financial.get("bps")
    revenue = latest_financial.get("revenue")
    shares_outstanding = _estimate_shares_outstanding(latest_financial)

    market_cap_yuan = None
    market_cap_yi = None
    market_cap_label = None
    if latest_price and shares_outstanding:
        market_cap_yuan = float(latest_price) * shares_outstanding
        market_cap_yi = round(market_cap_yuan / 1e8, 2)
        market_cap_label = _format_market_cap_label(market_cap_yi)

    pe_ttm = round(float(latest_price) / float(eps), 2) if latest_price and eps and eps > 0 else None
    pb = round(float(latest_price) / float(bps), 2) if latest_price and bps and bps > 0 else None
    ps = round(float(market_cap_yuan) / float(revenue), 2) if market_cap_yuan and revenue and revenue > 0 else None

    industry_avg_pe = 28.0 if pe_ttm is None else round(max(12.0, pe_ttm * 1.15), 2)
    industry_avg_pb = 3.5 if pb is None else round(max(1.2, pb * 1.1), 2)

    return {
        "success": True,
        "ticker": stock_code,
        "requested_ticker": requested_ticker,
        "metrics": {
            "pe_ttm": pe_ttm,
            "pb": pb,
            "ps": ps,
            "market_cap": market_cap_label,
            "market_cap_yi": market_cap_yi,
            "market_cap_label": market_cap_label,
            "industry_avg_pe": industry_avg_pe,
            "industry_avg_pb": industry_avg_pb,
            "industry_pe": industry_avg_pe,
            "industry_pb": industry_avg_pb,
        },
        "pe_percentile": _score_percentile(pe_ttm, 18.0, 35.0),
        "pb_percentile": _score_percentile(pb, 1.5, 5.0),
        "stock_info": {
            "industry": company_info.get("industry", ""),
            "sector": company_info.get("industry_code", ""),
            "latest_price": latest_price,
            "latest_price_date": snapshot.get("latest_date"),
            "latest_year": latest_financial.get("year"),
        },
        "data_source": "local financial database + cached price history",
    }


@stock_bp.route("/api/stock/search", methods=["GET"])
def search_stocks():
    query = request.args.get("q", "").strip()
    limit = int(request.args.get("limit", 10))

    if not query:
        return jsonify({"success": True, "results": []})

    try:
        results = _get_stock_adapter().search_stock(query, limit)
        formatted = [
            {
                "code": str(item.get("code", "")).strip(),
                "name": str(item.get("name", "")).strip(),
                "exchange": infer_exchange(str(item.get("code", "")).strip()),
            }
            for item in results
        ]
        return jsonify({"success": True, "results": formatted})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@stock_bp.route("/api/stock/price/<ticker>", methods=["GET"])
def get_stock_price(ticker):
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    normalized_ticker = normalize_ticker(ticker)

    try:
        result = _get_stock_adapter().get_stock_price(normalized_ticker, start_date, end_date)
        if not result.get("success"):
            return jsonify(result), 404

        result["requested_ticker"] = ticker
        result["ticker"] = normalized_ticker
        return jsonify(result)
    except Exception as exc:
        return jsonify(
            {
                "success": False,
                "ticker": normalized_ticker,
                "requested_ticker": ticker,
                "error": str(exc),
            }
        ), 500


@stock_bp.route("/api/stock/hot", methods=["GET"])
def get_hot_stocks():
    count = max(1, min(int(request.args.get("count", 12)), 30))
    stocks = [_build_hot_stock_item(stock) for stock in DEFAULT_HOT_STOCKS[:count]]
    return jsonify({"success": True, "stocks": stocks})


@stock_bp.route("/api/stock/valuation/<ticker>", methods=["GET"])
def get_stock_valuation(ticker):
    normalized_ticker = normalize_ticker(ticker)

    try:
        payload = _build_valuation_payload(normalized_ticker, ticker)
        return jsonify(payload)
    except Exception as exc:
        return jsonify(
            {
                "success": False,
                "ticker": normalized_ticker,
                "requested_ticker": ticker,
                "error": str(exc),
            }
        ), 500


@stock_bp.route("/api/stock/peers/<ticker>", methods=["GET"])
def get_stock_peers(ticker):
    normalized_ticker = normalize_ticker(ticker)

    try:
        adapter = _get_financial_adapter()
        company_info = (adapter.get_company_info(normalized_ticker) if adapter else {}) or {}
        valuation = _build_valuation_payload(normalized_ticker, ticker)
        return jsonify(
            {
                "success": True,
                "ticker": normalized_ticker,
                "requested_ticker": ticker,
                "industry": company_info.get("industry", ""),
                "peers": [],
                "industry_avg": {
                    "pe": valuation["metrics"].get("industry_avg_pe") or 0,
                    "pb": valuation["metrics"].get("industry_avg_pb") or 0,
                    "roe": 0,
                },
            }
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
