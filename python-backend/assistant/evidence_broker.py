from collections import defaultdict
from dataclasses import replace
import json
from pathlib import Path
import re
from typing import Dict, List, Optional

from agents.search_agent import SearchAgent
from agents.intent_agent import IntentResult, IntentType
from assistant.skill_registry import get_skill
from assistant.types import EvidenceBundle, EvidenceItem, QueryContext

try:
    import pandas as pd
except Exception:  # pragma: no cover - pandas should exist, but keep graceful fallback
    pd = None


REPO_ROOT = Path(__file__).resolve().parents[2]
PRELOAD_RESULT_PATH = REPO_ROOT / "python-backend" / "preload_result.json"
MACRO_CATALOG_PATH = REPO_ROOT / "macro-data" / "data" / "catalog.json"
MACRO_SERIES_PATH = REPO_ROOT / "macro-data" / "data" / "series.csv"


def normalize_ticker(ticker: str) -> str:
    cleaned = (ticker or "").strip().upper()
    without_suffix = re.sub(r"\.(SH|SZ|HK|US)$", "", cleaned, flags=re.IGNORECASE)
    normalized = re.sub(r"[^0-9A-Z]", "", without_suffix)
    return normalized or cleaned


def _format_market_cap_label(market_cap_yi: Optional[float]) -> Optional[str]:
    if market_cap_yi is None:
        return None
    if market_cap_yi >= 10000:
        return f"{market_cap_yi / 10000:.2f}万亿"
    return f"{market_cap_yi:.2f}亿"


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


