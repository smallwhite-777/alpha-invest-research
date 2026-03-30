"""
Skills Adapter for AlphaEar Finance Skills

Provides a unified interface for calling alphaear-news and alphaear-stock skills.
"""

import sys
import os
from pathlib import Path
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
import pandas as pd

# Skills directory
SKILLS_DIR = Path(__file__).parent

# Data directory for skills databases
DATA_DIR = SKILLS_DIR.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


class StockSkillAdapter:
    """Adapter for alphaear-stock skill"""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize stock skill with optional database path"""
        # Add skill scripts to path
        stock_scripts = SKILLS_DIR / "alphaear-stock" / "scripts"
        sys.path.insert(0, str(stock_scripts))

        from database_manager import DatabaseManager
        from stock_tools import StockTools

        if db_path is None:
            db_path = str(DATA_DIR / "signal_flux.db")

        self.db = DatabaseManager(db_path)
        self.tools = StockTools(self.db, auto_update=True)

    def search_stock(self, query: str, limit: int = 10) -> List[Dict[str, str]]:
        """
        Search for stock by name or code.

        Args:
            query: Stock name or code (e.g., "茅台", "600519", "BYD")
            limit: Maximum number of results

        Returns:
            List of {code, name} dicts
        """
        return self.tools.search_ticker(query, limit)

    def get_stock_price(
        self,
        ticker: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get historical stock price data.

        Args:
            ticker: Stock code
            start_date: Start date (YYYY-MM-DD), default 90 days ago
            end_date: End date (YYYY-MM-DD), default today

        Returns:
            Dict with dates, prices, volumes, etc.
        """
        df = self.tools.get_stock_price(ticker, start_date, end_date)

        if df.empty:
            return {"success": False, "error": f"No data found for {ticker}"}

        return {
            "success": True,
            "ticker": ticker,
            "data": {
                "dates": df["date"].tolist(),
                "open": df["open"].tolist(),
                "close": df["close"].tolist(),
                "high": df["high"].tolist(),
                "low": df["low"].tolist(),
                "volume": df["volume"].tolist(),
                "change_pct": df["change_pct"].tolist() if "change_pct" in df.columns else []
            },
            "summary": {
                "start_date": df["date"].iloc[0],
                "end_date": df["date"].iloc[-1],
                "latest_close": float(df["close"].iloc[-1]),
                "high": float(df["high"].max()),
                "low": float(df["low"].min()),
                "avg_volume": float(df["volume"].mean())
            }
        }

    def get_stock_analysis(self, ticker: str) -> str:
        """Generate stock analysis report"""
        from stock_tools import get_stock_analysis
        return get_stock_analysis(ticker, self.db)


class NewsSkillAdapter:
    """Adapter for alphaear-news skill"""

    def __init__(self, db_path: Optional[str] = None):
        """Initialize news skill with optional database path"""
        # Add skill scripts to path
        news_scripts = SKILLS_DIR / "alphaear-news" / "scripts"
        sys.path.insert(0, str(news_scripts))

        from database_manager import DatabaseManager
        from news_tools import NewsNowTools, PolymarketTools
        from content_extractor import ContentExtractor

        if db_path is None:
            db_path = str(DATA_DIR / "signal_flux.db")

        self.db = DatabaseManager(db_path)
        self.news_tools = NewsNowTools(self.db)
        self.polymarket_tools = PolymarketTools(self.db)

    def get_hot_news(self, source: str = "cls", count: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch hot financial news.

        Args:
            source: News source ID (cls, weibo, wallstreet, etc.)
            count: Number of news items

        Returns:
            List of news items
        """
        return self.news_tools.fetch_hot_news(source, count)

    def get_unified_trends(self, sources: List[str] = None) -> Dict[str, Any]:
        """
        Get unified trend report from multiple sources.

        Args:
            sources: List of source IDs, defaults to all

        Returns:
            Aggregated trend report
        """
        if sources is None:
            sources = ["cls", "weibo", "wallstreetcn"]
        return self.news_tools.get_unified_trends(sources)

    def get_polymarket_summary(self, limit: int = 10) -> Dict[str, Any]:
        """
        Get Polymarket prediction market data.

        Args:
            limit: Number of markets to fetch

        Returns:
            Market summary
        """
        return self.polymarket_tools.get_market_summary(limit)


# Singleton instances
_stock_adapter: Optional[StockSkillAdapter] = None
_news_adapter: Optional[NewsSkillAdapter] = None


def get_stock_adapter() -> StockSkillAdapter:
    """Get or create stock adapter singleton"""
    global _stock_adapter
    if _stock_adapter is None:
        _stock_adapter = StockSkillAdapter()
    return _stock_adapter


def get_news_adapter() -> NewsSkillAdapter:
    """Get or create news adapter singleton"""
    global _news_adapter
    if _news_adapter is None:
        _news_adapter = NewsSkillAdapter()
    return _news_adapter