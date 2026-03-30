"""
Macro Data Service
Fetches real-time macro economic indicators from AKShare

Supported indicators:
- GDP: 中国GDP增速
- PMI: 制造业PMI
- CPI: 消费者物价指数
- PPI: 生产者物价指数
- M2: 广义货币供应量
- Industrial Production: 工业增加值
- Fixed Asset Investment: 固定资产投资
- Social Financing: 社会融资规模
- Interest Rates: SHIBOR、LPR
- Commodity Prices: 原油、铜、黄金等
"""

import akshare as ak
import pandas as pd
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class MacroDataService:
    """宏观经济数据服务"""

    # 指标代码映射到AKShare函数
    INDICATOR_MAPPING = {
        # 经济增长类
        'cn_gdp_yoy': {
            'name': 'GDP同比增速',
            'category': 'ECONOMIC',
            'unit': '%',
            'frequency': 'QUARTERLY',
            'fetch_func': 'macro_china_gdp',
            'value_col': '国内生产总值-同比增长',
        },
        'cn_gdp_abs': {
            'name': 'GDP现价',
            'category': 'ECONOMIC',
            'unit': '亿元',
            'frequency': 'QUARTERLY',
            'fetch_func': 'macro_china_gdp',
            'value_col': '国内生产总值-绝对值',
        },
        'cn_pmi': {
            'name': '制造业PMI',
            'category': 'ECONOMIC',
            'unit': '点',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_pmi_yearly',
            'value_col': '制造业-指数',
        },
        'cn_pmi_non_manufacturing': {
            'name': '非制造业PMI',
            'category': 'ECONOMIC',
            'unit': '点',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_pmi_yearly',
            'value_col': '非制造业-指数',
        },
        'cn_industrial_va': {
            'name': '工业增加值同比',
            'category': 'ECONOMIC',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_gyzjz',
            'value_col': '工业增加值',
        },
        'cn_fai': {
            'name': '固定资产投资增速',
            'category': 'ECONOMIC',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_gdtzc',
            'value_col': '固定资产投资完成额-累计增长',
        },
        'cn_retail': {
            'name': '社会消费品零售总额同比',
            'category': 'ECONOMIC',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_czsr',
            'value_col': '社会消费品零售总额-同比增长',
        },

        # 物价类
        'cn_cpi': {
            'name': 'CPI同比',
            'category': 'PRICE',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_cpi_yearly',
            'value_col': '全国同比',
        },
        'cn_cpi_monthly': {
            'name': 'CPI月度环比',
            'category': 'PRICE',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_cpi_monthly',
            'value_col': '全国环比',
        },
        'cn_ppi': {
            'name': 'PPI同比',
            'category': 'PRICE',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_ppi_yearly',
            'value_col': '当月同比',
        },

        # 货币金融类
        'cn_m2': {
            'name': 'M2增速',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_m2_yearly',
            'value_col': '货币和准货币(广义货币M2)',
        },
        'cn_m1': {
            'name': 'M1增速',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_m2_yearly',
            'value_col': '货币(狭义货币M1)',
        },
        'cn_m0': {
            'name': 'M0增速',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_m2_yearly',
            'value_col': '流通中现金(M0)',
        },
        'cn_social_financing': {
            'name': '社融存量增速',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_shrzgm',
            'value_col': '社会融资规模增量',
        },
        'shibor_overnight': {
            'name': 'SHIBOR隔夜',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'DAILY',
            'fetch_func': 'macro_china_shibor_all',
            'value_col': '隔夜',
        },
        'shibor_1w': {
            'name': 'SHIBOR 1周',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'DAILY',
            'fetch_func': 'macro_china_shibor_all',
            'value_col': '1周',
        },
        'shibor_3m': {
            'name': 'SHIBOR 3个月',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'DAILY',
            'fetch_func': 'macro_china_shibor_all',
            'value_col': '3个月',
        },
        'lpr_1y': {
            'name': 'LPR 1年期',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_lpr',
            'value_col': 'LPR1Y',
        },
        'lpr_5y': {
            'name': 'LPR 5年期',
            'category': 'MONETARY',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china_lpr',
            'value_col': 'LPR5Y',
        },

        # 对外贸易类
        'cn_export': {
            'name': '出口同比',
            'category': 'TRADE',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china进出口金额',
            'value_col': '出口同比',
        },
        'cn_import': {
            'name': '进口同比',
            'category': 'TRADE',
            'unit': '%',
            'frequency': 'MONTHLY',
            'fetch_func': 'macro_china进出口金额',
            'value_col': '进口同比',
        },

        # 大宗商品类 (需要单独处理)
        'brent_oil': {
            'name': '布伦特原油',
            'category': 'COMMODITY',
            'unit': '美元/桶',
            'frequency': 'DAILY',
            'fetch_func': 'energy_oil_hist',
            'value_col': 'close',
        },
        'lme_copper': {
            'name': 'LME铜',
            'category': 'COMMODITY',
            'unit': '美元/吨',
            'frequency': 'DAILY',
            'fetch_func': 'futures_main_sina',
            'value_col': 'close',
        },
        'gold_price': {
            'name': '黄金价格',
            'category': 'COMMODITY',
            'unit': '美元/盎司',
            'frequency': 'DAILY',
            'fetch_func': 'fx_spot_quote',
            'value_col': '最新价',
        },
    }

    def __init__(self):
        self.cache: Dict[str, pd.DataFrame] = {}

    def fetch_indicator(self, code: str, start_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        获取单个指标的历史数据

        Args:
            code: 指标代码
            start_date: 起始日期 (YYYY-MM-DD)

        Returns:
            List of {date, value} dicts
        """
        if code not in self.INDICATOR_MAPPING:
            logger.warning(f"Unknown indicator code: {code}")
            return []

        config = self.INDICATOR_MAPPING[code]
        fetch_func = config['fetch_func']
        value_col = config['value_col']

        try:
            # 调用对应的AKShare函数
            df = self._call_akshare(fetch_func, start_date)

            if df is None or df.empty:
                logger.warning(f"No data returned for {code}")
                return []

            # 提取日期和值
            data = self._extract_values(df, value_col)

            return data

        except Exception as e:
            logger.error(f"Error fetching {code}: {e}")
            return []

    def _call_akshare(self, func_name: str, start_date: Optional[str] = None) -> Optional[pd.DataFrame]:
        """调用AKShare函数获取数据"""
        try:
            # 特殊处理某些函数
            if func_name == 'macro_china_gdp':
                df = ak.macro_china_gdp()
            elif func_name == 'macro_china_pmi_yearly':
                df = ak.macro_china_pmi_yearly()
            elif func_name == 'macro_china_cpi_yearly':
                df = ak.macro_china_cpi_yearly()
            elif func_name == 'macro_china_cpi_monthly':
                df = ak.macro_china_cpi_monthly()
            elif func_name == 'macro_china_ppi_yearly':
                df = ak.macro_china_ppi_yearly()
            elif func_name == 'macro_china_m2_yearly':
                df = ak.macro_china_m2_yearly()
            elif func_name == 'macro_china_gyzjz':
                df = ak.macro_china_gyzjz()
            elif func_name == 'macro_china_gdtzc':
                df = ak.macro_china_gdtzc()
            elif func_name == 'macro_china_czsr':
                df = ak.macro_china_czsr()
            elif func_name == 'macro_china_shrzgm':
                df = ak.macro_china_shrzgm()
            elif func_name == 'macro_china_shibor_all':
                df = ak.macro_china_shibor_all()
            elif func_name == 'macro_china_lpr':
                df = ak.macro_china_lpr()
            elif func_name == 'macro_china进出口金额':
                df = ak.macro_china_hs_price_sina()
            elif func_name == 'energy_oil_hist':
                df = ak.energy_oil_hist(symbol="布伦特原油")
            elif func_name == 'futures_main_sina':
                df = ak.futures_main_sina(symbol="CU0")  # 铜主力合约
            elif func_name == 'fx_spot_quote':
                df = ak.fx_spot_quote(symbol="XAUUSD")
            else:
                logger.warning(f"Unknown AKShare function: {func_name}")
                return None

            return df

        except Exception as e:
            logger.error(f"Error calling {func_name}: {e}")
            return None

    def _extract_values(self, df: pd.DataFrame, value_col: str) -> List[Dict[str, Any]]:
        """从DataFrame提取日期和值"""
        results = []

        # 尝试找到日期列
        date_col = None
        for col in ['日期', '月份', '季度', 'date', 'time']:
            if col in df.columns:
                date_col = col
                break

        if date_col is None:
            # 尝试用第二列作为日期（AKShare新格式：列0=类型，列1=日期，列2=值）
            if len(df.columns) >= 2:
                date_col = df.columns[1]
            else:
                date_col = df.columns[0]

        # 尝试找到值列
        actual_value_col = None
        if value_col in df.columns:
            actual_value_col = value_col
        else:
            # 尝试模糊匹配
            for col in df.columns:
                if value_col in col or col in value_col:
                    actual_value_col = col
                    break

        # 如果还没找到，尝试用第三列（AKShare新格式）
        if actual_value_col is None:
            if len(df.columns) >= 3:
                actual_value_col = df.columns[2]
                logger.info(f"Using column index 2 for values: {actual_value_col}")
            else:
                logger.warning(f"Value column {value_col} not found, available: {df.columns.tolist()}")
                return []

        # 提取数据
        for _, row in df.iterrows():
            try:
                date_val = str(row[date_col])
                # 处理季度数据 (如 2023Q1)
                if 'Q' in date_val:
                    date_val = self._quarter_to_date(date_val)

                value = row[actual_value_col]
                if pd.notna(value):
                    results.append({
                        'date': date_val,
                        'value': float(value)
                    })
            except Exception as e:
                logger.debug(f"Error parsing row: {e}")
                continue

        # 按日期排序
        results.sort(key=lambda x: x['date'])

        return results

    def _quarter_to_date(self, quarter_str: str) -> str:
        """将季度字符串转换为日期 (2023Q1 -> 2023-03-31)"""
        try:
            year = int(quarter_str[:4])
            q = int(quarter_str[-1])
            month = q * 3
            day = 30 if month in [6, 9] else 31
            return f"{year}-{month:02d}-{day:02d}"
        except:
            return quarter_str

    def fetch_all_indicators(self) -> Dict[str, List[Dict]]:
        """获取所有指标数据"""
        results = {}
        for code in self.INDICATOR_MAPPING.keys():
            data = self.fetch_indicator(code)
            if data:
                results[code] = data
        return results

    def get_indicator_info(self, code: str) -> Optional[Dict]:
        """获取指标元信息"""
        if code not in self.INDICATOR_MAPPING:
            return None

        config = self.INDICATOR_MAPPING[code]
        return {
            'code': code,
            'name': config['name'],
            'category': config['category'],
            'unit': config['unit'],
            'frequency': config['frequency'],
            'country': 'CN' if code.startswith('cn') else 'GLOBAL',
        }

    def list_indicators(self, category: Optional[str] = None) -> List[Dict]:
        """列出所有指标"""
        indicators = []
        for code in self.INDICATOR_MAPPING.keys():
            info = self.get_indicator_info(code)
            if info:
                if category is None or info['category'] == category:
                    indicators.append(info)
        return indicators


# 单例实例
_macro_service = None


def get_macro_service() -> MacroDataService:
    """获取宏观经济数据服务实例"""
    global _macro_service
    if _macro_service is None:
        _macro_service = MacroDataService()
    return _macro_service