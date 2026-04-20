"""
Skill adapters for AlphaEar finance skills.

Loads stock and news skill modules in isolated namespaces so shared module
names like ``database_manager.py`` do not collide in ``sys.modules``.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType
from typing import Any, Dict, List, Optional

# Skills directory
SKILLS_DIR = Path(__file__).parent

# Data directory for skills databases
DATA_DIR = SKILLS_DIR.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

_MODULE_CACHE: Dict[str, ModuleType] = {}


def _ensure_package(package_name: str, package_path: Path) -> None:
    if package_name in sys.modules:
        return

    package = ModuleType(package_name)
    package.__path__ = [str(package_path)]  # type: ignore[attr-defined]
    sys.modules[package_name] = package


def _load_skill_module(skill_key: str, module_name: str, file_path: Path) -> ModuleType:
    cache_key = f"{skill_key}:{module_name}"
    if cache_key in _MODULE_CACHE:
        return _MODULE_CACHE[cache_key]

    package_name = f"_skill_{skill_key}"
    qualified_name = f"{package_name}.{module_name}"
    _ensure_package(package_name, file_path.parent)

    existing = sys.modules.get(qualified_name)
    if existing is not None:
      _MODULE_CACHE[cache_key] = existing
      return existing

    spec = importlib.util.spec_from_file_location(qualified_name, file_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load module {qualified_name} from {file_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[qualified_name] = module
    spec.loader.exec_module(module)
    _MODULE_CACHE[cache_key] = module
    return module


class StockSkillAdapter:
    """Adapter for the alphaear-stock skill."""

    def __init__(self, db_path: Optional[str] = None):
        stock_scripts = SKILLS_DIR / "alphaear-stock" / "scripts"
        database_module = _load_skill_module(
            "alphaear_stock",
            "database_manager",
            stock_scripts / "database_manager.py",
        )
        stock_tools_module = _load_skill_module(
            "alphaear_stock",
            "stock_tools",
            stock_scripts / "stock_tools.py",
        )

        if db_path is None:
            db_path = str(DATA_DIR / "signal_flux.db")

        self.db = database_module.DatabaseManager(db_path)
        self.tools = stock_tools_module.StockTools(self.db, auto_update=True)
        self._stock_tools_module = stock_tools_module

    def search_stock(self, query: str, limit: int = 10) -> List[Dict[str, str]]:
        return self.tools.search_ticker(query, limit)

    def get_stock_price(
        self,
        ticker: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
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
                "change_pct": df["change_pct"].tolist() if "change_pct" in df.columns else [],
            },
            "summary": {
                "start_date": df["date"].iloc[0],
                "end_date": df["date"].iloc[-1],
                "latest_close": float(df["close"].iloc[-1]),
                "high": float(df["high"].max()),
                "low": float(df["low"].min()),
                "avg_volume": float(df["volume"].mean()),
            },
        }

    def get_stock_analysis(self, ticker: str) -> str:
        return self._stock_tools_module.get_stock_analysis(ticker, self.db)


class NewsSkillAdapter:
    """Adapter for the alphaear-news skill."""

    def __init__(self, db_path: Optional[str] = None):
        news_scripts = SKILLS_DIR / "alphaear-news" / "scripts"
        database_module = _load_skill_module(
            "alphaear_news",
            "database_manager",
            news_scripts / "database_manager.py",
        )
        _load_skill_module(
            "alphaear_news",
            "content_extractor",
            news_scripts / "content_extractor.py",
        )
        news_tools_module = _load_skill_module(
            "alphaear_news",
            "news_tools",
            news_scripts / "news_tools.py",
        )

        if db_path is None:
            db_path = str(DATA_DIR / "signal_flux.db")

        self.db = database_module.DatabaseManager(db_path)
        self.news_tools = news_tools_module.NewsNowTools(self.db)
        self.polymarket_tools = news_tools_module.PolymarketTools(self.db)

    def get_hot_news(self, source: str = "cls", count: int = 10) -> List[Dict[str, Any]]:
        return self.news_tools.fetch_hot_news(source, count)

    def get_unified_trends(self, sources: Optional[List[str]] = None) -> Dict[str, Any]:
        if sources is None:
            sources = ["cls", "weibo", "wallstreetcn"]
        return self.news_tools.get_unified_trends(sources)

    def get_polymarket_summary(self, limit: int = 10) -> Dict[str, Any]:
        return self.polymarket_tools.get_market_summary(limit)


_stock_adapter: Optional[StockSkillAdapter] = None
_news_adapter: Optional[NewsSkillAdapter] = None


def get_stock_adapter() -> StockSkillAdapter:
    global _stock_adapter
    if _stock_adapter is None:
        _stock_adapter = StockSkillAdapter()
    return _stock_adapter


def get_news_adapter() -> NewsSkillAdapter:
    global _news_adapter
    if _news_adapter is None:
        _news_adapter = NewsSkillAdapter()
    return _news_adapter
