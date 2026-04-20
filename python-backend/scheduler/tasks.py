"""
Task scheduler utilities.

Provides APScheduler integration when available and a lightweight
thread-based fallback so periodic jobs can still run in development.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)


def _parse_day_filter(day_of_week: Optional[str]) -> Optional[set[int]]:
    if not day_of_week:
        return None

    normalized = str(day_of_week).strip().lower()
    day_map = {
        "mon": 0,
        "tue": 1,
        "wed": 2,
        "thu": 3,
        "fri": 4,
        "sat": 5,
        "sun": 6,
    }

    if normalized == "mon-fri":
        return {0, 1, 2, 3, 4}
    if normalized in day_map:
        return {day_map[normalized]}

    result: set[int] = set()
    for part in normalized.split(","):
        part = part.strip()
        if part in day_map:
            result.add(day_map[part])
    return result or None


def _coerce_interval_seconds(trigger_type: str, trigger_args: Dict[str, Any]) -> int:
    if trigger_type == "interval":
        if trigger_args.get("seconds"):
            return max(int(trigger_args["seconds"]), 60)
        if trigger_args.get("minutes"):
            return max(int(trigger_args["minutes"]) * 60, 60)
        if trigger_args.get("hours"):
            return max(int(trigger_args["hours"]) * 3600, 60)
        return 300

    hour = trigger_args.get("hour")
    day_of_week = trigger_args.get("day_of_week")

    if hour == "*":
        return 3600
    if day_of_week:
        days = _parse_day_filter(day_of_week)
        if days and len(days) == 1:
            return 7 * 24 * 3600
        return 24 * 3600
    return 24 * 3600


class TaskScheduler:
    """Background task scheduler with APScheduler and thread fallback."""

    def __init__(self) -> None:
        self.scheduler = None
        self.tasks: List[Dict[str, Any]] = []
        self._use_fallback = False
        self._fallback_thread: Optional[threading.Thread] = None
        self._fallback_stop = threading.Event()
        self._fallback_lock = threading.Lock()

    def init_scheduler(self) -> bool:
        try:
            from apscheduler.schedulers.background import BackgroundScheduler

            self.scheduler = BackgroundScheduler()
            self._use_fallback = False
            logger.info("[Scheduler] APScheduler initialized successfully")
            return True
        except ImportError:
            self.scheduler = None
            self._use_fallback = True
            logger.warning("[Scheduler] APScheduler not installed, using thread fallback")
            return True
        except Exception as exc:
            logger.error("[Scheduler] Failed to initialize: %s", exc)
            self.scheduler = None
            self._use_fallback = False
            return False

    def add_task(
        self,
        task_id: str,
        func: Callable,
        trigger_type: str = "cron",
        **trigger_args: Any,
    ) -> bool:
        try:
            task_info: Dict[str, Any] = {
                "id": task_id,
                "func": func,
                "func_name": getattr(func, "__name__", task_id),
                "trigger_type": trigger_type,
                "trigger_args": trigger_args,
                "last_run": None,
                "last_result": None,
                "last_error": None,
            }

            if self.scheduler is not None:
                if trigger_type == "cron":
                    from apscheduler.triggers.cron import CronTrigger

                    trigger = CronTrigger(**trigger_args)
                elif trigger_type == "interval":
                    from apscheduler.triggers.interval import IntervalTrigger

                    trigger = IntervalTrigger(**trigger_args)
                else:
                    raise ValueError(f"Unknown trigger type: {trigger_type}")

                self.scheduler.add_job(func, trigger, id=task_id, replace_existing=True)
            elif self._use_fallback:
                interval_seconds = _coerce_interval_seconds(trigger_type, trigger_args)
                task_info["interval_seconds"] = interval_seconds
                run_on_start = bool(trigger_args.pop("run_on_start", False))
                task_info["run_on_start"] = run_on_start
                task_info["day_filter"] = _parse_day_filter(trigger_args.get("day_of_week"))
                task_info["next_run_at"] = time.time() if run_on_start else time.time() + interval_seconds
            else:
                logger.warning("[Scheduler] Cannot add task %s: scheduler not initialized", task_id)
                return False

            existing_index = next((i for i, task in enumerate(self.tasks) if task["id"] == task_id), None)
            if existing_index is None:
                self.tasks.append(task_info)
            else:
                self.tasks[existing_index] = task_info

            logger.info("[Scheduler] Task added: %s", task_id)
            return True
        except Exception as exc:
            logger.error("[Scheduler] Failed to add task %s: %s", task_id, exc)
            return False

    def _run_task(self, task: Dict[str, Any]) -> None:
        try:
            logger.info("[Scheduler] Running task: %s", task["id"])
            result = task["func"]()
            task["last_run"] = datetime.now().isoformat()
            task["last_result"] = result
            task["last_error"] = None
        except Exception as exc:
            task["last_run"] = datetime.now().isoformat()
            task["last_error"] = str(exc)
            logger.exception("[Scheduler] Task %s failed", task["id"])

    def _should_run_today(self, task: Dict[str, Any]) -> bool:
        day_filter = task.get("day_filter")
        if not day_filter:
            return True
        return datetime.now().weekday() in day_filter

    def _fallback_loop(self) -> None:
        logger.info("[Scheduler] Fallback scheduler loop started")
        while not self._fallback_stop.is_set():
            now_ts = time.time()
            with self._fallback_lock:
                for task in self.tasks:
                    if "interval_seconds" not in task:
                        continue
                    next_run_at = task.get("next_run_at", now_ts)
                    if now_ts < next_run_at:
                        continue
                    if not self._should_run_today(task):
                        task["next_run_at"] = now_ts + 3600
                        continue

                    self._run_task(task)
                    task["next_run_at"] = now_ts + int(task["interval_seconds"])
            self._fallback_stop.wait(30)
        logger.info("[Scheduler] Fallback scheduler loop stopped")

    def start(self) -> bool:
        if self.scheduler is not None:
            try:
                self.scheduler.start()
                logger.info("[Scheduler] Scheduler started successfully")
                return True
            except Exception as exc:
                logger.error("[Scheduler] Failed to start: %s", exc)
                return False

        if not self._use_fallback:
            return False

        if self._fallback_thread and self._fallback_thread.is_alive():
            return True

        self._fallback_stop.clear()
        self._fallback_thread = threading.Thread(
            target=self._fallback_loop,
            name="task-scheduler-fallback",
            daemon=True,
        )
        self._fallback_thread.start()
        return True

    def stop(self) -> None:
        if self.scheduler is not None and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("[Scheduler] Scheduler stopped")

        if self._fallback_thread and self._fallback_thread.is_alive():
            self._fallback_stop.set()
            self._fallback_thread.join(timeout=5)

    def get_tasks(self) -> List[Dict[str, Any]]:
        tasks: List[Dict[str, Any]] = []
        for task in self.tasks:
            safe_task = {
                "id": task["id"],
                "func": task.get("func_name"),
                "trigger_type": task.get("trigger_type"),
                "trigger_args": task.get("trigger_args", {}),
                "last_run": task.get("last_run"),
                "last_error": task.get("last_error"),
            }
            if "interval_seconds" in task:
                safe_task["interval_seconds"] = task["interval_seconds"]
                next_run_at = task.get("next_run_at")
                if next_run_at:
                    safe_task["next_run_at"] = datetime.fromtimestamp(next_run_at).isoformat()
            tasks.append(safe_task)
        return tasks

    def is_running(self) -> bool:
        if self.scheduler is not None:
            return bool(self.scheduler.running)
        return bool(self._fallback_thread and self._fallback_thread.is_alive())


task_scheduler = TaskScheduler()


def update_hot_stocks_data() -> Dict[str, Any]:
    logger.info("[Task] Updating hot stocks data at %s", datetime.now().isoformat())
    try:
        from scripts.preload_financial_data import FinancialDataPreloader

        preloader = FinancialDataPreloader()
        result = preloader.run()
        logger.info(
            "[Task] Hot stocks update completed: %s succeeded",
            len(result.get("success", [])),
        )
        return result
    except Exception as exc:
        logger.error("[Task] Hot stocks update failed: %s", exc)
        return {"error": str(exc)}


def update_stock_prices() -> Dict[str, Any]:
    logger.info("[Task] Updating stock prices at %s", datetime.now().isoformat())
    try:
        import akshare as ak

        hot_stocks = [
            "600519",
            "000858",
            "000568",
            "002304",
            "600809",
            "601398",
            "601288",
            "601939",
            "601988",
            "600036",
            "300750",
            "002594",
            "600900",
        ]

        spot_df = ak.stock_zh_a_spot_em()
        updated = 0
        for code in hot_stocks:
            stock_info = spot_df[spot_df["代码"] == code]
            if not stock_info.empty:
                updated += 1

        logger.info("[Task] Stock prices update completed: %s stocks checked", updated)
        return {"updated": updated}
    except Exception as exc:
        logger.error("[Task] Stock prices update failed: %s", exc)
        return {"error": str(exc)}


def update_macro_indicators() -> Dict[str, Any]:
    logger.info("[Task] Updating macro indicators at %s", datetime.now().isoformat())
    try:
        import akshare as ak

        indicators_updated: List[str] = []

        try:
            if ak.macro_china_m2_yoy() is not None:
                indicators_updated.append("M2_YOY")
        except Exception:
            pass

        try:
            if ak.macro_china_cpi_yoy() is not None:
                indicators_updated.append("CPI_YOY")
        except Exception:
            pass

        try:
            if ak.macro_china_pmi() is not None:
                indicators_updated.append("PMI")
        except Exception:
            pass

        logger.info("[Task] Macro indicators update completed: %s", indicators_updated)
        return {"updated": indicators_updated}
    except Exception as exc:
        logger.error("[Task] Macro indicators update failed: %s", exc)
        return {"error": str(exc)}


def refresh_hot_news() -> Dict[str, Any]:
    logger.info("[Task] Refreshing hot news at %s", datetime.now().isoformat())
    try:
        from skills import get_news_adapter

        adapter = get_news_adapter()
        sources = ["cls", "wallstreetcn", "weibo"]
        fetched: Dict[str, int] = {}

        for source in sources:
            items = adapter.get_hot_news(source, count=20)
            fetched[source] = len(items) if isinstance(items, list) else 0
            time.sleep(0.2)

        logger.info("[Task] Hot news refresh completed: %s", fetched)
        return {"sources": fetched}
    except Exception as exc:
        logger.error("[Task] Hot news refresh failed: %s", exc)
        return {"error": str(exc)}


def cleanup_old_cache() -> Dict[str, Any]:
    logger.info("[Task] Cleaning old cache at %s", datetime.now().isoformat())
    try:
        from cache.response_cache import get_cache

        cache = get_cache()
        stats = cache.get_stats()
        if stats.get("total_entries", 0) > 800:
            cleared = cache.clear_low_quality()
            logger.info("[Task] Cache cleanup cleared %s entries", cleared)
            return {"cleared": cleared}

        logger.info("[Task] Cache cleanup skipped")
        return {"cleared": 0}
    except Exception as exc:
        logger.error("[Task] Cache cleanup failed: %s", exc)
        return {"error": str(exc)}


def setup_default_tasks() -> None:
    task_scheduler.add_task(
        "refresh_hot_news",
        refresh_hot_news,
        trigger_type="interval",
        minutes=5,
        run_on_start=True,
    )

    task_scheduler.add_task(
        "update_hot_stocks",
        update_hot_stocks_data,
        trigger_type="cron",
        day_of_week="mon-fri",
        hour=9,
        minute=0,
    )

    task_scheduler.add_task(
        "update_stock_prices",
        update_stock_prices,
        trigger_type="cron",
        hour="*",
        minute=30,
    )

    task_scheduler.add_task(
        "update_macro_indicators",
        update_macro_indicators,
        trigger_type="cron",
        hour=8,
        minute=0,
    )

    task_scheduler.add_task(
        "cleanup_cache",
        cleanup_old_cache,
        trigger_type="cron",
        day_of_week="sun",
        hour=2,
        minute=0,
    )

    logger.info("[Scheduler] Default tasks setup completed: %s tasks", len(task_scheduler.get_tasks()))


def start_scheduler() -> bool:
    if task_scheduler.init_scheduler():
        setup_default_tasks()
        return task_scheduler.start()
    return False


def stop_scheduler() -> None:
    task_scheduler.stop()
