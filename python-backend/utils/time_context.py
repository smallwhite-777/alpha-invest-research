"""
Time Context Injector - 时间上下文注入器

解决大语言模型知识截止问题：
- LLM知识截止于2024年
- 当用户说"最近"、"最新"、"今年"时，模型可能误判为2024年
- 通过注入真实当前时间，让模型正确理解时间表述

使用方式：
    from utils.time_context import inject_time_context

    system_prompt = inject_time_context("你是一个投资分析师...")
"""

from datetime import datetime, date
from typing import Optional


def get_current_time_context() -> dict:
    """
    获取当前时间上下文

    Returns:
        包含所有时间信息的字典
    """
    now = datetime.now()
    today = date.today()

    # 计算季度
    quarter = (now.month - 1) // 3 + 1

    # 计算最近的财报季度
    # Q1: 3月底, Q2: 6月底, Q3: 9月底, Q4: 12月底
    if now.month >= 11:  # 11月、12月 -> Q3报告应该已出
        latest_report_quarter = "Q3"
        latest_report_year = now.year
    elif now.month >= 8:  # 8月、9月、10月 -> Q2报告应该已出
        latest_report_quarter = "Q2"
        latest_report_year = now.year
    elif now.month >= 5:  # 5月、6月、7月 -> Q1报告应该已出
        latest_report_quarter = "Q1"
        latest_report_year = now.year
    else:  # 1-4月 -> 上一年Q4报告应该已出
        latest_report_quarter = "Q4"
        latest_report_year = now.year - 1

    return {
        "current_year": now.year,
        "current_month": now.month,
        "current_day": now.day,
        "current_date": today.isoformat(),
        "current_quarter": f"Q{quarter}",
        "latest_report_year": latest_report_year,
        "latest_report_quarter": latest_report_quarter,
        "last_year": now.year - 1,
        "next_year": now.year + 1,
        "is_first_half": now.month <= 6,
    }


def format_time_context_for_llm(ctx: Optional[dict] = None) -> str:
    """
    格式化时间上下文供LLM使用

    Args:
        ctx: 时间上下文字典，如果为None则自动获取

    Returns:
        格式化的时间上下文字符串，用于注入到系统提示词
    """
    if ctx is None:
        ctx = get_current_time_context()

    return f"""【重要时间信息】
当前真实日期：{ctx['current_date']}（{ctx['current_year']}年{ctx['current_month']}月{ctx['current_day']}日）
当前季度：{ctx['current_year']}年{ctx['current_quarter']}
最新可用财报：{ctx['latest_report_year']}年{ctx['latest_report_quarter']}报告

时间表述对应关系：
- "今年" = {ctx['current_year']}年
- "去年" = {ctx['last_year']}年
- "最近" = {ctx['last_year']}年或{ctx['current_year']}年（视具体语境）
- "最新财报" = {ctx['latest_report_year']}年{ctx['latest_report_quarter']}报告

请在回答时使用正确的年份，不要使用2024年作为"今年"或"当前年份"。
"""


def inject_time_context(
    system_prompt: str,
    position: str = "prefix"
) -> str:
    """
    将时间上下文注入到系统提示词中

    Args:
        system_prompt: 原始系统提示词
        position: 注入位置，"prefix"在开头，"suffix"在结尾

    Returns:
        注入了时间上下文的系统提示词
    """
    time_ctx = format_time_context_for_llm()

    if position == "prefix":
        return f"{time_ctx}\n\n{system_prompt}"
    else:
        return f"{system_prompt}\n\n{time_ctx}"


def get_time_aware_prompt() -> str:
    """
    获取时间感知提示词片段，可附加到任何提示词

    Returns:
        时间感知提示词片段
    """
    ctx = get_current_time_context()
    return f"""
【时间认知提醒】
当前是{ctx['current_year']}年{ctx['current_month']}月，请确保：
1. "今年"指的是{ctx['current_year']}年，不是2024年
2. "去年"指的是{ctx['last_year']}年
3. "最近两年"指的是{ctx['last_year']}年和{ctx['current_year']-2}年
4. 最新财报数据来自{ctx['latest_report_year']}年{ctx['latest_report_quarter']}报告
"""


# 常用时间相关常量（动态生成）
def get_time_constants() -> dict:
    """
    获取时间相关常量，用于代码中需要当前年份的地方

    Returns:
        时间常量字典
    """
    ctx = get_current_time_context()
    return {
        "CURRENT_YEAR": ctx['current_year'],
        "LAST_YEAR": ctx['last_year'],
        "LATEST_REPORT_YEAR": ctx['latest_report_year'],
        "VALID_YEAR_RANGE": (2000, ctx['current_year']),
        "DEFAULT_QUERY_YEARS": [str(ctx['last_year']), str(ctx['last_year'] - 1)],
    }


# 单例缓存，避免重复计算
_cached_context = None
_cache_date = None


def get_cached_time_context() -> dict:
    """
    获取缓存的时间上下文（同一天内只计算一次）

    Returns:
        时间上下文字典
    """
    global _cached_context, _cache_date

    today = date.today()

    if _cache_date != today or _cached_context is None:
        _cached_context = get_current_time_context()
        _cache_date = today

    return _cached_context


# 导出便捷函数
current_year = lambda: get_cached_time_context()['current_year']
last_year = lambda: get_cached_time_context()['last_year']
latest_report_year = lambda: get_cached_time_context()['latest_report_year']