import json
import os
import re
import ssl
import sys
import time
import urllib.request
from datetime import date, timedelta
from io import StringIO
from pathlib import Path

import pandas as pd
import requests

try:
    import akshare as ak
except ImportError:
    ak = None

try:
    import tushare as ts
except ImportError:
    ts = None

os.environ["REQUESTS_CA_BUNDLE"] = ""
ssl._create_default_https_context = ssl._create_unverified_context
requests.packages.urllib3.disable_warnings()
_original_request = requests.Session.request


def _request_without_verify(self, method, url, **kwargs):
    kwargs.setdefault("verify", False)
    return _original_request(self, method, url, **kwargs)


requests.Session.request = _request_without_verify


REPO_ROOT = Path(__file__).resolve().parent.parent
UPSTREAM_DATA_DIR = REPO_ROOT.parent / "Knowledgebase" / "timesfm_deploy" / "data"
UPSTREAM_US_DIR = UPSTREAM_DATA_DIR / "us_macro"
UPSTREAM_CHINA_DIR = UPSTREAM_DATA_DIR / "china_macro"

FRED_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv"

US_SERIES = {
    "WALCL": "WALCL",
    "TREAST": "TREAST",
    "WSHOMCB": "WSHOMCB",
    "WTREGEN": "WTREGEN",
    "TOTRESNS": "TOTRESNS",
    "M2SL": "M2SL",
    "M2NS": "M2NS",
    "BOGMBASE": "BOGMBASE",
    "DFF": "DFF",
    "DGS10": "DGS10",
    "DGS2": "DGS2",
    "DGS5": "DGS5",
    "IORB": "IORB",
    "EFFR": "EFFR",
    "MORTGAGE30US": "MORTGAGE30US",
    "BUSLOANS": "BUSLOANS",
    "CONSUMER": "CONSUMER",
    "PCECTPI": "PCECTPI",
    "CPALTT01USM657N": "CPALTT01USM657N",
    "WORAL": "WORAL",
    "GFDEBTN": "GFDEBTN",
    "EXCRESNS": "EXCRESNS",
    "DTWEXBGS": "DTWEXBGS",
    "DEXCHUS": "DEXCHUS",
    "DCOILBRENTEU": "DCOILBRENTEU",
}

MONTHLY_MANAGED_IDS = {
    "PMI_CHN",
    "GDP_CHN_YOY",
    "IP_CHN_YOY",
    "RS_CHN_YOY",
    "REPO7D_CHN",
    "TREASURY10Y_CHN",
}

JOINT_MANAGED_IDS = {
    "CN_CPI_NT_YOY",
    "CN_PPI_YOY",
    "CN_M2_YOY",
    "CN_M1_YOY",
}

DAILY_MANAGED_IDS = {
    "REPO7D_CHN",
    "TREASURY10Y_CHN",
}


def log(message: str) -> None:
    print(message, flush=True)


def fetch_fred_series(series_id: str) -> pd.DataFrame:
    url = f"{FRED_BASE}?id={series_id}"
    session = requests.Session()
    session.verify = False

    for attempt in range(5):
        try:
            if attempt < 3:
                with urllib.request.urlopen(url, timeout=30) as response:
                    csv_text = response.read().decode("utf-8")
            else:
                response = session.get(url, timeout=30)
                response.raise_for_status()
                csv_text = response.text
            df = pd.read_csv(StringIO(csv_text))
            date_col = "observation_date" if "observation_date" in df.columns else df.columns[0]
            value_col = [column for column in df.columns if column != date_col][0]
            df = df.rename(columns={date_col: "date", value_col: series_id})
            df["date"] = pd.to_datetime(df["date"])
            df[series_id] = pd.to_numeric(df[series_id], errors="coerce")
            df = df.dropna(subset=[series_id]).sort_values("date").reset_index(drop=True)
            return df
        except Exception:
            if attempt == 4:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {series_id}")


