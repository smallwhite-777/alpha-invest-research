# OPENINVEST 交接总览

更新时间：2026-04-21

这是一份面向交接、快速上手和对外说明的总览文档。  
如果只看一份文档，先看这一份。

详细版本请继续参考：

- [系统架构说明书](./SYSTEM_ARCHITECTURE_2026-04-21.md)
- [修改日志](./CHANGELOG_2026-04-21.md)

## 1. 项目是什么

OPENINVEST 是一个投研研究终端，主要能力包括：

- 首页概览：宏观指标、时序相关性、研究聚合
- 宏观看板：中美宏观数据、趋势和相关性分析
- 个股看板：价格、估值、财务分析
- 新闻模块：热点新闻抓取与展示
- 情报模块：结构化情报录入、标签和检索
- 研究问答：面向投研场景的聊天 / 检索辅助

## 2. 当前真实架构

这个项目不是单体应用，而是四层结构：

1. 前端展示层  
   `Next.js 16 + React 19 + App Router`

2. Next API / BFF 层  
   位于 `src/app/api/**`，负责：
   - 代理 Python 后端
   - 直接查 Prisma
   - 做少量聚合和容错

3. Python 智能后端  
   位于 `python-backend/`，基于 Flask，负责：
   - 股票、宏观、新闻、财务 API
   - 研究问答 workflow
   - 本地知识库和财报数据接入
   - 调度器和缓存

4. 数据层  
   同时使用三类数据源：
   - Prisma / Turso 结构化数据
   - `macro-data/data` 本地宏观 CSV
   - 本地知识库 / 财报 / 行情文件

## 3. 关键目录

前端核心：

- `src/app/page.tsx`
- `src/app/macro/page.tsx`
- `src/app/stock/[symbol]/page.tsx`
- `src/app/news/page.tsx`
- `src/components/layout/TopBar.tsx`
- `src/lib/macro-local.ts`
- `src/lib/db.ts`

Next API：

- `src/app/api/macro/**`
- `src/app/api/stock/**`
- `src/app/api/news/hot/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/research/route.ts`
- `src/app/api/intelligence/**`

Python 后端：

- `python-backend/app.py`
- `python-backend/routes/stock_routes.py`
- `python-backend/routes/financial_routes.py`
- `python-backend/routes/macro_routes.py`
- `python-backend/routes/market_routes.py`
- `python-backend/routes/chat_routes.py`
- `python-backend/scheduler/tasks.py`

数据与模型：

- `prisma/schema.prisma`
- `macro-data/data/**`

## 4. 当前已经稳定下来的部分

### 4.1 前端外观

- 已恢复到用户更熟悉的旧前端风格
- 没有继续沿用之前那版大改动 UI

### 4.2 股票链路

- 股票价格不再使用随机 mock
- 搜索、价格、热门股、估值链路已经统一到正式实现
- 个股页价格展示和部分估值展示已修复

### 4.3 新闻链路

- 新闻抓取任务支持 fallback 调度器
- 新闻页与新闻接口已重新打通

### 4.4 宏观链路

- 首页和宏观看板已经切到新的本地 macro 数据层
- 时序相关性图已改成更合理的三组组合
- 时间对齐、频率标准化、缺口补齐、尖刺平滑都已接入
- `/api/macro/latest` 也统一走本地宏观数据层

### 4.5 生产构建

- 已避开 `next/font/google` 导致的生产构建失败问题
- 正式域名口径已按 `https://open1nvest.com` 处理

## 5. 当前仍需注意的真实问题

### 5.1 宏观“旧数据”不全是程序问题

这是当前最容易误判的点。

现状：

- 中国部分宏观指标的本地源文件本身只更新到 `2025-12-31`
- `US_PCECTPI_M` 本地源文件只到 `2025-10-31`

结论：

- 即使程序已经切源、清洗、补齐，也不会凭空让这些序列变新
- 如果要继续修，下一步是“补源”，不是继续改图表

### 5.2 数据库口径仍有混合状态

现状：

- `prisma/schema.prisma` 是 `sqlite` 口径
- `src/lib/db.ts` 实际通过 `@prisma/adapter-libsql` 连接 Turso

含义：

- 文档、seed、运行时可能不是完全同一口径
- 遇到“本地有数据但页面无数据”时，要优先检查实际连接的是哪一个库

### 5.3 项目里仍有历史乱码

现状：

- 部分历史文件和字符串仍存在中文编码问题
- 不影响主链路，但影响维护体验

## 6. 最近重要改动摘要

重点历史提交：

- `4c35622` Restore previous frontend experience
- `525d928` Use new local macro data in legacy frontend
- `6cdd19a` Harden client rendering for macro dashboards
- `b1b850f` Refine homepage macro correlation pairs
- `a6c6102` Fix homepage macro chart alignment by month
- `0424957` Normalize macro series by reporting frequency
- `540462a` Add macro gap filling and spike smoothing
- `6d90efb` Add macro quality metadata and local latest API
- `aa38435` Clarify macro chart normalization on pages
- `90ecf6d` Clarify macro date semantics on dashboard
- `cc31f48` Label stale macro sources on dashboard
- `46c5e64` Switch macro source selection to freshest local data

补充说明：

- `46c5e64` 已本地提交，但最近一次 `git push origin main` 因 GitHub TLS 握手失败未成功推送。

## 7. 本地启动方式

前端：

```powershell
npm install
npm run dev
```

如果当前环境没有 `cross-env`，不要优先使用 `dev:low-memory`。

Python 后端：

```powershell
cd python-backend
python app.py
```

常见本地端口：

- 前端：`http://localhost:3000`
- Python 后端：`http://localhost:5003`

## 8. 线上部署口径

正式域名：

- `https://open1nvest.com`

后端域名：

- `https://alpha-backend.open1nvest.com`

当前默认方式：

- GitHub `main` 推送
- Vercel 自动触发前端生产部署

## 9. 接手时建议先看什么

如果是前端问题，先看：

- `src/app/page.tsx`
- `src/app/macro/page.tsx`
- `src/app/stock/[symbol]/page.tsx`
- `src/components/layout/TopBar.tsx`

如果是宏观数据问题，先看：

- `src/lib/macro-local.ts`
- `src/app/api/macro/latest/route.ts`
- `src/app/api/macro/data/route.ts`
- `macro-data/data/**`

如果是股票后端问题，先看：

- `python-backend/routes/stock_routes.py`
- `python-backend/routes/financial_routes.py`

如果是线上部署或数据库问题，先看：

- `src/lib/db.ts`
- `.env`
- `.env.local`
- `vercel.json`

## 10. 最推荐的下一步

如果继续开发，优先顺序建议如下：

1. 补宏观源数据  
   先解决中国宏观和 `US_PCECTPI_M` 偏旧问题。

2. 统一数据库与环境变量口径  
   收敛 Turso / sqlite / 本地 seed 的混合状态。

3. 清理乱码与历史残留  
   单独做一轮编码和文案整治。

4. 再做 UI 精修  
   数据与链路稳定后再继续打磨展示层。

## 11. 一句话总结

当前项目已经从“页面和数据经常互相打架”的状态，收敛成了“前端旧风格保留、核心链路可用、宏观数据层重建完成，但源数据补齐仍是下一阶段关键任务”的状态。
