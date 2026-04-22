# OPENINVEST 修改日志

更新时间：2026-04-21

本文档记录本轮排查、修复与架构整理过程中已经完成的关键修改，便于后续继续维护。

## 1. 本轮工作概览

本轮工作主要覆盖四个方向：

- 股票链路修复
- 新闻抓取与前端展示修复
- 域名 / 构建 / 生产环境修复
- 宏观数据链路重构与质量治理

## 2. 关键提交记录

最近关键提交：

- `46c5e64` Switch macro source selection to freshest local data
- `cc31f48` Label stale macro sources on dashboard
- `90ecf6d` Clarify macro date semantics on dashboard
- `aa38435` Clarify macro chart normalization on pages
- `6d90efb` Add macro quality metadata and local latest API
- `540462a` Add macro gap filling and spike smoothing
- `0424957` Normalize macro series by reporting frequency
- `a6c6102` Fix homepage macro chart alignment by month
- `b1b850f` Refine homepage macro correlation pairs
- `6cdd19a` Harden client rendering for macro dashboards
- `525d928` Use new local macro data in legacy frontend
- `4c35622` Restore previous frontend experience

说明：

- `46c5e64` 已在本地提交，但本次尝试 `git push origin main` 因 GitHub SSL/TLS 握手失败未成功推送。
- 其余提交为此前已完成并推进到 `main` 的修复历史。

## 3. 股票链路修复

### 3.1 个股价格显示不完整

已完成：

- 规范股票代码后再请求价格接口
- 时间区间按钮改为真正切换请求区间
- 补全价格卡片的 OHLCV 展示
- 增加价格数据归一化处理

影响文件：

- `src/app/stock/[symbol]/page.tsx`

### 3.2 股票价格不准

根因：

- 旧股票路由直接走不稳定外部接口
- 失败时甚至返回随机 mock 价格

已完成：

- 股票搜索与价格统一改为走本地适配器与缓存数据
- 去掉价格失败时返回 fake 数据的逻辑
- `600519.SH` 等代码先标准化再查价格

影响文件：

- `python-backend/routes/stock_routes.py`

### 3.3 股票路由重复

已完成：

- 收口 `app.py` 与 blueprint 中重复的股票路由
- 实际运行只保留 blueprint 正式实现

### 3.4 股票估值与财务链

已完成：

- `/api/stock/valuation/<ticker>` 统一到本地财报与价格计算
- `/api/financial/dcf/<stock_code>`
- `/api/financial/pe-band/<stock_code>`
- 旧路径改为禁用或内部遗留路径，避免运行时冲突

### 3.5 股票单位与展示错误

已完成：

- 新增统一金额格式化工具
- 修复市值单位换算错误
- 避免把“亿”再次错误折算成“万亿”

影响文件：

- `src/lib/financial-format.ts`
- `src/components/stock/financial/**`
- `python-backend/routes/stock_routes.py`

### 3.6 热门股票价格错误

已完成：

- `/api/stock/hot` 改为返回真实价格快照
- 顶部滚动行情与热门股不再显示占位价格

## 4. 新闻模块修复

### 4.1 新闻接口统一

已完成：

- 清理 `/api/news/hot` 与 `/api/news/trends` 的旧实现冲突
- 新闻接口统一收口到稳定实现

### 4.2 调度器 fallback

根因：

- 当前环境缺少 APScheduler
- 过去日志看似已启用 scheduler，实际没有任务在跑

已完成：

- 增加线程版 fallback 调度器
- 新闻刷新任务支持定时执行

影响文件：

- `python-backend/scheduler/tasks.py`

### 4.3 新闻页前端重做

已完成：

- 重写新闻页中文展示
- 接到修复后的新闻接口

影响文件：

- `src/app/news/page.tsx`

## 5. 顶部栏与品牌修复

已完成：

- `OPENINVEST` 顶部品牌被裁切问题已修复
- 顶栏高度、内边距、品牌布局已重新调整
- 顶部滚动股价支持“有数据即滚动、无数据则清晰提示”

影响文件：

- `src/components/layout/TopBar.tsx`
- `src/components/layout/Sidebar.tsx`

## 6. 前端构建与生产环境修复

### 6.1 生产构建失败

根因：

- `next/font/google` 在生产构建中导致拉取字体失败

已完成：

- 改为本地 / 系统字体
- 清理部分阻塞构建的 TypeScript 类型问题

影响文件：

- `src/app/layout.tsx`
- `src/app/globals.css`