def aggregate_monthly(df: pd.DataFrame, value_column: str) -> pd.DataFrame:
    monthly = df.copy()
    monthly["month"] = monthly["date"].dt.to_period("M")
    monthly = monthly.groupby("month").last().reset_index()
    monthly["date"] = monthly["month"].dt.to_timestamp("M")
    return monthly[["date", value_column]]


def refresh_us_fred() -> dict:
    UPSTREAM_US_DIR.mkdir(parents=True, exist_ok=True)

    daily_frames = []
    monthly_frames = []
    latest_dates = {}
    failures = []
    existing_daily = {}
    existing_monthly = {}

    daily_path = UPSTREAM_US_DIR / "us_macro_fred_daily.csv"
    monthly_path = UPSTREAM_US_DIR / "us_macro_fred_monthly.csv"
    if daily_path.exists():
        old_daily = pd.read_csv(daily_path)
        for column in old_daily.columns:
            if column != "date":
                existing_daily[column] = old_daily[["date", column]].copy()
    if monthly_path.exists():
        old_monthly = pd.read_csv(monthly_path)
        for column in old_monthly.columns:
            if column != "date":
                existing_monthly[column] = old_monthly[["date", column]].copy()

    for output_column, fred_series in US_SERIES.items():
        log(f"[US] Fetching {fred_series}")
        try:
            df = fetch_fred_series(fred_series)
            if df.empty:
                failures.append(output_column)
                continue

            df = df.rename(columns={fred_series: output_column})
            monthly = aggregate_monthly(df[["date", output_column]], output_column)
            monthly = monthly.rename(columns={output_column: f"{output_column}_M"})

            daily_frames.append(df[["date", output_column]])
            monthly_frames.append(monthly)
            latest_dates[output_column] = df["date"].max().strftime("%Y-%m-%d")
        except Exception as error:
            failures.append(output_column)
            log(f"  ! {output_column} failed: {error}")
            if output_column in existing_daily:
                daily_frames.append(existing_daily[output_column])
            monthly_column = f"{output_column}_M"
            if monthly_column in existing_monthly:
                monthly_frames.append(existing_monthly[monthly_column])
        time.sleep(0.2)

    if not daily_frames or not monthly_frames:
        raise RuntimeError("No US FRED series were refreshed")

    daily_merged = daily_frames[0]
    for frame in daily_frames[1:]:
        daily_merged = daily_merged.merge(frame, on="date", how="outer")
    daily_merged = daily_merged.sort_values("date")

    monthly_merged = monthly_frames[0]
    for frame in monthly_frames[1:]:
        monthly_merged = monthly_merged.merge(frame, on="date", how="outer")
    monthly_merged = monthly_merged.sort_values("date")

    chronos_rows = []
    for column in monthly_merged.columns:
        if column == "date":
            continue
        unique_id = column.removesuffix("_M")
        valid = monthly_merged[["date", column]].dropna()
        for _, row in valid.iterrows():
            chronos_rows.append({
                "date": row["date"],
                "unique_id": unique_id,
                "value": row[column],
            })
    chronos_df = pd.DataFrame(chronos_rows).sort_values(["unique_id", "date"])

    catalog_rows = [{"id": key, "fred_series": value} for key, value in US_SERIES.items()]
    catalog_df = pd.DataFrame(catalog_rows)

    daily_merged.to_csv(UPSTREAM_US_DIR / "us_macro_fred_daily.csv", index=False, encoding="utf-8")
    monthly_merged.to_csv(UPSTREAM_US_DIR / "us_macro_fred_monthly.csv", index=False, encoding="utf-8")
    chronos_df.to_csv(UPSTREAM_US_DIR / "us_macro_fred_chronos.csv", index=False, encoding="utf-8")
    catalog_df.to_csv(UPSTREAM_US_DIR / "fred_series_catalog.csv", index=False, encoding="utf-8")

    return {
        "success": True,
        "daily_rows": len(daily_merged),
        "monthly_rows": len(monthly_merged),
        "failures": failures,
        "latest_dates": latest_dates,
    }


