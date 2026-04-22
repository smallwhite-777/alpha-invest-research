# 投研问答系统 - 项目概览文档

> 本文档旨在帮助新加入的专家快速了解项目全貌，包含架构、配置、部署、数据结构等所有关键信息。

---

## 一、项目概述

### 1.1 项目定位

这是一个**泛化投研问答系统**，旨在为投资研究提供智能问答、数据分析和研究报告生成能力。系统的核心特点：

- **多Agent架构**：意图识别 → 两阶段搜索 → Prompt构建 → LLM推理 → 结果格式化
- **本地知识库优先**：不依赖向量数据库，内存占用 < 2GB
- **32GB内存笔记本可运行**：无GPU需求
- **多数据源融合**：本地财报数据库 + 研究报告 + 新闻资讯 + 实时行情

### 1.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | Next.js | 16.1.6 |
| **前端语言** | TypeScript | 5.x |
| **UI组件** | React 19 + Tailwind CSS 4 | - |
| **图表库** | ECharts | 6.0.0 |
| **后端框架** | Flask | 3.0+ |
| **后端语言** | Python | 3.x |
| **数据库** | SQLite (Prisma ORM) | 7.4.2 |
| **本地财报数据** | Parquet 文件 | - |
| **LLM服务商** | MiniMax / DeepSeek / SiliconFlow / 智谱 | - |
| **金融数据API** | AKShare / yfinance | - |

---

## 二、项目目录结构

