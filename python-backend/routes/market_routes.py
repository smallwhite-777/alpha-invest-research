"""
Market routes.

News and scheduler endpoints live in app.py so the application has a single
source of truth for skill-adapter based implementations.
"""

from flask import Blueprint, jsonify

market_bp = Blueprint("market", __name__)


@market_bp.route("/api/market/sectors", methods=["GET"])
def get_market_sectors():
    """Return sector performance data."""
    try:
        import akshare as ak

        df = ak.stock_board_industry_name_em()
        if df is None or df.empty:
            return jsonify({"success": False, "error": "No sector data"}), 404

        sectors = []
        for _, row in df.head(30).iterrows():
            sectors.append(
                {
                    "name": row.get("板块名称", ""),
                    "change_pct": float(row.get("涨跌幅", 0) or 0),
                    "leading_stock": row.get("领涨股票", ""),
                    "leading_change": float(row.get("领涨跌幅", 0) or 0),
                }
            )

        return jsonify({"success": True, "sectors": sectors})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@market_bp.route("/api/market/predictions", methods=["GET"])
def get_market_predictions():
    """Return placeholder market prediction data."""
    return jsonify(
        {
            "success": True,
            "predictions": {
                "market_sentiment": "neutral",
                "confidence": 0.65,
                "top_sectors": ["白酒", "新能源", "半导体"],
                "risk_level": "medium",
            },
        }
    )


@market_bp.route("/api/cache/stats", methods=["GET"])
def get_cache_stats():
    """Return cache statistics."""
    try:
        from cache.response_cache import get_cache

        cache = get_cache()
        stats = cache.get_stats()
        return jsonify({"success": True, "stats": stats})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@market_bp.route("/api/cache/clear", methods=["POST"])
def clear_cache():
    """Clear cached responses."""
    try:
        from cache.response_cache import get_cache

        cache = get_cache()
        cache.clear()
        return jsonify({"success": True, "message": "Cache cleared"})
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500