def parse_china_date(value) -> pd.Timestamp | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, pd.Timestamp):
        return value

    text = str(value).strip()
    if not text:
        return None

    direct = pd.to_datetime(text, errors="coerce")
    if pd.notna(direct):
        return direct

    match = re.search(r"(\d{4})年", text)
    if not match:
        return None
    year = int(match.group(1))

    month_match = re.search(r"(\d{1,2})月", text)
    if month_match:
        return pd.Timestamp(year=year, month=int(month_match.group(1)), day=1)

    quarter_match = re.search(r"第?(\d)季度", text)
    if quarter_match:
        month = (int(quarter_match.group(1)) - 1) * 3 + 1
        return pd.Timestamp(year=year, month=month, day=1)

    return None


def normalize_long(series_name: str, df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    result["date"] = pd.to_datetime(result["date"])
    result["date"] = result["date"].dt.to_period("M").dt.to_timestamp("M")
    result = result.dropna(subset=["value"]).sort_values("date")
    result["unique_id"] = series_name
    return result[["date", "unique_id", "value"]]


def normalize_daily_long(series_name: str, df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    result["date"] = pd.to_datetime(result["date"]).dt.normalize()
    result = result.dropna(subset=["value"]).sort_values("date")
    result["unique_id"] = series_name
    return result[["date", "unique_id", "value"]]


def with_retry(name: str, loader, attempts: int = 3, delay: float = 1.5):
    last_error = None
    for attempt in range(attempts):
        try:
            return loader()
        except Exception as error:
            last_error = error
            if attempt == attempts - 1:
                raise
            log(f"  retry {attempt + 2}/{attempts} for {name}: {error}")
            time.sleep(delay * (attempt + 1))
    raise last_error


def load_existing_series(file_path: Path, series_id: str) -> pd.DataFrame | None:
    if not file_path.exists():
        return None
    df = pd.read_csv(file_path)
    if "unique_id" not in df.columns:
        return None
    subset = df[df["unique_id"] == series_id].copy()
    if subset.empty:
        return None
    subset["date"] = pd.to_datetime(subset["date"])
    return subset[["date", "unique_id", "value"]]


def month_end_from_daily(frame: pd.DataFrame) -> pd.DataFrame:
    monthly = frame.copy()
    monthly["date"] = pd.to_datetime(monthly["date"])
    monthly["month"] = monthly["date"].dt.to_period("M")
    monthly = monthly.groupby(["unique_id", "month"], as_index=False).last()
    monthly["date"] = monthly["month"].dt.to_timestamp("M")
    return monthly[["date", "unique_id", "value"]]


def fetch_repo7d_from_akshare() -> pd.DataFrame:
    repo = with_retry("repo_rate_query", lambda: ak.repo_rate_query())
    repo["date"] = pd.to_datetime(repo["date"])
    repo["value"] = pd.to_numeric(repo["FR007"], errors="coerce")
    return normalize_daily_long("REPO7D_CHN", repo[["date", "value"]])


def fetch_repo7d_from_tushare() -> pd.DataFrame:
    if ts is None:
        raise RuntimeError("tushare is not installed")

    token = os.environ.get("TUSHARE_TOKEN")
    if not token:
        raise RuntimeError("TUSHARE_TOKEN is not set")

    pro = ts.pro_api(token)
    start = "20050101"
    end = pd.Timestamp.today().strftime("%Y%m%d")
    repo = with_retry("tushare repo", lambda: pro.repo_daily(trade_date="", start_date=start, end_date=end), attempts=2)
    repo["date"] = pd.to_datetime(repo["trade_date"], format="%Y%m%d")
    candidate_columns = [column for column in repo.columns if "7" in column.lower() and "rate" in column.lower()]
    if not candidate_columns:
      candidate_columns = [column for column in repo.columns if "repo" in column.lower() and "rate" in column.lower()]
    if not candidate_columns:
        raise RuntimeError(f"Could not find repo rate column in tushare repo_daily columns: {repo.columns.tolist()}")
    repo["value"] = pd.to_numeric(repo[candidate_columns[0]], errors="coerce")
    return normalize_daily_long("REPO7D_CHN", repo[["date", "value"]])


def fetch_treasury10y_from_akshare() -> pd.DataFrame:
    end = date.today()
    start = date(2005, 1, 1)
    frames: list[pd.DataFrame] = []
    chunk_start = start

    while chunk_start <= end:
        chunk_end = min(chunk_start + timedelta(days=360), end)
        start_text = chunk_start.strftime("%Y%m%d")
        end_text = chunk_end.strftime("%Y%m%d")
        log(f"  loading bond_china_yield {start_text}-{end_text}")
        chunk = with_retry(
            f"bond_china_yield {start_text}-{end_text}",
            lambda s=start_text, e=end_text: ak.bond_china_yield(start_date=s, end_date=e),
            attempts=3,
            delay=1,
        )
        frames.append(chunk)
        chunk_start = chunk_end + timedelta(days=1)

    merged = pd.concat(frames, ignore_index=True)
    merged = merged[merged["曲线名称"] == "中债国债收益率曲线"].copy()
    merged["date"] = pd.to_datetime(merged["日期"])
    merged["value"] = pd.to_numeric(merged["10年"], errors="coerce")
    merged = merged.dropna(subset=["value"])
    merged = merged.sort_values("date").drop_duplicates(subset=["date"], keep="last")
    return normalize_daily_long("TREASURY10Y_CHN", merged[["date", "value"]])


def fetch_china_series_from_akshare() -> dict:
    if ak is None:
        raise RuntimeError("akshare is not installed")

    series_frames: dict[str, pd.DataFrame] = {}
    failures: list[str] = []

    def capture(series_id: str, loader, fallback_loader=None):
        try:
            series_frames[series_id] = loader()
        except Exception as error:
            if fallback_loader is not None:
                try:
                    log(f"  ! {series_id} primary failed, trying fallback: {error}")
                    series_frames[series_id] = fallback_loader()
                    return
                except Exception as fallback_error:
                    error = fallback_error
            failures.append(series_id)
            log(f"  ! {series_id} failed: {error}")

    log("[CN] Fetching CPI")
    capture("CN_CPI_NT_YOY", lambda: (
        lambda cpi: normalize_long("CN_CPI_NT_YOY", cpi[["date", "value"]])
    )(
        (
            lambda cpi: cpi.assign(
                date=cpi["date_text"].apply(parse_china_date),
                value=pd.to_numeric(cpi["nation_yoy"], errors="coerce"),
            )
        )(
            with_retry("macro_china_cpi", lambda: ak.macro_china_cpi()).set_axis([
                "date_text",
                "nation_level",
                "nation_yoy",
                "nation_mom",
                "nation_cum",
                "urban_level",
                "urban_yoy",
                "urban_mom",
                "urban_cum",
                "rural_level",
                "rural_yoy",
                "rural_mom",
                "rural_cum",
            ], axis=1)
        )
    ))

    log("[CN] Fetching PPI")
    capture("CN_PPI_YOY", lambda: (
        lambda ppi: normalize_long("CN_PPI_YOY", ppi[["date", "value"]])
    )(
        (
            lambda ppi: ppi.assign(
                date=ppi["date_text"].apply(parse_china_date),
                value=pd.to_numeric(ppi["yoy"], errors="coerce"),
            )
        )(
            with_retry("macro_china_ppi", lambda: ak.macro_china_ppi()).set_axis(["date_text", "level", "yoy", "cum"], axis=1)
        )
    ))

    log("[CN] Fetching PMI")
    capture("PMI_CHN", lambda: (
        lambda pmi: normalize_long("PMI_CHN", pmi[["date", "value"]])
    )(
        with_retry("macro_china_pmi", lambda: ak.macro_china_pmi()).assign(
            date=lambda frame: frame.iloc[:, 0].apply(parse_china_date),
            value=lambda frame: pd.to_numeric(frame.iloc[:, 1], errors="coerce"),
        )
    ))

    log("[CN] Fetching GDP")
    def load_gdp():
        gdp = with_retry("macro_china_gdp", lambda: ak.macro_china_gdp())
        date_column = gdp.columns[0]
        yoy_column = [column for column in gdp.columns if "同比" in str(column) and "国内生产总值" in str(column)][0]
        gdp["date"] = gdp[date_column].apply(parse_china_date)
        gdp["value"] = pd.to_numeric(gdp[yoy_column], errors="coerce")
        gdp = gdp.dropna(subset=["date", "value"]).sort_values("date")
        gdp = gdp[["date", "value"]].drop_duplicates(subset=["date"]).set_index("date")
        monthly_index = pd.date_range(gdp.index.min(), gdp.index.max() + pd.offsets.MonthEnd(0), freq="ME")
        gdp = gdp.reindex(monthly_index, method="ffill").reset_index().rename(columns={"index": "date"})
        return normalize_long("GDP_CHN_YOY", gdp[["date", "value"]])
    capture("GDP_CHN_YOY", load_gdp)

    log("[CN] Fetching money supply")
    def load_money():
        money = with_retry("macro_china_money_supply", lambda: ak.macro_china_money_supply())
        money["date"] = money.iloc[:, 0].apply(parse_china_date)
        m1_column = next(column for column in money.columns if "M1" in str(column) and "同比" in str(column))
        m2_column = next(column for column in money.columns if "M2" in str(column) and "同比" in str(column))
        money["m1_value"] = pd.to_numeric(money[m1_column], errors="coerce")
        money["m2_value"] = pd.to_numeric(money[m2_column], errors="coerce")
        return {
            "CN_M1_YOY": normalize_long("CN_M1_YOY", money[["date", "m1_value"]].rename(columns={"m1_value": "value"})),
            "CN_M2_YOY": normalize_long("CN_M2_YOY", money[["date", "m2_value"]].rename(columns={"m2_value": "value"})),
        }
    try:
        money_frames = load_money()
        series_frames.update(money_frames)
    except Exception as error:
        failures.extend(["CN_M1_YOY", "CN_M2_YOY"])
        log(f"  ! money supply failed: {error}")

    log("[CN] Fetching industrial production")
    capture("IP_CHN_YOY", lambda: (
        lambda ip: normalize_long("IP_CHN_YOY", ip[["date", "value"]])
    )(
        with_retry("macro_china_industrial_production_yoy", lambda: ak.macro_china_industrial_production_yoy()).assign(
            date=lambda frame: frame.iloc[:, 0].apply(parse_china_date),
            value=lambda frame: pd.to_numeric(frame.iloc[:, 1], errors="coerce"),
        )
    ))

    log("[CN] Fetching retail sales")
    capture("RS_CHN_YOY", lambda: (
        lambda retail: normalize_long("RS_CHN_YOY", retail[["date", "value"]])
    )(
        with_retry("macro_china_consumer_goods_retail", lambda: ak.macro_china_consumer_goods_retail()).assign(
            date=lambda frame: frame.iloc[:, 0].apply(parse_china_date),
            value=lambda frame: pd.to_numeric(frame.iloc[:, 2], errors="coerce"),
        )
    ))

    log("[CN] Fetching repo 7d")
    capture("REPO7D_CHN", fetch_repo7d_from_akshare, fallback_loader=fetch_repo7d_from_tushare if ts is not None else None)

    log("[CN] Fetching treasury 10y")
    capture("TREASURY10Y_CHN", fetch_treasury10y_from_akshare)

    return {
        "series": series_frames,
        "latest_dates": {
            series_id: frame["date"].max().strftime("%Y-%m-%d")
            for series_id, frame in series_frames.items()
            if not frame.empty
        },
        "failures": failures,
    }


def merge_long_file(file_path: Path, managed_ids: set[str], updates: dict[str, pd.DataFrame]) -> int:
    if file_path.exists():
        existing = pd.read_csv(file_path)
        existing["date"] = pd.to_datetime(existing["date"])
    else:
        existing = pd.DataFrame(columns=["date", "unique_id", "value"])

    refreshed_frames = [frame for series_id, frame in updates.items() if series_id in managed_ids]
    refreshed = pd.concat(refreshed_frames, ignore_index=True) if refreshed_frames else pd.DataFrame(columns=["date", "unique_id", "value"])
    merged = pd.concat([existing, refreshed], ignore_index=True)
    merged["date"] = pd.to_datetime(merged["date"])
    merged = merged.sort_values(["unique_id", "date"]).drop_duplicates(subset=["date", "unique_id"], keep="last")
    merged.to_csv(file_path, index=False, encoding="utf-8", date_format="%Y-%m-%d")
    return len(merged)


def write_china_aux_files(series_frames: dict[str, pd.DataFrame]) -> None:
    UPSTREAM_CHINA_DIR.mkdir(parents=True, exist_ok=True)

    wide_frames = []
    for series_id, frame in series_frames.items():
        wide_frames.append(frame.rename(columns={"unique_id": "series_id"}).pivot(index="date", columns="series_id", values="value"))

    if wide_frames:
        wide = pd.concat(wide_frames, axis=1)
        wide = wide.loc[:, ~wide.columns.duplicated()].sort_index().reset_index()
        wide.to_csv(UPSTREAM_CHINA_DIR / "china_macro_real_akshare.csv", index=False, encoding="utf-8", date_format="%Y-%m-%d")

    chronos = pd.concat(series_frames.values(), ignore_index=True).sort_values(["unique_id", "date"])
    chronos.to_csv(UPSTREAM_CHINA_DIR / "china_macro_real_chronos.csv", index=False, encoding="utf-8", date_format="%Y-%m-%d")


def refresh_china_macro() -> dict:
    result = fetch_china_series_from_akshare()
    series_frames = result["series"]

    if not series_frames:
        return {
            "success": False,
            "reason": "No China series refreshed",
            "failures": result.get("failures", []),
        }

    monthly_rows = merge_long_file(
        UPSTREAM_CHINA_DIR / "china_macro_monthly_clean.csv",
        MONTHLY_MANAGED_IDS,
        series_frames,
    )
    daily_rows = merge_long_file(
        UPSTREAM_CHINA_DIR / "china_macro_daily.csv",
        DAILY_MANAGED_IDS,
        {series_id: frame for series_id, frame in series_frames.items() if series_id in DAILY_MANAGED_IDS},
    )
    monthly_from_daily_rows = merge_long_file(
        UPSTREAM_CHINA_DIR / "china_macro_monthly_clean.csv",
        DAILY_MANAGED_IDS,
        {series_id: frame for series_id, frame in month_end_from_daily(pd.concat([
            series_frames[series_id] for series_id in DAILY_MANAGED_IDS if series_id in series_frames
        ], ignore_index=True)).groupby("unique_id")}
        if any(series_id in series_frames for series_id in DAILY_MANAGED_IDS)
        else {},
    )
    joint_rows = merge_long_file(
        UPSTREAM_DATA_DIR / "us_china_joint_chronos.csv",
        JOINT_MANAGED_IDS,
        series_frames,
    )
    write_china_aux_files(series_frames)

    return {
        "success": True,
        "monthly_rows": monthly_rows,
        "daily_rows": daily_rows,
        "monthly_from_daily_rows": monthly_from_daily_rows,
        "joint_rows": joint_rows,
        "latest_dates": result["latest_dates"],
        "failures": result.get("failures", []),
    }


def main() -> None:
    log(f"Repo root: {REPO_ROOT}")
    log(f"Upstream data dir: {UPSTREAM_DATA_DIR}")

    summary = {
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "upstreamDataDir": str(UPSTREAM_DATA_DIR),
    }

    summary["us"] = refresh_us_fred()

    if ak is not None:
        summary["china"] = refresh_china_macro()
    else:
        summary["china"] = {
            "success": False,
            "reason": "akshare is not installed",
        }

    refresh_manifest = REPO_ROOT / "macro-data" / "upstream-refresh.json"
    refresh_manifest.write_text(f"{json.dumps(summary, ensure_ascii=False, indent=2)}\n", encoding="utf-8")
    log(f"Refresh summary written to {refresh_manifest}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        log(f"Refresh failed: {error}")
        sys.exit(1)