```
投研网站/
├── src/                          # Next.js 前端源码
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API 路由（11个子模块）
│   │   │   ├── analyze/          # 文件分析 API
│   │   │   ├── chat/             # 智能问答 API
│   │   │   ├── financial/        # 财务数据 API
│   │   │   ├── intelligence/     # 情报/研报 API
│   │   │   ├── macro/            # 宏观指标 API
│   │   │   ├── news/             # 新闻资讯 API
│   │   │   ├── research/         # 研究报告 API
│   │   │   ├── search/           # 知识库搜索 API
│   │   │   ├── stock/            # 股票数据 API
│   │   │   └── upload/           # 文件上传 API
│   │   ├── analyze/              # 文件分析页面
│   │   ├── intelligence/         # 情报管理页面
│   │   ├── macro/                # 宏观数据页面
│   │   ├── news/                 # 新闻资讯页面
│   │   ├── research/             # 研究报告页面
│   │   ├── stock/                # 股票详情页面
│   │   ├── page.tsx              # 主页仪表盘
│   │   ├── layout.tsx            # 根布局
│   │   └── globals.css           # 全局样式
│   ├── components/               # React 组件
│   │   ├── intelligence/         # 情报相关组件
│   │   ├── layout/               # 布局组件
│   │   ├── macro/                # 宏观数据组件
│   │   ├── stock/                # 股票相关组件
│   │   └── ui/                   # 基础UI组件
│   ├── lib/                      # 工具库
│   │   ├── ai/                   # AI服务封装
│   │   ├── db.ts                 # Prisma数据库连接
│   │   ├── parsers/              # 文件解析器
│   │   ├── constants.ts          # 常量定义
│   │   ├── format.ts             # 格式化工具
│   │   ├── chart-theme.ts        # 图表主题
│   │   └── time-context.ts       # 时间上下文
│   ├── hooks/                    # React Hooks
│   ├── types/                    # TypeScript 类型定义
│   └── generated/                # Prisma 生成的客户端
│
├── python-backend/               # Python Flask 后端
│   ├── app.py                    # Flask 主应用 (110KB)
│   ├── config.py                 # 配置文件（行业指标库）
│   ├── routes/                   # API 路由模块
│   │   ├── chat_routes.py        # 智能问答路由
│   │   ├── financial_routes.py   # 财务数据路由
│   │   ├── macro_routes.py       # 宏观指标路由
│   │   ├── market_routes.py      # 市场数据路由
│   │   └── stock_routes.py       # 股票数据路由
│   ├── workflow/                 # 多Agent工作流引擎
│   │   ├── engine.py             # 工作流引擎核心
│   │   ├── optimization_loop.py  # 优化循环
│   ├── knowledge_base/           # 知识库管理
│   │   ├── index_manager.py      # 知识库索引管理
│   │   ├── financial_table_parser.py  # 财报解析
│   ├── llm/                      # LLM 服务封装
│   ├── agents/                   # Agent 实现
│   ├── processing/               # 数据处理模块
│   ├── cache/                    # 缓存模块
│   ├── evaluation/               # 数据验证模块
│   ├── financial_adapter.py      # 本地财报数据库适配器 (42KB)
│   ├── services/                 # 业务服务
│   ├── utils/                    # 工具函数
│   ├── data/                     # 运行时数据
│   └── requirements.txt          # Python 依赖
│
├── prisma/                       # Prisma 数据库配置
│   ├── schema.prisma             # 数据模型定义
│   ├── seed.ts                   # 数据填充脚本
│   ├── migrations/               # 数据库迁移
│   └── dev.db                    # SQLite 数据库文件 (856KB)
│
├── docs/                         # 项目文档
│   ├── API_REFERENCE.md          # 本地财报数据库API参考
│   ├── DATABASE_GUIDE.md         # 数据库使用指南
│   ├── FIELD_REFERENCE.md        # 字段参考
│   ├── README_ashareLab.md       # A股实验室文档
│   ├── field_mapping.yaml        # 字段映射配置 (230KB)
│   ├── financial_indicators_dictionary.md  # 财务指标词典 (86KB)
│   └── db_config.yaml            # 数据库配置
│
├── Knowledgebase/                # 知识库目录（本地数据）
│   └── Financial Reports/        # 财务报告
│
├── News/                         # 新闻资讯数据
│   ├── articles/                 # 文章数据
│   ├── articles_zaican/          # 在线文章
│   ├── markdown/                 # Markdown 格式新闻
│   ├── pdf_markdown_cn/          # PDF转Markdown
│   ├── wsj_markdown/             # 华尔街日报内容
│   └── markdownhuatai/           # 华泰证券研报
│
├── Reserach Reports/             # 研究报告目录
│   ├── [公司名_股票代码]/        # 按公司组织
│   │   ├── deep_research_*.json  # 深度研究报告
│   │   ├── deep_research_prompt_*.json  # 研报Prompt
│   │   ├── analysis_whitepaper_review_*.json  # 分析评审
│   │   └── deep_research_completion_*.json  # 完成状态
│   ├── target_companies_list.txt # 目标公司列表
│   └── [数十家公司目录...]       # 覆盖A股主要公司
│
├── daily_quote_by_code_csv/      # 日行情数据
│
├── .env                          # 环境变量（已配置）
├── .env.example                  # 环境变量模板
├── .env.local                    # 本地环境变量
│
├── package.json                  # Node.js 依赖配置
├── next.config.ts                # Next.js 配置
├── tsconfig.json                 # TypeScript 配置
├── components.json               # Shadcn UI 配置
│
├── 启动网站.bat                  # Windows启动脚本
├── 清理缓存.bat                  # 缓存清理脚本
├── start-python-backend.bat      # Python后端启动
│
├── 泛化投研问答系统_完整工程方案.md  # 系统设计文档
├── AI_SETUP_GUIDE.md             # AI配置指南
├── 内存溢出解决指南.md            # 内存优化指南
├── 网站诊断与修复指南.md          # 故障排查指南
│
├── dev.db                        # SQLite 数据库副本
├── listed_company_code_map.xlsx  # 上市公司代码映射
│
└── interface.html                # 界面原型
```

---

## 三、核心模块详解

### 3.1 数据库模型 (Prisma Schema)

系统使用 SQLite + Prisma ORM，包含以下核心模型：

