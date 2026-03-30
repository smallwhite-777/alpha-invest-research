# API参考文档

## 安装

```bash
# 将 a股_financial_db 目录添加到 Python 路径
import sys
sys.path.append('/path/to/a股_financial_db')
```

## 快速开始

```python
from src.query import FinancialDB

# 初始化数据库连接
db = FinancialDB('./data')

# 查看可用表
print(db.tables)
```

## FinancialDB 类

### 初始化

```python
FinancialDB(db_path: str = './data')
```

**参数:**
- `db_path`: 数据库路径，默认为 './data'

### 方法

#### query()

查询财务数据

```python
db.query(
    table: str,
    frequency: str = 'annual',          # 'annual' 或 'quarterly'
    stocks: Union[str, List[str]] = None, # 股票代码
    start_date: str = None,              # 开始日期 'YYYY-MM-DD'
    end_date: str = None,                # 结束日期 'YYYY-MM-DD'
    report_type: str = None,             # 'consolidated' 或 'parent'
    columns: List[str] = None            # 指定返回列
) -> pd.DataFrame
```

**示例:**

```python
# 查询单个公司的资产负债表
df = db.query('balance_sheet', stocks='000001')

# 查询多个公司
df = db.query('balance_sheet', stocks=['000001', '600000', '000002'])

# 指定时间范围
df = db.query(
    'income_statement',
    stocks='000001',
    start_date='2020-01-01',
    end_date='2023-12-31'
)

# 只查询合并报表
df = db.query('balance_sheet', stocks='000001', report_type='consolidated')

# 查询季度数据
df = db.query('balance_sheet', frequency='quarterly', stocks='000001')

# 指定返回列
df = db.query(
    'balance_sheet',
    stocks='000001',
    columns=['Stkcd', 'Accper', 'A001101000', 'A001000000']  # 货币资金、资产总计
)
```

#### get_company_list()

获取所有上市公司列表

```python
db.get_company_list(frequency: str = 'annual') -> pd.DataFrame
```

**返回:** 包含股票代码、简称、行业分类的DataFrame

**示例:**

```python
companies = db.get_company_list()
print(f"公司总数: {len(companies)}")
print(companies.head())
```

#### get_company_info()

获取单个公司基本信息

```python
db.get_company_info(stock_code: str) -> dict
```

**示例:**

```python
info = db.get_company_info('000001')
print(info)
# {'Stkcd': '000001', 'ShortName': '平安银行', 'Indcd': 'J66', ...}
```

#### get_table_info()

获取表的详细信息

```python
db.get_table_info(table_name: str, frequency: str = 'annual') -> dict
```

**返回:** 包含行数、列数、列名的字典

**示例:**

```python
info = db.get_table_info('balance_sheet')
print(f"行数: {info['row_count']}")
print(f"列数: {info['column_count']}")
```

#### search_fields()

搜索字段

```python
db.search_fields(keyword: str) -> List[dict]
```

**示例:**

```python
# 搜索包含"利润"的字段
fields = db.search_fields('利润')
for f in fields:
    print(f"{f['original']}: {f['chinese']}")
```

#### get_table_overview()

获取数据库概览

```python
db.get_table_overview(frequency: str = 'annual') -> pd.DataFrame
```

**示例:**

```python
overview = db.get_table_overview()
print(overview)
```

## 快速查询函数

### quick_query()

无需初始化的快速查询

```python
from src.query import quick_query

df = quick_query('balance_sheet', stocks='000001')
```

## ParquetLoader 类

底层的数据加载器，提供更精细的控制。

```python
from src.loader import ParquetLoader

loader = ParquetLoader('./data')

# 直接加载整个表
df = loader.load_table('balance_sheet')

# 加载指定列
df = loader.load_table('balance_sheet', columns=['Stkcd', 'Accper', 'A001101000'])

# 使用PyArrow过滤器
import pyarrow.compute as pc
df = loader.load_table(
    'balance_sheet',
    filters=[('Stkcd', 'in', ['000001', '600000'])]
)
```

## 数据处理示例

### 示例1: 计算公司历年ROE

```python
from src.query import FinancialDB

db = FinancialDB('./data')

# 查询盈利能力指标
roe = db.query(
    'indicators_profitability',
    stocks='000001',
    columns=['Stkcd', 'Accper', 'F050501B']  # F050501B = ROE B
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

### 示例3: 季度收入增长分析

```python
# 查询季度收入
revenue = db.query(
    'income_statement',
    frequency='quarterly',
    stocks='000001',
    columns=['Stkcd', 'Accper', 'B001101000']
)

# 计算同比增长
revenue['year'] = revenue['Accper'].str[:4]
revenue['quarter'] = revenue['Accper'].str[5:7]
print(revenue)
```

## 错误处理

```python
from src.query import FinancialDB

db = FinancialDB('./data')

try:
    df = db.query('nonexistent_table')
except FileNotFoundError as e:
    print(f"表不存在: {e}")
```