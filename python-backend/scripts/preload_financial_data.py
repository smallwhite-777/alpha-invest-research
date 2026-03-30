"""
预加载热门股票财务数据到数据库
从AKShare获取财务数据，存入SQLite数据库
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

import akshare as ak
import sqlite3
import json
from datetime import datetime
from typing import Optional, Dict, List
import time

# 热门股票名单 - A股市值前列 + 常用股票
HOT_STOCKS = [
    # 白酒
    {"code": "600519", "name": "贵州茅台", "industry": "白酒"},
    {"code": "000858", "name": "五粮液", "industry": "白酒"},
    {"code": "000568", "name": "泸州老窖", "industry": "白酒"},
    {"code": "002304", "name": "洋河股份", "industry": "白酒"},
    {"code": "000799", "name": "酒鬼酒", "industry": "白酒"},
    {"code": "600809", "name": "山西汾酒", "industry": "白酒"},

    # 银行
    {"code": "601398", "name": "工商银行", "industry": "银行"},
    {"code": "601288", "name": "农业银行", "industry": "银行"},
    {"code": "601939", "name": "建设银行", "industry": "银行"},
    {"code": "601988", "name": "中国银行", "industry": "银行"},
    {"code": "600036", "name": "招商银行", "industry": "银行"},
    {"code": "601166", "name": "兴业银行", "industry": "银行"},
    {"code": "600000", "name": "浦发银行", "industry": "银行"},
    {"code": "601818", "name": "光大银行", "industry": "银行"},
    {"code": "600016", "name": "民生银行", "industry": "银行"},
    {"code": "000001", "name": "平安银行", "industry": "银行"},

    # 保险
    {"code": "601318", "name": "中国平安", "industry": "保险"},
    {"code": "601601", "name": "中国太保", "industry": "保险"},
    {"code": "601628", "name": "中国人寿", "industry": "保险"},
    {"code": "601336", "name": "新华保险", "industry": "保险"},

    # 新能源
    {"code": "300750", "name": "宁德时代", "industry": "新能源"},
    {"code": "002594", "name": "比亚迪", "industry": "新能源"},
    {"code": "600900", "name": "长江电力", "industry": "电力"},
    {"code": "601012", "name": "隆基绿能", "industry": "新能源"},
    {"code": "002460", "name": "赣锋锂业", "industry": "新能源"},
    {"code": "002475", "name": "立讯精密", "industry": "电子"},

    # 家电
    {"code": "000333", "name": "美的集团", "industry": "家电"},
    {"code": "000651", "name": "格力电器", "industry": "家电"},
    {"code": "600690", "name": "海尔智家", "industry": "家电"},

    # 医药
    {"code": "600276", "name": "恒瑞医药", "industry": "医药"},
    {"code": "000538", "name": "云南白药", "industry": "医药"},
    {"code": "600196", "name": "复星医药", "industry": "医药"},
    {"code": "002007", "name": "华兰生物", "industry": "医药"},
    {"code": "300760", "name": "迈瑞医疗", "industry": "医药"},
    {"code": "300122", "name": "智飞生物", "industry": "医药"},

    # 科技
    {"code": "002415", "name": "海康威视", "industry": "科技"},
    {"code": "000725", "name": "京东方A", "industry": "科技"},
    {"code": "002475", "name": "立讯精密", "industry": "科技"},
    {"code": "600588", "name": "用友网络", "industry": "科技"},

    # 食品饮料
    {"code": "000895", "name": "双汇发展", "industry": "食品"},
    {"code": "600887", "name": "伊利股份", "industry": "食品"},
    {"code": "000568", "name": "洋河股份", "industry": "食品"},

    # 化工
    {"code": "600309", "name": "万华化学", "industry": "化工"},
    {"code": "600426", "name": "华鲁恒升", "industry": "化工"},

    # 建材
    {"code": "600585", "name": "海螺水泥", "industry": "建材"},

    # 有色金属
    {"code": "601899", "name": "紫金矿业", "industry": "有色金属"},
    {"code": "600547", "name": "山东黄金", "industry": "黄金"},

    # 汽车
    {"code": "000625", "name": "长安汽车", "industry": "汽车"},
    {"code": "601238", "name": "广汽集团", "industry": "汽车"},
    {"code": "600104", "name": "上汽集团", "industry": "汽车"},

    # 证券
    {"code": "600030", "name": "中信证券", "industry": "证券"},
    {"code": "601211", "name": "国泰君安", "industry": "证券"},
    {"code": "600837", "name": "海通证券", "industry": "证券"},

    # 地产
    {"code": "000002", "name": "万科A", "industry": "地产"},
    {"code": "600048", "name": "保利发展", "industry": "地产"},

    # 机场港口
    {"code": "600009", "name": "上海机场", "industry": "机场"},
    {"code": "600018", "name": "上港集团", "industry": "港口"},

    # 其他蓝筹
    {"code": "601888", "name": "中国中免", "industry": "零售"},
    {"code": "600887", "name": "伊利股份", "industry": "食品"},
    {"code": "603259", "name": "药明康德", "industry": "医药"},
    {"code": "002352", "name": "顺丰控股", "industry": "物流"},

    # 热门中小市值
    {"code": "300059", "name": "东方财富", "industry": "证券"},
    {"code": "002714", "name": "牧原股份", "industry": "养殖"},
    {"code": "300015", "name": "爱尔眼科", "industry": "医药"},
    {"code": "002230", "name": "科大讯飞", "industry": "科技"},
    {"code": "300033", "name": "同花顺", "industry": "科技"},

    # 科创板热门
    {"code": "688981", "name": "中芯国际", "industry": "半导体"},
    {"code": "688599", "name": "天合光能", "industry": "新能源"},
]


class FinancialDataPreloader:
    def __init__(self, db_path: str = None):
        if db_path is None:
            # 使用绝对路径
            self.db_path = str(Path(__file__).parent.parent.parent / "prisma" / "dev.db")
        else:
            self.db_path = db_path
        self.conn = None

    def connect(self):
        """连接数据库"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row

    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()

    def ensure_stock_exists(self, code: str, name: str, industry: str) -> bool:
        """确保股票记录存在"""
        cursor = self.conn.cursor()

        # 检查是否存在
        cursor.execute("SELECT id FROM Stock WHERE symbol = ?", (code,))
        if cursor.fetchone():
            return True

        # 插入新记录
        market = "SH" if code.startswith("6") else "SZ" if code.startswith("0") or code.startswith("3") else "BJ"
        cursor.execute("""
            INSERT INTO Stock (id, symbol, name, market, sectorCode, sectorName)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (f"stock_{code}", code, name, market, industry, industry))

        self.conn.commit()
        return True

    def fetch_financial_data(self, stock_code: str) -> Optional[List[Dict]]:
        """从AKShare获取财务数据"""
        try:
            # 获取财务摘要数据
            df = ak.stock_financial_abstract_ths(symbol=stock_code, indicator='按报告期')
            if df is None or df.empty:
                print(f"  [WARN] No financial data for {stock_code}")
                return None

            # 获取现金流量表数据
            try:
                df_cash = ak.stock_financial_cash_ths(symbol=stock_code, indicator='按报告期')
            except:
                df_cash = None

            # 解析数据
            def parse_value(val, default=None):
                if val is None or val == False or str(val) in ['False', 'nan', 'None', '']:
                    return default
                try:
                    val_str = str(val).replace(',', '').replace('%', '').replace('亿', '').replace('万', '')
                    return float(val_str) if val_str else default
                except:
                    return default

            # 筛选年报数据
            annual_rows = df[df['报告期'].astype(str).str.endswith('12-31')]

            # 构建现金流数据字典
            cash_flow_by_year = {}
            if df_cash is not None and not df_cash.empty:
                annual_cash = df_cash[df_cash['报告期'].astype(str).str.endswith('12-31')]
                for _, row in annual_cash.iterrows():
                    year = str(row['报告期'])[:4]
                    ocf = row.get('*经营活动产生的现金流量净额')
                    if ocf is not None:
                        try:
                            cash_flow_by_year[year] = float(str(ocf).replace(',', ''))
                        except:
                            pass

            financial_data = []
            for _, row in annual_rows.iterrows():
                year = str(row['报告期'])[:4]

                data = {
                    'period': f"{year}年报",
                    'periodDate': f"{year}-12-31",
                    'revenue': parse_value(row.get('营业总收入')),
                    'grossMargin': parse_value(row.get('销售毛利率')),
                    'netProfit': parse_value(row.get('净利润')),
                    'netMargin': parse_value(row.get('销售净利率')),
                    'roe': parse_value(row.get('净资产收益率')),
                    'assetTurnover': parse_value(row.get('存货周转率')),
                    'equityMultiplier': None,
                    'operatingCF': cash_flow_by_year.get(year),
                    'totalAssets': None,
                    'totalEquity': None,
                    'totalDebt': None,
                }

                # 计算权益乘数（从资产负债率）
                debt_ratio = parse_value(row.get('资产负债率'))
                if debt_ratio and debt_ratio > 0 and debt_ratio < 100:
                    data['equityMultiplier'] = 100 / (100 - debt_ratio)

                financial_data.append(data)

            return financial_data

        except Exception as e:
            print(f"  [ERROR] Failed to fetch financial data for {stock_code}: {str(e)[:100]}")
            return None

    def save_financial_data(self, stock_code: str, data_list: List[Dict]) -> int:
        """保存财务数据到数据库"""
        cursor = self.conn.cursor()
        saved_count = 0

        for data in data_list:
            try:
                # 检查是否已存在
                cursor.execute("""
                    SELECT id FROM FinancialData
                    WHERE stockSymbol = ? AND period = ?
                """, (stock_code, data['period']))

                if cursor.fetchone():
                    # 更新
                    cursor.execute("""
                        UPDATE FinancialData SET
                            periodDate = ?, revenue = ?, grossMargin = ?, netProfit = ?,
                            netMargin = ?, roe = ?, assetTurnover = ?, equityMultiplier = ?,
                            operatingCF = ?, totalAssets = ?, totalEquity = ?, totalDebt = ?
                        WHERE stockSymbol = ? AND period = ?
                    """, (
                        data['periodDate'], data['revenue'], data['grossMargin'], data['netProfit'],
                        data['netMargin'], data['roe'], data['assetTurnover'], data['equityMultiplier'],
                        data['operatingCF'], data['totalAssets'], data['totalEquity'], data['totalDebt'],
                        stock_code, data['period']
                    ))
                else:
                    # 插入
                    cursor.execute("""
                        INSERT INTO FinancialData (
                            id, stockSymbol, period, periodDate, revenue, grossMargin,
                            netProfit, netMargin, roe, assetTurnover, equityMultiplier,
                            operatingCF, totalAssets, totalEquity, totalDebt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        f"fin_{stock_code}_{data['periodDate']}",
                        stock_code, data['period'], data['periodDate'],
                        data['revenue'], data['grossMargin'], data['netProfit'],
                        data['netMargin'], data['roe'], data['assetTurnover'],
                        data['equityMultiplier'], data['operatingCF'],
                        data['totalAssets'], data['totalEquity'], data['totalDebt']
                    ))

                saved_count += 1

            except Exception as e:
                print(f"  [ERROR] Failed to save {data['period']}: {str(e)[:50]}")

        self.conn.commit()
        return saved_count

    def run(self):
        """执行预加载"""
        print("=" * 60)
        print("财务数据预加载脚本")
        print("=" * 60)
        print(f"目标股票数量: {len(HOT_STOCKS)}")
        print(f"数据库路径: {self.db_path}")
        print()

        self.connect()

        success_list = []
        failed_list = []

        for i, stock in enumerate(HOT_STOCKS):
            code = stock['code']
            name = stock['name']
            industry = stock['industry']

            print(f"[{i+1}/{len(HOT_STOCKS)}] {code} {name} ({industry})...", end=" ")

            try:
                # 确保股票记录存在
                self.ensure_stock_exists(code, name, industry)

                # 获取财务数据
                financial_data = self.fetch_financial_data(code)

                if financial_data:
                    saved = self.save_financial_data(code, financial_data)
                    print(f"OK {saved} records")
                    success_list.append({
                        'code': code,
                        'name': name,
                        'industry': industry,
                        'records': saved
                    })
                else:
                    print("NO DATA")
                    failed_list.append({'code': code, 'name': name, 'reason': '无数据'})

                # 避免请求过快
                time.sleep(0.5)

            except Exception as e:
                print(f"ERROR: {str(e)[:50]}")
                failed_list.append({'code': code, 'name': name, 'reason': str(e)[:50]})

        self.close()

        # 打印总结
        print()
        print("=" * 60)
        print("预加载完成")
        print("=" * 60)
        print(f"成功: {len(success_list)}")
        print(f"失败: {len(failed_list)}")
        print()

        if failed_list:
            print("失败列表:")
            for item in failed_list:
                print(f"  {item['code']} {item['name']}: {item['reason']}")
            print()

        return {
            'success': success_list,
            'failed': failed_list,
            'timestamp': datetime.now().isoformat()
        }


if __name__ == "__main__":
    preloader = FinancialDataPreloader()
    result = preloader.run()

    # 保存结果
    with open('preload_result.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"结果已保存到 preload_result.json")