| 模型 | 说明 | 核心字段 |
|------|------|---------|
| **Intelligence** | 情报/研报记录 | title, content, summary, category, importance, authorName |
| **Tag** | 标签系统 | name, color |
| **IntelligenceTag** | 情报-标签关联 | 多对多关系 |
| **IntelligenceSector** | 情报-板块关联 | sectorCode, sectorName |
| **IntelligenceStock** | 情报-股票关联 | stockSymbol, stockName |
| **Attachment** | 文件附件 | fileName, fileUrl, fileType, fileSize |
| **Stock** | 股票基本信息 | symbol, name, market, sectorCode, sectorName, listDate |
| **FinancialData** | 财务数据 | revenue, grossMargin, netProfit, roe, roa, operatingCF... |
| **ValuationData** | 估值数据 | pe, pb, ps, marketCap, price |
| **WatchlistItem** | 监控列表 | userId, stockSymbol, note, sortOrder |
| **MacroIndicator** | 宏观指标 | code, name, category, country, unit, frequency |
| **MacroDataPoint** | 宏观数据点 | indicatorCode, date, value |

### 3.2 API 路由结构

**Next.js API 路由 (src/app/api/)**：
- `/api/analyze` - 文件上传与AI分析
- `/api/chat` - 智能问答（对接Python后端）
- `/api/financial` - 财务数据查询
- `/api/intelligence` - 情报管理 CRUD
- `/api/macro` - 宏观指标数据
- `/api/news` - 新闻资讯检索
- `/api/research` - 研究报告管理
- `/api/search` - 知识库搜索
- `/api/stock` - 股票数据查询
- `/api/upload` - 文件上传处理

**Python Flask 路由 (python-backend/routes/)**：
- `/api/macro/indicators` - 宏观指标列表
- `/api/macro/data/<code>` - 具体指标数据
- `/api/stock/<symbol>` - 股票详情
- `/api/stock/<symbol>/financial` - 财务数据
- `/api/market/sectors` - 板块行情
- `/api/chat` - 智能问答统一入口
- `/api/financial/radar` - 财务雷达图
- `/api/financial/dupont` - 杜邦分析
- `/api/financial/dcf_inputs` - DCF输入参数

### 3.3 多Agent工作流 (workflow/engine.py)

系统采用多Agent协作模式：

```
用户查询 → IntentAgent → SearchAgent → PromptAgent → LLMAgent → OutputAgent → 用户
    ↓           ↓             ↓            ↓           ↓            ↓
意图识别    文件级匹配    System Prompt   云端API    结构化输出    标注来源
实体提取    内容级抽取    User Prompt     联网补充    Markdown      引用列表
关键词      限流保护      格式约束        上下文      表格/图表     元数据
```

**意图类型分类**：
- `company_analysis` - 公司深度分析
- `industry_analysis` - 行业分析
- `comparison` - 对比分析
- `trend_prediction` - 趋势预测
- `financial_analysis` - 财务分析
- `valuation` - 估值分析
- `risk_assessment` - 风险评估
- `general_question` - 一般问题

---

## 四、配置详解

### 4.1 环境变量配置 (.env)

```bash
# ==================== AI 服务配置 ====================
# MiniMax (主要服务商)
MINIMAX_API_KEY=你的API密钥

# DeepSeek (备用)
DEEPSEEK_API_KEY=你的API密钥

# SiliconFlow (备用)
SILICONFLOW_API_KEY=你的API密钥

# 智谱 AI (备用)
ZHIPU_API_KEY=你的API密钥

# 默认AI服务商
DEFAULT_AI_PROVIDER=minimax
LLM_PROVIDER=minimax

# ==================== 后端服务配置 ====================
# Python Flask 后端地址
PYTHON_BACKEND_URL=http://localhost:5001
# 或使用环境变量覆盖
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:5001

# 是否使用Python工作流统一入口
USE_PYTHON_WORKFLOW=false

# ==================== 数据库配置 ====================
# SQLite 数据库路径 (Prisma)
DATABASE_URL=file:./prisma/dev.db

# ==================== 缓存配置 ====================
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600
SCHEDULER_ENABLED=true

# ==================== 知识库路径 ====================
KNOWLEDGE_BASE_PATH=./Knowledgebase
FINANCIAL_DB_PATH=./data/financial_db
INDEX_ENABLED=true
```

