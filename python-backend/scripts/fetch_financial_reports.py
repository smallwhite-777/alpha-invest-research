#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
财务报表数据获取脚本
从AKShare获取A股和港股的财务报表数据，并缓存到本地

数据源:
- A股: AKShare (东方财富、新浪财经)
- 港股: AKShare (东方财富)
- 美股: yfinance

使用方法:
    python fetch_financial_reports.py --stock 600519 --type all
    python fetch_financial_reports.py --batch stocks.txt --output ./financial_data
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

import pandas as pd
import akshare as ak

# 添加父目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from loguru import logger

# 配置
OUTPUT_DIR = Path(__file__).parent.parent.parent / "Knowledgebase" / "Financial Reports"
CACHE_DIR = Path(__file__).parent.parent / "data" / "financial_cache"


class FinancialReportFetcher:
    """财务报表数据获取器"""

    def __init__(self, output_dir: Path = OUTPUT_DIR, cache_dir: Path = CACHE_DIR):
        self.output_dir = output_dir
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch_a_share_abstract(self, stock_code: str) -> Optional[pd.DataFrame]:
        """
        获取A股财务摘要

        包含: 营业收入、净利润、毛利率、ROE、每股收益等关键指标
        数据来源: 新浪财经
        """
        try:
            logger.info(f"Fetching A-share financial abstract for {stock_code}")
            df = ak.stock_financial_abstract(symbol=stock_code)
            if df is not None and not df.empty:
                logger.info(f"✅ Fetched {len(df)} rows of financial abstract for {stock_code}")
                return df
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch financial abstract for {stock_code}: {e}")
        return None

    def fetch_a_share_balance_sheet(self, stock_code: str) -> Optional[pd.DataFrame]:
        """
        获取A股资产负债表

        数据来源: 东方财富
        """
        try:
            logger.info(f"Fetching A-share balance sheet for {stock_code}")
            df = ak.stock_balance_sheet_by_report_em(symbol=stock_code)
            if df is not None and not df.empty:
                logger.info(f"✅ Fetched balance sheet for {stock_code}")
                return df
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch balance sheet for {stock_code}: {e}")
        return None

    def fetch_a_share_profit_sheet(self, stock_code: str) -> Optional[pd.DataFrame]:
        """
        获取A股利润表

        数据来源: 东方财富
        """
        try:
            logger.info(f"Fetching A-share profit sheet for {stock_code}")
            df = ak.stock_profit_sheet_by_report_em(symbol=stock_code)
            if df is not None and not df.empty:
                logger.info(f"✅ Fetched profit sheet for {stock_code}")
                return df
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch profit sheet for {stock_code}: {e}")
        return None

    def fetch_a_share_cash_flow(self, stock_code: str) -> Optional[pd.DataFrame]:
        """
        获取A股现金流量表

        数据来源: 东方财富
        """
        try:
            logger.info(f"Fetching A-share cash flow for {stock_code}")
            df = ak.stock_cash_flow_sheet_by_report_em(symbol=stock_code)
            if df is not None and not df.empty:
                logger.info(f"✅ Fetched cash flow for {stock_code}")
                return df
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch cash flow for {stock_code}: {e}")
        return None

    def fetch_a_share_indicators(self, stock_code: str) -> Optional[pd.DataFrame]:
        """
        获取A股财务分析指标

        包含: ROE、ROA、毛利率、净利率、周转率等
        数据来源: 东方财富
        """
        try:
            logger.info(f"Fetching A-share financial indicators for {stock_code}")
            df = ak.stock_financial_analysis_indicator_em(symbol=stock_code)
            if df is not None and not df.empty:
                logger.info(f"✅ Fetched financial indicators for {stock_code}")
                return df
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch financial indicators for {stock_code}: {e}")
        return None

    def fetch_hk_financial(self, stock_code: str) -> Optional[pd.DataFrame]:
        """
        获取港股财务数据

        数据来源: 东方财富
        """
        try:
            # 港股代码格式: 00700 -> 700
            code = stock_code.lstrip('0') if len(stock_code) == 5 else stock_code
            logger.info(f"Fetching HK financial data for {code}")
            df = ak.stock_hk_financial_indicator_em(symbol=code)
            if df is not None and not df.empty:
                logger.info(f"✅ Fetched HK financial data for {code}")
                return df
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch HK financial data for {stock_code}: {e}")
        return None

    def fetch_all_reports(self, stock_code: str, is_hk: bool = False) -> Dict[str, pd.DataFrame]:
        """
        获取所有财务报表

        Returns:
            Dict containing 'abstract', 'balance_sheet', 'profit_sheet', 'cash_flow', 'indicators'
        """
        reports = {}

        if is_hk:
            # 港股数据
            df = self.fetch_hk_financial(stock_code)
            if df is not None:
                reports['hk_financial'] = df
        else:
            # A股数据
            df = self.fetch_a_share_abstract(stock_code)
            if df is not None:
                reports['abstract'] = df

            # 暂时跳过其他报表，因为东方财富接口有时不稳定
            # df = self.fetch_a_share_balance_sheet(stock_code)
            # if df is not None:
            #     reports['balance_sheet'] = df

            # df = self.fetch_a_share_profit_sheet(stock_code)
            # if df is not None:
            #     reports['profit_sheet'] = df

            # df = self.fetch_a_share_cash_flow(stock_code)
            # if df is not None:
            #     reports['cash_flow'] = df

            df = self.fetch_a_share_indicators(stock_code)
            if df is not None:
                reports['indicators'] = df

        return reports

    def save_reports(self, stock_code: str, reports: Dict[str, pd.DataFrame], format: str = 'json'):
        """
        保存财务报表到文件

        Args:
            stock_code: 股票代码
            reports: 报表字典
            format: 保存格式 ('json', 'csv', 'txt')
        """
        if not reports:
            logger.warning(f"No reports to save for {stock_code}")
            return

        # 创建公司目录
        company_dir = self.output_dir / stock_code
        company_dir.mkdir(parents=True, exist_ok=True)

        for report_type, df in reports.items():
            if df is None or df.empty:
                continue

            timestamp = datetime.now().strftime('%Y%m%d')

            if format == 'json':
                output_file = company_dir / f"{report_type}_{timestamp}.json"
                # 处理NaN值
                df_clean = df.fillna('')
                df_clean.to_json(output_file, orient='records', force_ascii=False, indent=2)
            elif format == 'csv':
                output_file = company_dir / f"{report_type}_{timestamp}.csv"
                df.to_csv(output_file, index=False, encoding='utf-8-sig')
            elif format == 'txt':
                output_file = company_dir / f"{report_type}_{timestamp}.txt"
                df.to_string(output_file, index=False)

            logger.info(f"✅ Saved {report_type} to {output_file}")

    def fetch_and_save(self, stock_code: str, is_hk: bool = False, format: str = 'json') -> bool:
        """
        获取并保存财务报表

        Returns:
            True if successful, False otherwise
        """
        try:
            reports = self.fetch_all_reports(stock_code, is_hk)
            if reports:
                self.save_reports(stock_code, reports, format)
                return True
        except Exception as e:
            logger.error(f"❌ Failed to fetch and save reports for {stock_code}: {e}")
        return False


