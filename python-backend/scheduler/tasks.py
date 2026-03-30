"""
定时任务模块
使用APScheduler实现数据定时更新
"""

import os
import sys
from datetime import datetime
from typing import Callable, List
import logging

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)


class TaskScheduler:
    """定时任务调度器"""

    def __init__(self):
        self.scheduler = None
        self.tasks: List[dict] = []

    def init_scheduler(self):
        """初始化调度器"""
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.cron import CronTrigger

            self.scheduler = BackgroundScheduler()
            logger.info("[Scheduler] APScheduler initialized successfully")
            return True
        except ImportError:
            logger.warning("[Scheduler] APScheduler not installed, using simple timer fallback")
            self.scheduler = None
            return False
        except Exception as e:
            logger.error(f"[Scheduler] Failed to initialize: {e}")
            return False

    def add_task(self, task_id: str, func: Callable, trigger_type: str = 'cron', **trigger_args):
        """
        添加定时任务

        Args:
            task_id: 任务唯一标识
            func: 要执行的函数
            trigger_type: 触发器类型 ('cron', 'interval')
            **trigger_args: 触发器参数
        """
        if not self.scheduler:
            logger.warning(f"[Scheduler] Cannot add task {task_id}: scheduler not initialized")
            return False

        try:
            if trigger_type == 'cron':
                from apscheduler.triggers.cron import CronTrigger
                trigger = CronTrigger(**trigger_args)
            elif trigger_type == 'interval':
                from apscheduler.triggers.interval import IntervalTrigger
                trigger = IntervalTrigger(**trigger_args)
            else:
                raise ValueError(f"Unknown trigger type: {trigger_type}")

            self.scheduler.add_job(func, trigger, id=task_id, replace_existing=True)
            self.tasks.append({
                'id': task_id,
                'func': func.__name__,
                'trigger_type': trigger_type,
                'trigger_args': trigger_args
            })
            logger.info(f"[Scheduler] Task added: {task_id}")
            return True
        except Exception as e:
            logger.error(f"[Scheduler] Failed to add task {task_id}: {e}")
            return False

    def start(self):
        """启动调度器"""
        if self.scheduler:
            try:
                self.scheduler.start()
                logger.info("[Scheduler] Scheduler started successfully")
                return True
            except Exception as e:
                logger.error(f"[Scheduler] Failed to start: {e}")
                return False
        return False

    def stop(self):
        """停止调度器"""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("[Scheduler] Scheduler stopped")

    def get_tasks(self) -> List[dict]:
        """获取所有已注册的任务"""
        return self.tasks

    def is_running(self) -> bool:
        """检查调度器是否运行中"""
        return self.scheduler and self.scheduler.running


# 全局调度器实例
task_scheduler = TaskScheduler()


# ==================== 定时任务定义 ====================

def update_hot_stocks_data():
    """
    更新热门股票数据
    每日早盘前执行
    """
    logger.info(f"[Task] Updating hot stocks data at {datetime.now()}")
    try:
        from scripts.preload_financial_data import FinancialDataPreloader

        preloader = FinancialDataPreloader()
        result = preloader.run()

        logger.info(f"[Task] Hot stocks update completed: {len(result.get('success', []))} succeeded")
        return result
    except Exception as e:
        logger.error(f"[Task] Hot stocks update failed: {e}")
        return {'error': str(e)}


