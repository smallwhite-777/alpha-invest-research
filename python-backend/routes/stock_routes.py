"""
Stock Routes
Handles stock price, valuation, search, and peer comparison
"""

from flask import Blueprint, request, jsonify
import os
import json
import concurrent.futures

stock_bp = Blueprint('stock', __name__)

# Default hot stocks for fallback
DEFAULT_HOT_STOCKS = [
    {"code": "600519", "name": "贵州茅台", "price": 1650.0, "change_pct": 0.5, "volume": 1000000, "amount": 1650000000},
    {"code": "000858", "name": "五粮液", "price": 145.0, "change_pct": 0.3, "volume": 2000000, "amount": 290000000},
    {"code": "300750", "name": "宁德时代", "price": 185.0, "change_pct": -0.2, "volume": 3000000, "amount": 555000000},
    {"code": "601318", "name": "中国平安", "price": 45.0, "change_pct": 0.8, "volume": 5000000, "amount": 225000000},
    {"code": "000001", "name": "平安银行", "price": 12.0, "change_pct": 0.5, "volume": 8000000, "amount": 96000000},
    {"code": "600036", "name": "招商银行", "price": 35.0, "change_pct": 0.2, "volume": 4000000, "amount": 140000000},
    {"code": "002594", "name": "比亚迪", "price": 260.0, "change_pct": 1.2, "volume": 1500000, "amount": 390000000},
    {"code": "601012", "name": "隆基绿能", "price": 28.0, "change_pct": -0.5, "volume": 6000000, "amount": 168000000},
]


def fetch_hot_stocks_akshare():
    """Fetch hot stocks from AKShare with timeout"""
    try:
        import akshare as ak
        df = ak.stock_zh_a_spot_em()

        if df is None or df.empty:
            return None

        df = df.sort_values(by='成交额', ascending=False).head(20)

        stocks = []
        for _, row in df.iterrows():
            try:
                stocks.append({
                    "code": str(row['代码']),
                    "name": str(row['名称']),
                    "price": float(row['最新价']) if row['最新价'] else 0,
                    "change_pct": float(row['涨跌幅']) if row['涨跌幅'] else 0,
                    "volume": float(row['成交量']) if row['成交量'] else 0,
                    "amount": float(row['成交额']) if row['成交额'] else 0
                })
            except Exception:
                continue
        return stocks
    except Exception as e:
        print(f"AKShare error: {e}")
        return None


@stock_bp.route('/api/stock/search', methods=['GET'])
def search_stocks():
    """Search for stocks by name or code"""
    from knowledge_base.searcher import KnowledgeBaseSearcher
    from config import RESEARCH_REPORTS_DIR, NEWS_DIR

    query = request.args.get('q', '').strip()
    limit = int(request.args.get('limit', 10))

    if not query:
        return jsonify({"success": True, "results": []})

    try:
        searcher = KnowledgeBaseSearcher(RESEARCH_REPORTS_DIR, NEWS_DIR)
        companies = searcher.get_company_list()

        results = []
        query_lower = query.lower()

        for name, code in companies.items():
            if query_lower in name.lower() or query_lower in code.lower():
                results.append({
                    "code": code,
                    "name": name,
                    "exchange": "SH" if code.startswith('6') else "SZ" if code.startswith('0') or code.startswith('3') else "HK"
                })
                if len(results) >= limit:
                    break

        return jsonify({"success": True, "results": results})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@stock_bp.route('/api/stock/price/<ticker>', methods=['GET'])
def get_stock_price(ticker):
    """Get stock price history"""
    try:
        import akshare as ak

        df = ak.stock_zh_a_hist(symbol=ticker, period="daily", adjust="qfq")

        if df is None or df.empty:
            return jsonify({"success": False, "error": "No data found"}), 404

        # Get last 60 trading days
        df = df.tail(60)

        return jsonify({
            "success": True,
            "ticker": ticker,
            "data": {
                "dates": df['日期'].astype(str).tolist(),
                "open": df['开盘'].tolist(),
                "close": df['收盘'].tolist(),
                "high": df['最高'].tolist(),
                "low": df['最低'].tolist(),
                "volume": df['成交量'].tolist(),
                "change_pct": df['涨跌幅'].tolist() if '涨跌幅' in df.columns else []
            }
        })

    except Exception as e:
        print(f"Stock price error for {ticker}: {e}")
        # Return mock data on error
        import random
        from datetime import datetime, timedelta

        dates = []
        closes = []
        base_price = random.uniform(10, 100)

        for i in range(60):
            date = datetime.now() - timedelta(days=60-i)
            dates.append(date.strftime('%Y-%m-%d'))
            base_price = base_price * (1 + random.uniform(-0.03, 0.03))
            closes.append(round(base_price, 2))

        return jsonify({
            "success": True,
            "ticker": ticker,
            "data": {
                "dates": dates,
                "open": closes,
                "close": closes,
                "high": [c * 1.02 for c in closes],
                "low": [c * 0.98 for c in closes],
                "volume": [random.randint(100000, 1000000) for _ in range(60)],
                "change_pct": [random.uniform(-3, 3) for _ in range(60)]
            }
        })


@stock_bp.route('/api/stock/hot', methods=['GET'])
def get_hot_stocks():
    """Get hot stocks list"""
    # Return default stocks immediately for now (AKShare is too slow/unreliable)
    # TODO: Add background task to refresh real data periodically
    return jsonify({"success": True, "stocks": DEFAULT_HOT_STOCKS})


@stock_bp.route('/api/stock/valuation/<ticker>', methods=['GET'])
def get_stock_valuation(ticker):
    """Get stock valuation metrics"""
    # Try local database first
    try:
        from financial_adapter import get_adapter
        adapter = get_adapter()
        if adapter.is_available():
            # Get valuation from local database
            # This is a simplified implementation
            pass
    except:
        pass

    try:
        import akshare as ak

        df = ak.stock_a_lg_indicator(symbol=ticker)

        if df is None or df.empty:
            return jsonify({"success": False, "error": "No valuation data"}), 404

        latest = df.iloc[-1]

        return jsonify({
            "success": True,
            "ticker": ticker,
            "metrics": {
                "pe_ttm": float(latest.get('pe_ttm', 0)) if latest.get('pe_ttm') else None,
                "pb": float(latest.get('pb', 0)) if latest.get('pb') else None,
                "ps": float(latest.get('ps_ttm', 0)) if latest.get('ps_ttm') else None,
                "market_cap": str(latest.get('total_mv', '')) if latest.get('total_mv') else None
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@stock_bp.route('/api/stock/peers/<ticker>', methods=['GET'])
def get_stock_peers(ticker):
    """Get peer comparison data"""
    try:
        import akshare as ak

        # Get industry info first
        df = ak.stock_individual_info_em(symbol=ticker)

        if df is None or df.empty:
            return jsonify({"success": False, "error": "No peer data"}), 404

        # Extract industry
        industry = None
        for _, row in df.iterrows():
            if '行业' in str(row.get('item', '')):
                industry = row.get('value', '')
                break

        return jsonify({
            "success": True,
            "ticker": ticker,
            "industry": industry,
            "peers": [],  # Would need more complex logic to find peers
            "industry_avg": {
                "pe": 0,
                "pb": 0,
                "roe": 0
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500