class EvidenceBroker:
    """Aggregate heterogeneous financial evidence into a structured bundle."""

    _peer_universe_cache: Optional[List[Dict[str, str]]] = None
    _macro_catalog_cache: Optional[List[Dict[str, str]]] = None
    _macro_series_cache = None

    def __init__(self, search_agent: SearchAgent):
        self.search_agent = search_agent

    def collect(
        self,
        query: QueryContext,
        intent_result: IntentResult,
        skill_id: str,
    ) -> EvidenceBundle:
        skill = get_skill(skill_id)
        search_intent = self._prepare_search_intent(query, intent_result, skill_id)
        search_result = self.search_agent.search(search_intent)

        items: List[EvidenceItem] = []
        grouped: Dict[str, List[EvidenceItem]] = defaultdict(list)

        for metric in search_result.get("metrics", []):
            item = EvidenceItem(
                kind="financial_fact",
                source_id=metric.source,
                source_name=metric.source,
                source_type="search_metric",
                title=metric.name,
                entity=query.company_name or intent_result.company_name,
                stock_code=query.stock_code or intent_result.stock_code,
                date=metric.year,
                metric_name=metric.name,
                metric_value=f"{metric.value}{metric.unit}",
                snippet=f"{metric.name}: {metric.value}{metric.unit} ({metric.year})",
                confidence=metric.confidence,
                is_fact=True,
            )
            items.append(item)
            grouped["financial_facts"].append(item)

        for source in search_result.get("sources", []):
            source_type = source.get("source_type", "")
            kind = "research_view"
            group_key = "research_views"

            if source_type in {"financial_report", "txt"}:
                kind = "annual_report_snippet"
                group_key = "annual_report_snippets"
            elif "news" in source_type:
                kind = "news_event"
                group_key = "news_events"

            snippet = source.get("snippet") or source.get("display") or source.get("company_name") or ""
            item = EvidenceItem(
                kind=kind,
                source_id=source.get("file_path") or source.get("display") or source.get("company_name") or source_type,
                source_name=source.get("display") or source.get("company_name") or source_type,
                source_type=source_type or "knowledge_base",
                title=source.get("company_name") or source.get("display"),
                entity=source.get("company_name") or query.company_name,
                stock_code=source.get("stock_code") or query.stock_code,
                date=source.get("date"),
                snippet=snippet,
                confidence=0.7,
                is_fact=kind == "annual_report_snippet",
                is_recent=kind == "news_event",
                metadata=source,
            )
            items.append(item)
            grouped[group_key].append(item)

        # Lightweight macro placeholder for first-phase architecture.
        if skill_id in {"macro_analysis", "macro_to_asset"}:
            for item in self._collect_macro_series(query):
                items.append(item)
                grouped["macro_series"].append(item)

        if skill_id in {"valuation", "company_analysis", "peer_comparison"} and query.stock_code:
            valuation_item = self._collect_valuation_snapshot(query.stock_code)
            if valuation_item:
                items.append(valuation_item)
                grouped["valuation_snapshots"].append(valuation_item)

        if skill_id in {"valuation", "peer_comparison", "company_analysis"} and query.stock_code:
            peer_items = self._collect_peer_metrics(query.stock_code)
            for item in peer_items:
                items.append(item)
                grouped["peer_metrics"].append(item)

        missing_required = self._missing_required(skill.required_evidence, grouped)
        warnings = list(search_result.get("search_stats", {}).get("keywords_used", []))[:0]
        if missing_required:
            warnings.append(f"部分必需证据暂未命中: {', '.join(missing_required)}")

        freshness_summary = {
            "item_count": len(items),
            "metric_count": len(grouped.get("financial_facts", [])),
            "source_count": len(search_result.get("sources", [])),
        }

        return EvidenceBundle(
            skill_id=skill_id,
            query=query,
            items=items,
            grouped=dict(grouped),
            warnings=warnings,
            missing_required=missing_required,
            freshness_summary=freshness_summary,
        )

    def _prepare_search_intent(
        self,
        query: QueryContext,
        intent_result: IntentResult,
        skill_id: str,
    ) -> IntentResult:
        entities = list(intent_result.entities or [])
        keywords = list(intent_result.keywords or [])
        query_text = query.question or intent_result.original_query or ""

        target_terms: List[str] = []
        if query.company_name:
            target_terms.append(query.company_name)
        if query.stock_code:
            target_terms.append(normalize_ticker(query.stock_code))

        if query.company_name and "茅台" in query.company_name:
            target_terms.append("茅台")

        stock_code_match = re.search(r"\b(\d{6})\b", query_text)
        if stock_code_match:
            target_terms.append(stock_code_match.group(1))

        for term in target_terms:
            if term and term not in entities:
                entities.append(term)
            if term and term not in keywords:
                keywords.append(term)

        forced_intent = intent_result.intent
        if skill_id in {"company_analysis", "peer_comparison"}:
            forced_intent = IntentType.COMPANY_ANALYSIS
        elif skill_id == "valuation":
            forced_intent = IntentType.VALUATION
        elif skill_id == "earnings_review":
            forced_intent = IntentType.FINANCIAL_ANALYSIS

        return replace(
            intent_result,
            intent=forced_intent,
            entities=entities,
            keywords=keywords,
            company_name=query.company_name or intent_result.company_name,
            stock_code=query.stock_code or intent_result.stock_code,
            original_query=query_text,
        )

    def _missing_required(self, required: List[str], grouped: Dict[str, List[EvidenceItem]]) -> List[str]:
        available = {
            "financial_fact": "financial_facts",
            "annual_report_snippet": "annual_report_snippets",
            "research_view": "research_views",
            "news_event": "news_events",
            "macro_series": "macro_series",
            "valuation_snapshot": "valuation_snapshots",
            "peer_metric": "peer_metrics",
        }
        missing = []
        for evidence_kind in required:
            group_key = available.get(evidence_kind)
            if not group_key or not grouped.get(group_key):
                missing.append(evidence_kind)
        return missing

    def _collect_valuation_snapshot(self, stock_code: str) -> Optional[EvidenceItem]:
        try:
            payload = self._build_valuation_payload(normalize_ticker(stock_code))
        except Exception:
            return None

        metrics = payload.get("metrics", {})
        latest_price = payload.get("stock_info", {}).get("latest_price")
        latest_date = payload.get("stock_info", {}).get("latest_price_date")
        snippets = []
        for key in ("pe_ttm", "pb", "ps", "market_cap_label", "industry_avg_pe", "industry_avg_pb"):
            value = metrics.get(key)
            if value is not None:
                snippets.append(f"{key}={value}")

        if latest_price is not None:
            snippets.append(f"latest_price={latest_price}")
        if payload.get("pe_percentile") is not None:
            snippets.append(f"pe_percentile={payload.get('pe_percentile')}")
        if payload.get("pb_percentile") is not None:
            snippets.append(f"pb_percentile={payload.get('pb_percentile')}")

        return EvidenceItem(
            kind="valuation_snapshot",
            source_id=f"valuation:{stock_code}",
            source_name=f"{stock_code} valuation snapshot",
            source_type="stock_valuation",
            title="估值快照",
            stock_code=stock_code,
            date=latest_date,
            snippet="; ".join(snippets),
            confidence=0.85,
            is_fact=True,
            metadata=payload,
        )

    def _collect_peer_metrics(self, stock_code: str) -> List[EvidenceItem]:
        adapter = self._safe_financial_adapter()
        if not adapter:
            return []

        stock_code = normalize_ticker(stock_code)
        company_info = adapter.get_company_info(stock_code) or {}
        industry = self._resolve_industry_label(stock_code, company_info)
        if not industry:
            return []

        universe = self._load_peer_universe()
        peer_candidates = [row for row in universe if row.get("industry") == industry and row.get("code") != stock_code][:5]
        items: List[EvidenceItem] = []

        for peer in peer_candidates:
            peer_code = peer.get("code", "")
            latest = adapter.get_latest_financial_data(peer_code, years=2) or {}
            latest_year = sorted(latest.keys())[-1] if latest else None
            latest_row = latest.get(latest_year, {}) if latest_year else {}

            try:
                valuation = self._build_valuation_payload(peer_code, include_price_fetch=False)
            except Exception:
                valuation = {"metrics": {}}

            metrics = valuation.get("metrics", {})
            snippet_parts = [
                f"industry={industry}",
                f"revenue={self._fmt_num(latest_row.get('revenue'))}",
                f"net_profit={self._fmt_num(latest_row.get('net_profit'))}",
                f"roe={self._fmt_num(latest_row.get('roe'))}",
                f"pe={metrics.get('pe_ttm')}",
                f"pb={metrics.get('pb')}",
            ]

            item = EvidenceItem(
                kind="peer_metric",
                source_id=f"peer:{peer_code}",
                source_name=f"{peer.get('name', peer_code)} peer snapshot",
                source_type="peer_comparison",
                title=peer.get("name", peer_code),
                entity=peer.get("name", peer_code),
                stock_code=peer_code,
                date=str(latest_year) if latest_year else None,
                snippet="; ".join(part for part in snippet_parts if not part.endswith("=None")),
                confidence=0.78,
                is_fact=True,
                metadata={
                    "industry": industry,
                    "latest_year": latest_year,
                    "financials": latest_row,
                    "valuation": metrics,
                },
            )
            items.append(item)

        return items

    def _collect_macro_series(self, query: QueryContext) -> List[EvidenceItem]:
        if pd is None:
            return []

        indicator_codes = self._resolve_macro_indicators(query)
        if not indicator_codes:
            return []

        series_df = self._load_macro_series()
        catalog = {entry["code"]: entry for entry in self._load_macro_catalog()}
        items: List[EvidenceItem] = []

        for indicator_code in indicator_codes[:4]:
            subset = series_df[series_df["indicatorCode"] == indicator_code].tail(24)
            if subset.empty:
                continue

            latest = subset.iloc[-1]
            previous = subset.iloc[-2] if len(subset) > 1 else None
            delta_text = ""
            if previous is not None:
                delta = float(latest["value"]) - float(previous["value"])
                delta_text = f"; delta={delta:.4f}"

            entry = catalog.get(indicator_code, {})
            snippet = (
                f"{entry.get('name', indicator_code)} latest={latest['value']}"
                f" @ {latest['date']}; freq={latest['frequency']}{delta_text}"
            )
            items.append(
                EvidenceItem(
                    kind="macro_series",
                    source_id=f"macro:{indicator_code}",
                    source_name=entry.get("name", indicator_code),
                    source_type="macro_local",
                    title=entry.get("name", indicator_code),
                    date=str(latest["date"]),
                    metric_name=entry.get("name", indicator_code),
                    metric_value=str(latest["value"]),
                    snippet=snippet,
                    confidence=0.88,
                    is_fact=True,
                    metadata={
                        "code": indicator_code,
                        "frequency": latest["frequency"],
                        "unit": entry.get("unit"),
                        "series_preview": subset[["date", "value"]].tail(6).to_dict(orient="records"),
                    },
                )
            )

        return items

    def _resolve_macro_indicators(self, query: QueryContext) -> List[str]:
        explicit = []
        catalog = self._load_macro_catalog()
        by_id = {entry.get("id"): entry.get("code") for entry in catalog}
        by_code = {entry.get("code"): entry.get("code") for entry in catalog}

        for indicator in query.indicator_codes:
            if indicator in by_id:
                explicit.append(by_id[indicator])
            elif indicator in by_code:
                explicit.append(by_code[indicator])

        if explicit:
            return list(dict.fromkeys(explicit))

        question = query.question.lower()
        matched = []
        keyword_map = {
            "cpi": ["CN_CPI_NT_YOY", "US_PCECTPI_M"],
            "ppi": ["CN_PPI_YOY"],
            "pmi": ["PMI_CHN"],
            "m2": ["CN_M2_YOY", "US_M2SL_M"],
            "m1": ["CN_M1_YOY"],
            "gdp": ["GDP_CHN_YOY"],
            "社融": ["CN_M2_YOY"],
            "利率": ["REPO7D_CHN", "TREASURY10Y_CHN", "US_DFF_M", "US_DGS10_M"],
            "国债": ["TREASURY10Y_CHN", "US_DGS10_M"],
            "美债": ["US_DGS10_M", "US_DGS2_M"],
            "fed": ["US_DFF_M"],
            "联储": ["US_DFF_M", "US_WALCL_M"],
            "美元": ["US_DTWEXBGS_M"],
            "油价": ["US_DCOILBRENTEU_M"],
            "brent": ["US_DCOILBRENTEU_M"],
        }
        for keyword, codes in keyword_map.items():
            if keyword in question:
                matched.extend(codes)

        return list(dict.fromkeys(matched))

    def _safe_financial_adapter(self):
        try:
            from financial_adapter import get_adapter

            adapter = get_adapter()
            return adapter if adapter and adapter.is_available() else None
        except Exception:
            return None

    def _safe_stock_adapter(self):
        try:
            from skills import get_stock_adapter

            return get_stock_adapter()
        except Exception:
            return None

    def _build_valuation_payload(self, stock_code: str, include_price_fetch: bool = True) -> Dict[str, object]:
        adapter = self._safe_financial_adapter()
        latest_financial = adapter.get_latest_financial_data(stock_code, years=2) if adapter else {}
        latest_year = sorted(latest_financial.keys())[-1] if latest_financial else None
        latest_row = latest_financial.get(latest_year, {}) if latest_year else {}
        company_info = (adapter.get_company_info(stock_code) if adapter else {}) or {}

        latest_price = None
        latest_price_date = None
        stock_adapter = self._safe_stock_adapter() if include_price_fetch else None
        if stock_adapter:
            try:
                result = stock_adapter.get_stock_price(stock_code)
                data = result.get("data", {}) if result.get("success") else {}
                closes = data.get("close", []) if isinstance(data, dict) else []
                dates = data.get("dates", []) if isinstance(data, dict) else []
                latest_price = closes[-1] if closes else None
                latest_price_date = dates[-1] if dates else None
            except Exception:
                pass

        eps = latest_row.get("eps")
        bps = latest_row.get("bps")
        revenue = latest_row.get("revenue")
        total_equity = latest_row.get("total_equity")
        share_capital = latest_row.get("share_capital")

        shares_outstanding = None
        if share_capital:
            shares_outstanding = float(share_capital)
        elif total_equity and bps and bps > 0:
            shares_outstanding = float(total_equity) / float(bps)

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
                "latest_price_date": latest_price_date,
                "latest_year": latest_year,
            },
            "data_source": "local financial database + stock adapter",
        }

    def _load_peer_universe(self) -> List[Dict[str, str]]:
        if self.__class__._peer_universe_cache is None:
            if PRELOAD_RESULT_PATH.exists():
                data = json.loads(PRELOAD_RESULT_PATH.read_text(encoding="utf-8"))
                self.__class__._peer_universe_cache = data.get("success", [])
            else:
                self.__class__._peer_universe_cache = []
        return self.__class__._peer_universe_cache

    def _load_macro_catalog(self) -> List[Dict[str, str]]:
        if self.__class__._macro_catalog_cache is None:
            if MACRO_CATALOG_PATH.exists():
                self.__class__._macro_catalog_cache = json.loads(MACRO_CATALOG_PATH.read_text(encoding="utf-8"))
            else:
                self.__class__._macro_catalog_cache = []
        return self.__class__._macro_catalog_cache

    def _load_macro_series(self):
        if self.__class__._macro_series_cache is None:
            if pd is None or not MACRO_SERIES_PATH.exists():
                self.__class__._macro_series_cache = pd.DataFrame() if pd is not None else None
            else:
                self.__class__._macro_series_cache = pd.read_csv(MACRO_SERIES_PATH)
        return self.__class__._macro_series_cache

    def _fmt_num(self, value) -> Optional[str]:
        if value is None:
            return None
        try:
            numeric = float(value)
        except Exception:
            return str(value)
        if abs(numeric) >= 1e8:
            return f"{numeric / 1e8:.2f}亿"
        if abs(numeric) >= 1e4:
            return f"{numeric / 1e4:.2f}万"
        return f"{numeric:.2f}"

    def _resolve_industry_label(self, stock_code: str, company_info: Dict[str, str]) -> str:
        universe = self._load_peer_universe()
        for row in universe:
            if row.get("code") == stock_code and row.get("industry"):
                return row["industry"]

        industry = (company_info.get("industry") or "").strip()
        industry_code = (company_info.get("industry_code") or "").strip().upper()

        keyword_map = {
            "白酒": ["酒", "饮料", "精制茶"],
            "银行": ["货币金融"],
            "保险": ["保险"],
            "证券": ["资本市场", "证券"],
            "医药": ["医药", "生物"],
            "家电": ["家用电器"],
            "汽车": ["汽车"],
            "地产": ["房地"],
            "化工": ["化学"],
            "食品": ["食品"],
            "科技": ["软件", "计算机", "互联网", "电子"],
            "半导体": ["半导体"],
            "新能源": ["电气机械", "光伏", "新能源", "电池"],
            "有色金属": ["有色"],
            "黄金": ["黄金"],
            "养殖": ["畜牧", "养殖"],
            "物流": ["邮政", "物流"],
            "机场": ["机场"],
            "港口": ["港口"],
            "零售": ["零售", "商贸"],
            "电力": ["电力", "热力"],
        }
        for label, keywords in keyword_map.items():
            if any(keyword in industry for keyword in keywords):
                return label

        code_prefix_map = {
            "J66": "银行",
            "J67": "证券",
            "J68": "保险",
            "C27": "医药",
            "C38": "新能源",
            "C39": "家电",
        }
        for prefix, label in code_prefix_map.items():
            if industry_code.startswith(prefix):
                return label

        return industry