### 4.2 Python后端配置 (python-backend/config.py)

关键配置项：

```python
# 知识库目录（支持自定义路径）
KNOWLEDGE_BASE_DIR = Path("D:/投研web 3/投研网站 3/Knowledgebase")

# 搜索安全参数（防止内存溢出）
MAX_CANDIDATE_FILES = 15       # 最大候选文件数
MAX_READ_CHARS = 8000          # 每文件最大字符数
MAX_CONTENT_LENGTH = 40000     # 最大总上下文长度
SEARCH_TIMEOUT = 30            # 搜索超时(秒)

# Flask 服务配置
FLASK_CONFIG = {
    "host": "0.0.0.0",
    "port": 5003,  # 注意端口变化
    "debug": True
}

# LLM 服务商配置
LLM_PROVIDERS = {
    "minimax": {
        "base_url": "https://api.minimaxi.com/v1",
        "model": "MiniMax-M2.7",
        "supports_web_search": True
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat"
    }
}
```

### 4.3 行业指标库 (INDUSTRY_METRICS)

系统内置16大行业的核心指标：

| 行业 | 关键指标 | 领先指标 | 估值方法 |
|------|---------|---------|---------|
| 白酒 | 高端酒占比、批条率、动销率 | 批条价、终端动销 | PE、PEG、股息率 |
| 银行 | 净息差、不良率、拨备覆盖率 | 社融数据、贷款需求 | PB、股息率 |
| 半导体 | 产能利用率、国产化率 | 设备订单、产能释放 | PS、PEG |
| 光伏 | 组件价格、装机量 | 硅料价格、政策 | PE、PEG |
| 新能源车 | 渗透率、单车盈利 | 上险数据、订单量 | PS、EV/Sales |
| 医药 | 研发占比、管线进度 | 临床数据、审批进展 | PE、rNPV |
| 锂电 | 出货量、单Wh盈利 | 排产数据、锂价 | PE、PEG |
| 煤炭 | 吨煤成本、长协比例 | 港口煤价、电厂日耗 | PB、股息率 |
| 黄金 | 吨矿成本、储量 | 金价、美元指数 | PB、EV/储量 |
| 地产 | 销售额、净负债率 | 销售回款、政策 | PB、RNAV |
| 军工 | 订单金额、良品率 | 军费预算、型号定型 | PE、PEG |
| AI算力 | 算力规模、利用率 | GPU需求、资本开支 | PS、EV/Revenue |
| 消费 | 同店增长、复购率 | 社零数据、消费信心 | PE、DCF |
| 互联网 | DAU/MAU、ARPU | 用户增长、时长占比 | PE、PS |

---

## 五、部署指南

### 5.1 系统要求

| 项目 | 要求 |
|------|------|
| **操作系统** | Windows 11 / macOS / Linux |
| **内存** | 推荐 32GB（最低 8GB） |
| **Node.js** | v24.14.0 或更高 |
| **Python** | 3.8+ |
| **硬盘** | 至少 10GB（知识库数据） |

### 5.2 本地开发部署

#### 步骤1：安装依赖

```bash
# Node.js 前端依赖
npm install

# Python 后端依赖
cd python-backend
pip install -r requirements.txt
```

#### 步骤2：配置环境变量

```bash
# 复制模板文件
copy .env.example .env.local

# 编辑 .env.local，填入 API Key
```

#### 步骤3：初始化数据库

```bash
# Prisma 数据库初始化
npx prisma generate
npx prisma db push
npx prisma db seed  # 填充初始数据
```

#### 步骤4：启动服务

**方式A：使用启动脚本（Windows推荐）**
```batch
# 启动网站（自动设置内存限制）
双击 启动网站.bat

# 启动 Python 后端
双击 start-python-backend.bat
```

