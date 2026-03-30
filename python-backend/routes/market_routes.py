"""
Market Routes
Handles market data, news, and macro indicators
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta

market_bp = Blueprint('market', __name__)


@market_bp.route('/api/news/hot', methods=['GET'])
def get_hot_news():
    """Get hot news from multiple sources"""
    try:
        import akshare as ak

        df = ak.stock_news_em(symbol="财经")

        if df is None or df.empty:
            return jsonify({"success": False, "error": "No news data"}), 404

        news_list = []
        for _, row in df.head(20).iterrows():
            news_list.append({
                "title": row.get('新闻标题', ''),
                "source": row.get('新闻来源', ''),
                "time": row.get('发布时间', ''),
                "url": row.get('新闻链接', '')
            })

        return jsonify({"success": True, "news": news_list})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@market_bp.route('/api/news/trends', methods=['GET'])
def get_news_trends():
    """Get trending topics in the market"""
    try:
        import akshare as ak

        df = ak.stock_board_concept_name_em()

        if df is None or df.empty:
            return jsonify({"success": False, "error": "No trends data"}), 404

        # Get top gainers in concept boards
        df = df.sort_values(by='涨跌幅', ascending=False).head(10)

        trends = []
        for _, row in df.iterrows():
            trends.append({
                "name": row.get('板块名称', ''),
                "change_pct": float(row.get('涨跌幅', 0)) if row.get('涨跌幅') else 0,
                "leading_stock": row.get('领涨股票', ''),
                "volume": float(row.get('总市值', 0)) if row.get('总市值') else 0
            })

        return jsonify({"success": True, "trends": trends})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@market_bp.route('/api/market/sectors', methods=['GET'])
def get_market_sectors():
    """Get sector performance data"""
    try:
        import akshare as ak

        df = ak.stock_board_industry_name_em()

        if df is None or df.empty:
            return jsonify({"success": False, "error": "No sector data"}), 404

        sectors = []
        for _, row in df.head(30).iterrows():
            sectors.append({
                "name": row.get('板块名称', ''),
                "change_pct": float(row.get('涨跌幅', 0)) if row.get('涨跌幅') else 0,
                "leading_stock": row.get('领涨股票', ''),
                "leading_change": float(row.get('领涨涨幅', 0)) if row.get('领涨涨幅') else 0
            })

        return jsonify({"success": True, "sectors": sectors})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@market_bp.route('/api/market/predictions', methods=['GET'])
def get_market_predictions():
    """Get market predictions (placeholder for AI predictions)"""
    # This would integrate with the AI prediction system
    return jsonify({
        "success": True,
        "predictions": {
            "market_sentiment": "neutral",
            "confidence": 0.65,
            "top_sectors": ["白酒", "新能源", "半导体"],
            "risk_level": "medium"
        }
    })


# Note: Macro routes are handled by macro_routes.py blueprint


@market_bp.route('/api/cache/stats', methods=['GET'])
def get_cache_stats():
    """Get cache statistics"""
    try:
        from cache.response_cache import get_cache
        cache = get_cache()
        stats = cache.get_stats()
        return jsonify({"success": True, "stats": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@market_bp.route('/api/cache/clear', methods=['POST'])
def clear_cache():
    """Clear all cached data"""
    try:
        from cache.response_cache import get_cache
        cache = get_cache()
        cache.clear()
        return jsonify({"success": True, "message": "Cache cleared"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@market_bp.route('/api/scheduler/status', methods=['GET'])
def get_scheduler_status():
    """Get scheduler status"""
    try:
        import os
        scheduler_enabled = os.environ.get('SCHEDULER_ENABLED', 'true').lower() == 'true'
        return jsonify({
            "success": True,
            "scheduler_enabled": scheduler_enabled,
            "status": "running" if scheduler_enabled else "disabled"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500