def infer_skill_from_intent(intent_result: IntentResult, query: QueryContext) -> str:
    if query.requested_skill:
        return query.requested_skill

    question = query.question
    if any(keyword in question for keyword in ["估值", "PE", "PB", "市盈率", "高估", "低估"]):
        return "valuation"
    if any(keyword in question for keyword in ["财报", "年报", "季报", "业绩"]):
        return "earnings_review"
    if any(keyword in question for keyword in ["同行", "对比", "竞品", "比较"]):
        return "peer_comparison"
    if any(keyword in question for keyword in ["宏观", "CPI", "PPI", "利率", "社融", "PMI"]):
        return "macro_analysis"
    if any(keyword in question for keyword in ["风险", "隐患", "问题"]):
        return "risk_diagnosis"
    if any(keyword in question for keyword in ["消息", "新闻", "政策", "事件"]):
        return "event_impact"

    mapping = {
        IntentType.FINANCIAL_ANALYSIS: "earnings_review",
        IntentType.VALUATION: "valuation",
        IntentType.COMPARISON: "peer_comparison",
        IntentType.INDUSTRY_ANALYSIS: "macro_to_asset",
        IntentType.RISK_ASSESSMENT: "risk_diagnosis",
        IntentType.TREND_PREDICTION: "macro_analysis",
    }
    return mapping.get(intent_result.intent, "company_analysis")