**方式B：命令行启动**
```bash
# 启动 Next.js 前端（端口3000）
npm run dev

# 或使用低内存模式
npm run dev:low-memory

# 启动 Python Flask 后端（端口5003）
cd python-backend
python app.py
```

#### 步骤5：访问应用

- **前端地址**：http://localhost:3000
- **Python API**：http://localhost:5003

### 5.3 生产部署

#### Vercel 部署（前端）

```bash
# 构建生产版本
npm run build

# 输出目录：.next/standalone
# 部署到 Vercel 或其他平台
```

#### Render/Railway 部署（Python后端）

后端已配置部署文件：
- `python-backend/Procfile`
- `python-backend/render.yaml`
- `python-backend/runtime.txt`

```bash
# 部署命令
gunicorn app:app
```

### 5.4 内存优化配置

如遇内存溢出问题，参考 `内存溢出解决指南.md`：

```batch
# 设置 Node.js 内存限制为 4GB
set NODE_OPTIONS=--max-old-space-size=4096

# 清理缓存
双击 清理缓存.bat

# 使用低内存启动
npm run dev:low-memory
npm run build:low-memory
```

**已应用的优化**：
- ✅ Webpack 并发数限制
- ✅ 文件系统缓存
- ✅ 禁用 Source Map
- ✅ Standalone 输出模式
- ✅ 图片优化禁用（静态部署）

---

## 六、数据源说明

### 6.1 本地财报数据库

**位置**：`python-backend/data/financial_db` 或 `docs/field_mapping.yaml`

**数据格式**：Parquet 文件

**核心表结构**：
| 表名 | 内容 | 字段代码前缀 |
|------|------|-------------|
| balance_sheet | 资产负债表 | A* |
| income_statement | 利润表 | B* |
| cash_flow | 现金流表 | C* |
| indicators_profitability | 盈利能力指标 | F0505* |
| indicators_solvency | 偿债能力指标 | F0112* |
| indicators_operation | 运营能力指标 | F0402* |
| indicators_growth | 成长能力指标 | F061* |

**使用方式**：
```python
from financial_adapter import get_adapter

db = get_adapter()
df = db.query('balance_sheet', stocks='000001')
```

### 6.2 研究报告数据

**位置**：`Reserach Reports/`

**组织方式**：按公司名称+股票代码创建子目录

**数据格式**：JSON文件
- `deep_research_raw_*.json` - 原始研报数据
- `deep_research_prompt_*.json` - 分析Prompt
- `deep_research_completion_*.json` - 完成状态
- `analysis_whitepaper_review_*.json` - 白皮书评审

### 6.3 新闻资讯数据

**位置**：`News/`

**子目录**：
- `markdown/` - Markdown格式新闻（约250+文件）
- `pdf_markdown_cn/` - PDF转换内容
- `wsj_markdown/` - 华尔街日报
- `markdownhuatai/` - 华泰证券研报
- `articles/` - 原始文章数据

### 6.4 行情数据

**位置**：`daily_quote_by_code_csv/`

**内容**：日行情CSV数据

---

## 七、前端页面说明

### 7.1 主要页面路由

| 路径 | 页面 | 功能 |
|------|------|------|
| `/` | 仪表盘主页 | 宏观指标、板块行情、最新情报概览 |
| `/analyze` | 文件分析页 | 上传PDF/Word/TXT，AI分析 |
| `/intelligence` | 情报管理 | 情报列表、详情、新建、编辑 |
| `/macro` | 宏观数据 | GDP、CPI、PMI等指标图表 |
| `/news` | 新闻资讯 | 新闻列表、分类浏览 |
| `/research` | 研究报告 | 研报列表、深度分析 |
| `/stock/[symbol]` | 股票详情 | 财务数据、估值、图表分析 |

### 7.2 组件结构

**布局组件** (`components/layout/`)：
- Header、Sidebar、Footer

**业务组件**：
- `components/intelligence/` - 情报卡片、列表、表单
- `components/stock/` - 股票卡片、财务图表
- `components/macro/` - 宏观指标图表

