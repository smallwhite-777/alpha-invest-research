# A股上市公司财报数据库使用说明

> 本文档供其他项目的AI Agent调用参考

## 一、数据库概述

### 1.1 基本信息

| 项目 | 说明 |
|-----|------|
| 数据名称 | A股上市公司财务数据库 |
| 数据来源 | CSMAR (国泰安) |
| 时间范围 | 1990-2024 (年度), 1990-Q1 2025 (季度) |
| 公司覆盖 | 沪深北交易所全部A股上市公司 (~5,800家) |
| 数据格式 | Parquet (Snappy压缩) |
| 总数据量 | ~1.0 GB |

### 1.2 数据库路径

```
d:\A股上市公司财务数据合集（90-25年）(1)\a股_financial_db\
├── data\           # 数据文件
│   ├── annual\     # 年度数据
│   └── quarterly\  # 季度数据
├── config\         # 配置文件
├── src\            # Python代码
└── docs\           # 文档
```

## 二、快速开始

### 2.1 导入模块

```python
import sys
sys.path.append(r'd:\A股上市公司财务数据合集（90-25年）(1)\a股_financial_db')

from src.query import FinancialDB

# 初始化数据库
db = FinancialDB(r'd:\A股上市公司财务数据合集（90-25年）(1)\a股_financial_db\data')
```

### 2.2 基本查询

```python
# 查询单个公司资产负债表
df = db.query('balance_sheet', stocks='000001')

# 查询多个公司
df = db.query('balance_sheet', stocks=['000001', '600000', '000002'])

# 指定时间范围
df = db.query('balance_sheet', stocks='000001',
              start_date='2020-01-01', end_date='2023-12-31')

# 只查合并报表
df = db.query('balance_sheet', stocks='000001', report_type='consolidated')

# 查询季度数据
df = db.query('balance_sheet', frequency='quarterly', stocks='000001')
```

## 三、可用数据表

### 3.1 财务报表

| 表名 | 中文名称 | 字段数 | 说明 |
|-----|---------|-------|------|
| `balance_sheet` | 资产负债表 | 159 | 资产、负债、所有者权益 |
| `income_statement` | 利润表 | 83 | 收入、成本、利润 |
| `cash_flow_direct` | 现金流量表(直接法) | 77 | 经营/投资/筹资现金流 |
| `cash_flow_indirect` | 现金流量表(间接法) | 40 | 净利润调节为经营现金流 |

### 3.2 财务指标

| 表名 | 中文名称 | 字段数 | 主要指标 |
|-----|---------|-------|---------|
| `indicators_solvency` | 偿债能力 | 38 | 流动比率、资产负债率、利息保障倍数 |
| `indicators_profitability` | 盈利能力 | 79 | ROE、ROA、毛利率、净利率 |
| `indicators_operation` | 经营能力 | 78 | 周转率、营业周期 |
| `indicators_growth` | 发展能力 | 68 | 营收增长率、利润增长率 |
| `indicators_per_share` | 每股指标 | 99 | 每股收益、每股净资产 |
| `indicators_valuation` | 相对价值 | 39 | 市盈率、市净率、托宾Q |
| `indicators_cashflow` | 现金流分析 | 43 | 现金含量、自由现金流 |
| `indicators_risk` | 风险水平 | 14 | 财务杠杆、经营杠杆 |
| `indicators_dividend` | 股利分配 | 21 | 每股股利、股利分配率 |
| `indicators_structure` | 比率结构 | 46 | 资产结构、负债结构 |
| `indicators_disclosed` | 披露指标 | 21 | 年报摘要关键指标 |

### 3.3 辅助表

| 表名 | 中文名称 | 说明 |
|-----|---------|------|
| `company_master` | 公司主表 | 公司基础信息和行业分类 |

## 四、主键字段

所有表共享以下主键字段：

| 字段代码 | 字段名称 | 说明 | 示例 |
|---------|---------|------|------|
| `Stkcd` | 证券代码 | 6位股票代码 | "000001" |
| `Accper` | 统计截止日期 | YYYY-MM-DD格式 | "2023-12-31" |
| `Typrep` | 报表类型 | A=合并报表, B=母公司报表 | "A" |

## 五、常用字段速查

### 5.1 资产负债表 (balance_sheet)

| 字段代码 | 中文名称 |
|---------|---------|
| `A001101000` | 货币资金 |
| `A001111000` | 应收账款净额 |
| `A001123000` | 存货净额 |
| `A001100000` | 流动资产合计 |
| `A001212000` | 固定资产净额 |
| `A001218000` | 无形资产净额 |
| `A001000000` | 资产总计 |
| `A002101000` | 短期借款 |
| `A002108000` | 应付账款 |
| `A002100000` | 流动负债合计 |
| `A002201000` | 长期借款 |
| `A002000000` | 负债合计 |
| `A003101000` | 实收资本 |
| `A003000000` | 所有者权益合计 |

### 5.2 利润表 (income_statement)

| 字段代码 | 中文名称 |
|---------|---------|
| `B001101000` | 营业收入 |
| `B001201000` | 营业成本 |
| `B001209000` | 销售费用 |
| `B001210000` | 管理费用 |
| `B001211000` | 财务费用 |
| `B001300000` | 营业利润 |
| `B001000000` | 利润总额 |
| `B002000000` | 净利润 |
| `B002000101` | 归属母公司净利润 |
| `B003000000` | 基本每股收益 |

### 5.3 偿债能力指标 (indicators_solvency)

