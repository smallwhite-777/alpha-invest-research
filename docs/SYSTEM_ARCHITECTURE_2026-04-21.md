# OPENINVEST 系统架构说明书

更新时间：2026-04-21  
适用范围：当前本地仓库 `D:\投研web 3\投研网站 3\投研网站`

## 1. 项目目标

本项目是一个投研研究终端，围绕以下能力构建：

- 股票个股看板与估值分析
- 宏观数据看板、相关性分析与首页概览
- 新闻抓取与热点展示
- 情报录入、查询与标签化管理
- 研究问答 / 聊天式投研辅助
- 本地知识库、财报与宏观 CSV 数据接入

系统不是单体结构，而是“前端 + BFF/API 层 + Python 智能后端 + 本地数据/数据库”的混合架构。

## 2. 总体架构

### 2.1 分层

1. 前端展示层  
   基于 `Next.js 16 + React 19 + App Router`，负责页面渲染、组件交互、图表展示。

2. Next.js API / BFF 层  
   位于 `src/app/api/**`。承担三类职责：
   - 直接查 Prisma 数据
   - 代理 Python Flask 后端接口
   - 在 Node 层做少量聚合、格式化和容错

3. Python 智能后端  
   位于 `python-backend/`，基于 Flask，负责：
   - 股票、宏观、市场、新闻、财务等 API
   - 研究问答 workflow
   - 本地知识库检索
   - 定时刷新任务与缓存

4. 数据层  
   同时存在三类数据源：
   - Prisma / Turso 结构化数据
   - 本地宏观 CSV 数据
   - 本地知识库 / 财报 / 行情文件

### 2.2 主要调用链

- 页面 -> `src/app/api/**` -> Python 后端 或 Prisma
- 页面 -> `src/app/api/macro/**` -> 本地宏观数据层 `src/lib/macro-local.ts`
- 页面 -> `src/app/api/stock/**` -> Python 股票蓝图
- 页面 -> `src/app/api/intelligence/**` -> Prisma
- `/api/chat` / `/api/research` -> Python workflow / 检索 / 工具调用

## 3. 前端架构

### 3.1 技术栈

- `next@16.1.6`
- `react@19.2.3`
- `typescript@5`
- `echarts` + `echarts-for-react`
- `swr`
- `next-themes`

### 3.2 页面结构

主要页面目录：

- `src/app/page.tsx`：首页概览
- `src/app/macro/page.tsx`：宏观看板
- `src/app/stock/page.tsx`：股票列表 / 热门股
- `src/app/stock/[symbol]/page.tsx`：个股详情页
- `src/app/news/page.tsx`：新闻页
- `src/app/intelligence/**`：情报页
- `src/app/analyze/page.tsx`：分析页

### 3.3 布局与公共组件

- `src/app/layout.tsx`：应用外层布局、站点 metadata
- `src/components/layout/TopBar.tsx`：顶部导航、品牌、滚动行情
- `src/components/layout/Sidebar.tsx`：左侧导航
- `src/components/ui/ClientErrorBoundary.tsx`：客户端错误边界
- `src/app/error.tsx`：全局错误页

### 3.4 BFF / API 层

主要接口目录：

- `src/app/api/stock/**`
- `src/app/api/macro/**`
- `src/app/api/news/hot/route.ts`
- `src/app/api/research/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/intelligence/**`

说明：

- `stock` 相关多数转发 Python Flask
- `macro` 相关现在以本地 CSV 数据层为主
- `intelligence` 相关主要查 Prisma
- `chat` 是最复杂的一层，兼具代理、聚合和工具编排

## 4. Python 后端架构

### 4.1 主入口

- `python-backend/app.py`

职责：

- 初始化 Flask 与 CORS
- 注册蓝图
- 初始化知识库索引
- 启动调度器
- 暴露统一的问答、财务、宏观、股票等接口

### 4.2 蓝图模块

位于 `python-backend/routes/`：

- `macro_routes.py`：宏观接口
- `stock_routes.py`：股票搜索、价格、估值、热门股
- `market_routes.py`：市场接口与部分缓存接口
- `financial_routes.py`：DCF、PE Band 等财务分析接口
- `chat_routes.py`：聊天 / 研究辅助接口

### 4.3 智能工作流

重要目录：

- `python-backend/workflow/`
- `python-backend/agents/`
- `python-backend/processing/`
- `python-backend/evaluation/`

主要用途：

- 查询意图识别
- 检索、校验、格式化
- 多轮问答优化
- 输出纠偏

### 4.4 知识库与本地数据

重要目录：

- `python-backend/knowledge_base/`
- `python-backend/cache/`
- `python-backend/scheduler/`
- `python-backend/financial_adapter.py`

说明：

- 知识库支持财报、新闻、研报等本地文件检索
- 财务分析优先使用本地财报数据库适配器
- 新闻与部分数据刷新通过调度器执行

## 5. 数据层架构

### 5.1 Prisma / Turso

Prisma 定义在：

- `prisma/schema.prisma`

主要模型：

- `Intelligence`
- `Tag`
- `Attachment`
- `Stock`
- `FinancialData`
- `ValuationData`
- `WatchlistItem`
- `MacroIndicator`
- `MacroDataPoint`

当前 Next.js 运行时数据库接入在：

- `src/lib/db.ts`

现状说明：