### 6.2 正式域名口径

已完成：

- 增加 `open1nvest.com` 站点主域配置
- 设置 canonical / metadataBase
- 添加 `vercel.json` 域名跳转规则

影响文件：

- `src/lib/site.ts`
- `src/app/layout.tsx`
- `vercel.json`
- `.env.example`

### 6.3 旧前端恢复

已完成：

- 按用户要求恢复旧前端视觉和交互
- 同时保留后端与宏观数据层修复

关键提交：

- `4c35622` Restore previous frontend experience

## 7. 宏观数据链路重构

### 7.1 首页与宏观看板切换到本地 macro 数据

已完成：

- 概览页宏观指标
- 概览页时序相关性
- `/macro` 宏观看板

都切换到新的本地宏观数据层。

关键文件：

- `src/lib/macro-local.ts`
- `src/app/page.tsx`
- `src/app/macro/page.tsx`
- `src/app/api/macro/indicators/route.ts`
- `src/app/api/macro/data/route.ts`
- `src/app/api/macro/correlation/route.ts`

### 7.2 宏观图表稳定性

已完成：

- 客户端错误边界
- 全局错误页
- 局部图表异常不再拖垮整页

### 7.3 时序相关性重构

已完成：

- 首页只展示三组更合理的宏观组合
- 时间对齐改为按月份而非同一天硬匹配
- 图表说明中明确：曲线可做归一化，仅用于趋势比较；`r` 基于原始值

### 7.4 宏观数据清洗

已完成：

- 月频统一到月末
- 季频统一到季末
- 年频统一到年末
- 单周期内部缺口线性补齐
- 孤立尖刺平滑

关键提交：

- `0424957`
- `540462a`

### 7.5 宏观质量元数据

已完成：

- 新增 `quality.score`
- `quality.status`
- `quality.isStale`
- `quality.suspectLatest`
- `quality.notes`

`/api/macro/latest` 已统一切到本地宏观数据层。

关键提交：

- `6d90efb`

### 7.6 宏观看板日期语义修正

已完成：

- 页面文案从“更新时间”改为“数据所属期”
- 页面头部增加数据覆盖期说明

关键提交：

- `90ecf6d`

### 7.7 源数据偏旧提示

已完成：

- 页面提示哪些宏观指标是“源数据偏旧”

关键提交：

- `cc31f48`

### 7.8 本地选源逻辑

已完成：

- 为宏观指标增加候选数据源机制
- 自动选取更新更近、样本更完整的本地源
- 美国利率 / 美元 / 原油 / 资产负债表等序列支持 monthly 与 daily 双候选
- 中国 `REPO7D_CHN`、`TREASURY10Y_CHN` 主源切到 `china_macro_daily.csv`

关键提交：

- `46c5e64` Switch macro source selection to freshest local data

实际结论：

- `US_DFF_M`、`US_DGS10_M` 等已能保持到 2026-04
- `REPO7D_CHN`、`TREASURY10Y_CHN` 仍停在 2025-12-31
- `US_PCECTPI_M` 仍停在 2025-10-31

原因不是程序未生效，而是本地源文件本身没有更近数据。

## 8. 当前遗留问题

### 8.1 宏观源文件本身偏旧

现状：

- 中国部分宏观指标本地文件停在 2025-12-31
- `US_PCECTPI_M` 本地文件停在 2025-10-31

结论：

- 继续优化程序不能让它们变新
- 下一步需要补源或建立自动下载更新链路

### 8.2 数据库口径仍未完全统一

现状：

- Prisma schema 为 sqlite 口径
- 运行时 Next.js 实际接 Turso / libsql

### 8.3 少量历史乱码仍存在

现状：

- 项目中仍有部分历史中文编码问题
- 不影响主要链路，但影响可维护性

### 8.4 本地提交尚未推上 GitHub

现状：

- `46c5e64` 尚未成功 push

原因：

- GitHub HTTPS 握手失败
- 报错：`schannel: failed to receive handshake, SSL/TLS connection failed`

## 9. 建议的下一步

1. 宏观补源  
   为中国偏旧指标与 `US_PCECTPI_M` 补充更新数据。

2. 统一环境变量与部署口径  
   收敛后端 URL、站点 URL 和数据库配置。

3. 整理编码与文案  
   单独处理项目中的历史乱码。

4. 推送本地未上线提交  
   解决 GitHub TLS 问题后推送 `46c5e64`。