**UI基础组件** (`components/ui/`)：
- Button、Card、Input、Table、Dialog等

---

## 八、关键文件索引

### 8.1 必读文档

| 文件 | 说明 |
|------|------|
| `泛化投研问答系统_完整工程方案.md` | 系统架构设计文档 |
| `AI_SETUP_GUIDE.md` | AI服务配置指南 |
| `docs/API_REFERENCE.md` | 本地财报数据库API参考 |
| `docs/FIELD_REFERENCE.md` | 财务字段映射参考 |
| `docs/financial_indicators_dictionary.md` | 财务指标词典 |

### 8.2 核心代码文件

| 文件 | 说明 | 大小 |
|------|------|------|
| `python-backend/app.py` | Flask主应用 | 110KB |
| `python-backend/financial_adapter.py` | 财报数据适配器 | 42KB |
| `python-backend/config.py` | 配置与行业指标库 | 10KB |
| `python-backend/workflow/engine.py` | 工作流引擎 | 15KB |
| `src/app/page.tsx` | 主页仪表盘 | 20KB |
| `prisma/schema.prisma` | 数据模型定义 | 5KB |
| `prisma/seed.ts` | 数据填充脚本 | 32KB |

---

## 九、当前项目状态

### 9.1 已完成功能

- ✅ Next.js 16 前端框架搭建
- ✅ Flask Python 后端服务
- ✅ Prisma SQLite 数据库模型
- ✅ 多Agent工作流引擎
- ✅ 本地财报数据库适配器
- ✅ 知识库索引管理
- ✅ 智能问答API（支持多种LLM）
- ✅ 文件上传与AI分析
- ✅ 宏观指标数据展示
- ✅ 股票详情页
- ✅ 情报管理系统
- ✅ 研究报告数据存储
- ✅ ECharts图表可视化
- ✅ 深色/浅色主题切换
- ✅ 内存优化配置
- ✅ Windows启动脚本

### 9.2 知识库数据规模

- 研究报告目录：数十家A股公司
- 新闻资讯：250+ Markdown文件
- 本地财报数据库：覆盖A股全部上市公司
- 行业指标库：16大行业完整指标体系

### 9.3 待优化事项

- ⚠️ 部分API使用mock数据
- ⚠️ E2E测试覆盖率待提升
- ⚠️ 知识库实时更新机制
- ⚠️ 用户认证系统

---

## 十、快速上手指南

### 10.1 启动流程

```batch
# 1. 启动前端（Windows）
双击 启动网站.bat

# 2. 启动Python后端
双击 start-python-backend.bat

# 3. 访问
http://localhost:3000
```

### 10.2 常用操作

**测试智能问答**：
```
访问 http://localhost:3000
在首页输入框提问，如：
"分析一下宁德时代的财务状况"
``

**上传文件分析**：
```
访问 http://localhost:3000/analyze
拖拽PDF/Word文件，点击"开始AI分析"
``

**查看股票详情**：
```
访问 http://localhost:3000/stock/000001
查看平安银行的财务数据、估值信息
``

### 10.3 故障排查

| 问题 | 解决方案 |
|------|---------|
| 内存溢出 | 运行 `清理缓存.bat`，使用 `npm run dev:low-memory` |
| API 404错误 | 检查Python后端是否启动，确认端口配置 |
| AI分析失败 | 检查 `.env.local` 中的 API Key 配置 |
| 数据库错误 | 运行 `npx prisma db push` 重建数据库 |

---

## 十一、联系方式与协作

项目当前在 Windows 11 环境开发，可通过以下方式协作：

1. **代码同步**：Git 仓库（main分支）
2. **数据共享**：Knowledgebase、News、Research Reports 目录
3. **配置同步**：`.env.example` 作为模板，各自配置 `.env.local`

---

*文档生成时间：2026-03-31*
*项目路径：d:\投研web 3\投研网站 3\投研网站*