def extract_key_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """
    从财务摘要中提取关键指标

    Args:
        df: 财务摘要DataFrame

    Returns:
        关键指标字典
    """
    metrics = {}

    if df is None or df.empty:
        return metrics

    # 获取最近两年的数据
    try:
        # 查找关键指标行
        for _, row in df.iterrows():
            indicator = str(row.get('指标', '') or row.get('选项', ''))

            if '营业收入' in indicator:
                metrics['revenue'] = {
                    'latest': row.iloc[2] if len(row) > 2 else None,
                    'previous': row.iloc[3] if len(row) > 3 else None
                }
            elif '归母净利润' in indicator or '净利润' in indicator:
                metrics['net_profit'] = {
                    'latest': row.iloc[2] if len(row) > 2 else None,
                    'previous': row.iloc[3] if len(row) > 3 else None
                }
            elif '毛利率' in indicator:
                metrics['gross_margin'] = {
                    'latest': row.iloc[2] if len(row) > 2 else None,
                    'previous': row.iloc[3] if len(row) > 3 else None
                }
            elif 'ROE' in indicator or '净资产收益率' in indicator:
                metrics['roe'] = {
                    'latest': row.iloc[2] if len(row) > 2 else None,
                    'previous': row.iloc[3] if len(row) > 3 else None
                }
    except Exception as e:
        logger.warning(f"Failed to extract metrics: {e}")

    return metrics


def batch_fetch(stock_list: List[str], output_dir: Path, delay: float = 0.5):
    """
    批量获取财务报表

    Args:
        stock_list: 股票代码列表
        output_dir: 输出目录
        delay: 请求间隔(秒)
    """
    fetcher = FinancialReportFetcher(output_dir=output_dir)

    success_count = 0
    fail_count = 0

    for i, stock_code in enumerate(stock_list):
        logger.info(f"\n[{i+1}/{len(stock_list)}] Processing {stock_code}")

        # 判断是否港股 (5位数字)
        is_hk = len(stock_code) == 5 and stock_code.isdigit()

        if fetcher.fetch_and_save(stock_code, is_hk=is_hk):
            success_count += 1
        else:
            fail_count += 1

        # 延迟，避免请求过快
        if i < len(stock_list) - 1:
            time.sleep(delay)

    logger.info(f"\n{'='*50}")
    logger.info(f"Batch fetch completed: {success_count} success, {fail_count} failed")


def main():
    parser = argparse.ArgumentParser(description='财务报表数据获取工具')
    parser.add_argument('--stock', type=str, help='单个股票代码')
    parser.add_argument('--batch', type=str, help='股票代码列表文件')
    parser.add_argument('--output', type=str, default=str(OUTPUT_DIR), help='输出目录')
    parser.add_argument('--type', type=str, default='abstract',
                        choices=['abstract', 'balance', 'profit', 'cashflow', 'indicators', 'all'],
                        help='报表类型')
    parser.add_argument('--format', type=str, default='json', choices=['json', 'csv', 'txt'],
                        help='输出格式')
    parser.add_argument('--delay', type=float, default=0.5, help='批量请求间隔(秒)')

    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if args.stock:
        # 单个股票
        fetcher = FinancialReportFetcher(output_dir=output_dir)
        is_hk = len(args.stock) == 5 and args.stock.isdigit()
        fetcher.fetch_and_save(args.stock, is_hk=is_hk, format=args.format)

    elif args.batch:
        # 批量处理
        with open(args.batch, 'r', encoding='utf-8') as f:
            stock_list = [line.strip() for line in f if line.strip()]
        batch_fetch(stock_list, output_dir, delay=args.delay)

    else:
        # 测试模式：获取几个热门股票
        logger.info("No stock specified. Running test with popular stocks...")
        test_stocks = [
            ('600519', False),  # 贵州茅台
            ('000858', False),  # 五粮液
            ('601318', False),  # 中国平安
            ('00700', True),    # 腾讯控股 (港股)
        ]

        fetcher = FinancialReportFetcher(output_dir=output_dir)
        for stock_code, is_hk in test_stocks:
            logger.info(f"\nTesting with {stock_code}")
            fetcher.fetch_and_save(stock_code, is_hk=is_hk, format=args.format)
            time.sleep(args.delay)


if __name__ == '__main__':
    main()