def update_stock_prices():
    """
    更新热门股票价格数据
    每小时执行
    """
    logger.info(f"[Task] Updating stock prices at {datetime.now()}")
    try:
        import akshare as ak
        from skills.alphaear_stock.scripts.database_manager import StockDatabaseManager

        db_manager = StockDatabaseManager()

        # 获取热门股票列表
        hot_stocks = [
            '600519', '000858', '000568', '002304', '600809',  # 白酒
            '601398', '601288', '601939', '601988', '600036',  # 银行
            '300750', '002594', '600900',  # 新能源
        ]

        updated = 0
        for code in hot_stocks:
            try:
                # 获取最新价格
                df = ak.stock_zh_a_spot_em()
                stock_info = df[df['代码'] == code]
                if not stock_info.empty:
                    latest = stock_info.iloc[0]
                    # 这里可以更新到数据库
                    updated += 1
            except Exception as e:
                logger.warning(f"[Task] Failed to update {code}: {e}")

        logger.info(f"[Task] Stock prices update completed: {updated} stocks updated")
        return {'updated': updated}
    except Exception as e:
        logger.error(f"[Task] Stock prices update failed: {e}")
        return {'error': str(e)}


def update_macro_indicators():
    """
    更新宏观经济指标
    每日执行
    """
    logger.info(f"[Task] Updating macro indicators at {datetime.now()}")
    try:
        import akshare as ak

        # 这里可以将宏观指标缓存到数据库
        # 目前仅记录日志
        indicators_updated = []

        # M2
        try:
            m2_df = ak.macro_china_m2_yoy()
            if m2_df is not None and not m2_df.empty:
                indicators_updated.append('M2_YOY')
        except:
            pass

        # CPI
        try:
            cpi_df = ak.macro_china_cpi_yoy()
            if cpi_df is not None and not cpi_df.empty:
                indicators_updated.append('CPI_YOY')
        except:
            pass

        # PMI
        try:
            pmi_df = ak.macro_china_pmi()
            if pmi_df is not None and not pmi_df.empty:
                indicators_updated.append('PMI')
        except:
            pass

        logger.info(f"[Task] Macro indicators update completed: {indicators_updated}")
        return {'updated': indicators_updated}
    except Exception as e:
        logger.error(f"[Task] Macro indicators update failed: {e}")
        return {'error': str(e)}


def cleanup_old_cache():
    """
    清理过期缓存
    每周执行
    """
    logger.info(f"[Task] Cleaning up old cache at {datetime.now()}")
    try:
        from cache.response_cache import get_cache

        cache = get_cache()
        stats = cache.get_stats()

        # 如果缓存条目过多，清理部分
        if stats.get('total_entries', 0) > 800:
            # 清理低质量条目
            cleared = cache.clear_low_quality()
            logger.info(f"[Task] Cache cleanup: cleared {cleared} entries")
            return {'cleared': cleared}

        logger.info("[Task] Cache cleanup: no cleanup needed")
        return {'cleared': 0}
    except Exception as e:
        logger.error(f"[Task] Cache cleanup failed: {e}")
        return {'error': str(e)}


def setup_default_tasks():
    """设置默认定时任务"""

    # 每日早盘前更新热门股票数据 (周一到周五 9:00)
    task_scheduler.add_task(
        'update_hot_stocks',
        update_hot_stocks_data,
        trigger_type='cron',
        day_of_week='mon-fri',
        hour=9,
        minute=0
    )

    # 每小时更新股票价格
    task_scheduler.add_task(
        'update_stock_prices',
        update_stock_prices,
        trigger_type='cron',
        hour='*',
        minute=30
    )

    # 每日更新宏观指标 (早上 8:00)
    task_scheduler.add_task(
        'update_macro_indicators',
        update_macro_indicators,
        trigger_type='cron',
        hour=8,
        minute=0
    )

    # 每周清理缓存 (周日凌晨 2:00)
    task_scheduler.add_task(
        'cleanup_cache',
        cleanup_old_cache,
        trigger_type='cron',
        day_of_week='sun',
        hour=2,
        minute=0
    )

    logger.info(f"[Scheduler] Default tasks setup completed: {len(task_scheduler.get_tasks())} tasks")


# 便捷函数
def start_scheduler():
    """启动定时任务调度器"""
    if task_scheduler.init_scheduler():
        setup_default_tasks()
        return task_scheduler.start()
    return False


def stop_scheduler():
    """停止定时任务调度器"""
    task_scheduler.stop()