- Next.js 侧默认通过 `@prisma/adapter-libsql` 连接 Turso
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` 缺失时会导致数据库能力失效
- `prisma/schema.prisma` 中 datasource 仍声明为 `sqlite`
- 因此项目存在“Prisma 模型是 sqlite 口径，但运行时是 libsql/Turso 适配”的混合状态

### 5.2 本地宏观数据

根目录：

- `macro-data/data`

主要文件：

- `us_china_joint_chronos.csv`
- `china_macro/china_macro_monthly_clean.csv`
- `china_macro/china_macro_daily.csv`
- `us_macro/us_macro_fred_monthly.csv`
- `us_macro/us_macro_fred_daily.csv`

当前接入逻辑：

- 统一由 `src/lib/macro-local.ts` 读取
- `/api/macro/indicators`
- `/api/macro/data`
- `/api/macro/correlation`
- `/api/macro/latest`

数据处理规则：

- 按频率归一到月末 / 季末 / 年末
- 单周期内部缺口允许线性补齐
- 孤立尖刺做有限平滑
- 质量评分、时效判断与异常提示
- 特例事件白名单支持保留真实冲击值

### 5.3 本地知识库与财报数据

Python 后端通过 `config.py` 指向的目录读取：

- 研报
- 新闻
- 财报
- 日行情 CSV

这部分主要服务于：

- 问答检索
- 年报精确搜索
- 财务适配器
- 股票价格 / 估值补充

## 6. 当前核心模块说明

### 6.1 首页概览

位置：

- `src/app/page.tsx`

包含：

- 宏观指标卡片
- 时序相关性图
- 情报摘要
- 其他首页聚合内容

说明：

- 视觉上保留较旧前端样式
- 宏观数据层已切换到新本地 macro 数据

### 6.2 宏观看板

位置：

- `src/app/macro/page.tsx`

包含：

- 中国 / 美国 / 流动性 / 通胀 / 利率 / 大宗等指标分组
- 相关性分析
- 双轴或趋势对比

当前特性：

- 显示“数据所属期”，不再误写为“更新时间”
- 支持源数据偏旧提示
- 图表说明已明确：相关性图的曲线可能做了归一化，仅用于趋势比较

### 6.3 个股模块

主要文件：

- `src/app/stock/page.tsx`
- `src/app/stock/[symbol]/page.tsx`
- `src/app/api/stock/**`
- `python-backend/routes/stock_routes.py`

当前能力：

- 股票搜索
- 热门股
- 历史价格
- 估值卡片
- 财务分析接口接入

### 6.4 新闻模块

主要文件：

- `src/app/news/page.tsx`
- `src/app/api/news/hot/route.ts`
- `python-backend/scheduler/tasks.py`

当前能力：

- 热门新闻展示
- 调度器刷新缓存
- 多来源抓取

### 6.5 情报模块

主要文件：

- `src/app/intelligence/**`
- `src/app/api/intelligence/**`

数据来源：

- Prisma / Turso

### 6.6 研究问答模块

主要接口：

- `src/app/api/chat/route.ts`
- `src/app/api/research/route.ts`
- `python-backend/app.py`
- `python-backend/chat_routes.py`

特点：

- Next 层有部分代理与编排
- Python 层负责 workflow 和检索

## 7. 已知配置与部署口径

### 7.1 站点域名

正式站点：

- `https://open1nvest.com`

后端域名：

- `https://alpha-backend.open1nvest.com`

### 7.2 本地开发

常见端口：

- Next.js：`3000`
- Python Flask：`5003`

### 7.3 生产部署

前端通常走：

- Vercel

说明：

- GitHub `main` 推送后会触发新部署
- 环境变量与正式域名需要在 Vercel 控制台同步配置

## 8. 当前系统风险与维护建议

### 8.1 数据库口径混合

风险：

- Prisma schema 是 sqlite 口径
- 运行时却通过 libsql / Turso

建议：

- 明确统一数据库口径
- 同步文档和 seed 流程

### 8.2 Python 与 Next API 双层维护成本高

风险：

- 同一能力若在两层都留有旧实现，容易发生路由重复和结果不一致

建议：

- 对外只保留一套正式入口
- 旧实现明确下线或迁移到内部路径

### 8.3 宏观源数据更新时间不一致

风险：

- 中国部分宏观指标本地源文件本身偏旧
- 某些美国序列更新频率也不一致

建议：

- 建立数据更新监控
- 区分“源文件偏旧”和“程序解析异常”
- 后续补充更近的本地源或自动下载链路

### 8.4 文案与编码历史包袱

风险：

- 代码中仍存在部分乱码字符串
- 历史上有多次局部重写和回滚

建议：

- 后续单独做一次编码与文案清理
- 不要在功能修复中夹带大规模 UI 重构

## 9. 建议的后续演进顺序

1. 先做宏观源数据补源  
   优先解决本地源文件偏旧问题。

2. 再做统一环境变量与部署口径  
   收敛 `FLASK_API_URL`、`PYTHON_BACKEND_URL`、站点 URL 等配置。

3. 然后做数据库口径统一  
   明确 Prisma/Turso/本地 sqlite 的唯一事实来源。

4. 最后再做 UI 精修  
   在数据与接口稳定之后再持续优化展示。

## 10. 关键文件索引

- `package.json`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/macro/page.tsx`
- `src/app/stock/[symbol]/page.tsx`
- `src/app/api/chat/route.ts`
- `src/app/api/macro/latest/route.ts`
- `src/lib/macro-local.ts`
- `src/lib/db.ts`
- `prisma/schema.prisma`
- `python-backend/app.py`
- `python-backend/routes/stock_routes.py`
- `python-backend/routes/financial_routes.py`
- `python-backend/routes/macro_routes.py`
- `python-backend/scheduler/tasks.py`