| 字段代码 | 中文名称 | 计算公式 |
|---------|---------|---------|
| `F010101A` | 流动比率 | 流动资产/流动负债 |
| `F010201A` | 速动比率 | (流动资产-存货)/流动负债 |
| `F011201A` | 资产负债率 | 负债/资产 |
| `F010701B` | 利息保障倍数 | EBIT/财务费用 |

### 5.4 盈利能力指标 (indicators_profitability)

| 字段代码 | 中文名称 | 计算公式 |
|---------|---------|---------|
| `F050502B` | ROE (B) | 净利润/平均股东权益 |
| `F050202B` | ROA (B) | 净利润/平均总资产 |
| `F053301B` | 营业毛利率 | (收入-成本)/收入 |
| `F051501B` | 营业净利率 | 净利润/营业收入 |

### 5.5 每股指标 (indicators_per_share)

| 字段代码 | 中文名称 |
|---------|---------|
| `F090101B` | 每股收益 |
| `F091001A` | 每股净资产 |
| `F091801B` | 每股经营现金流 |

## 六、API参考

### 6.1 FinancialDB类

#### 初始化

```python
FinancialDB(db_path: str)
```

#### query() 方法

```python
db.query(
    table: str,                    # 表名 (必需)
    frequency: str = 'annual',     # 'annual' 或 'quarterly'
    stocks: str | List[str] = None, # 股票代码
    start_date: str = None,        # 开始日期 'YYYY-MM-DD'
    end_date: str = None,          # 结束日期 'YYYY-MM-DD'
    report_type: str = None,       # 'consolidated' 或 'parent'
    columns: List[str] = None      # 指定返回列
) -> pd.DataFrame
```

#### 其他方法

```python
# 获取公司列表
db.get_company_list() -> pd.DataFrame

# 获取公司信息
db.get_company_info(stock_code: str) -> dict

# 获取表信息
db.get_table_info(table_name: str, frequency: str) -> dict

# 搜索字段
db.search_fields(keyword: str) -> List[dict]

# 获取数据库概览
db.get_table_overview(frequency: str) -> pd.DataFrame
```

## 七、使用示例

### 示例1: 获取公司历年ROE

```python
from src.query import FinancialDB

db = FinancialDB('./data')

roe = db.query(
    'indicators_profitability',
    stocks='000001',
    columns=['Stkcd', 'Accper', 'F050502B'],
    start_date='2015-01-01'
)
print(roe)
```

### 示例2: 比较同行业公司

```python
# 获取银行业公司
companies = db.get_company_list()
banks = companies[companies['Indnme'].str.contains('银行', na=False)]

# 查询资产负债率
debt_ratio = db.query(
    'indicators_solvency',
    stocks=banks['Stkcd'].tolist()[:10],
    start_date='2022-01-01',
    columns=['Stkcd', 'Accper', 'F011201A']
)
print(debt_ratio)
```

### 示例3: 筛选低估值股票

```python
# 查询市盈率
pe = db.query(
    'indicators_valuation',
    start_date='2023-01-01',
    report_type='consolidated',
    columns=['Stkcd', 'Accper', 'F100101B']  # 市盈率
)

# 筛选市盈率小于20的公司
low_pe = pe[(pe['F100101B'] > 0) & (pe['F100101B'] < 20)]
print(f"低估值公司数量: {len(low_pe)}")
```

### 示例4: 计算季度收入增长

```python
# 查询季度收入
revenue = db.query(
    'income_statement',
    frequency='quarterly',
    stocks='000001',
    columns=['Stkcd', 'Accper', 'B001101000']
)

# 计算同比增长率
revenue = revenue.sort_values('Accper')
revenue['YoY_growth'] = revenue['B001101000'].pct_change(4)  # 4个季度 = 1年
print(revenue[['Accper', 'B001101000', 'YoY_growth']].tail(8))
```

## 八、注意事项

1. **数据类型**: 财务金额单位为人民币元，比例指标为小数或百分比
2. **缺失值**: NULL表示数据缺失，NaN在pandas中表示空值
3. **会计准则**: 2007年前后会计准则有变化，跨年分析需注意
4. **行业分类**: 2023年5月后使用中上协分类 (Indcd1)，之前用证监会分类 (Indcd)
5. **报表类型**: 默认使用合并报表 (Typrep='A')，母公司报表为 'B'

## 九、文件清单

```
a股_financial_db/
├── README.md                    # 项目说明
├── data_quality_report.md       # 数据质量报告
├── config/
│   ├── db_config.yaml          # 数据库配置
│   └── field_mapping.yaml      # 字段映射 (869字段)
├── data/
│   ├── annual/                 # 年度数据 (76,262条)
│   │   ├── _metadata.json      # 元数据
│   │   ├── balance_sheet.parquet
│   │   ├── income_statement.parquet
│   │   ├── cash_flow_direct.parquet
│   │   ├── cash_flow_indirect.parquet
│   │   ├── indicators_*.parquet (11个指标表)
│   │   └── company_master.parquet
│   └── quarterly/               # 季度数据 (356,728条)
│       └── ... (结构同年报)
├── docs/
│   ├── DATABASE_GUIDE.md       # 数据库指南
│   ├── FIELD_REFERENCE.md      # 字段参考
│   └── API_REFERENCE.md        # API参考
└── src/
    ├── __init__.py
    ├── preprocess.py            # 数据清洗脚本
    ├── loader.py                # 数据加载器
    └── query.py                 # 查询API
```

## 十、联系方式

- 数据来源: CSMAR (国泰安)
- 数据更新: 季度更新
- 文档版本: v1.0.0
- 更新日期: 2026-03-29