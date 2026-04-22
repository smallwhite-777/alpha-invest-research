# 金融问答助手实施蓝图

更新时间：2026-04-22

## 1. 目标

本次改造的目标不是训练新模型，而是在现有仓库基础上建设一个以 Harness Engineering 为核心的统一金融问答中枢。

目标能力：

- 统一面向用户的问答入口
- 按问题类型自动选择 skill
- 按 skill 拉取不同证据层
- 基于证据进行推理而非直接聊天
- 在返回前补充金融场景约束、风险提示和来源

第一阶段采用最小可上线方案：

- 统一走 `/api/chat` -> Python `/api/query`
- 新增 `assistant` 目录作为编排层
- 支持 `company_analysis`、`earnings_review`、`valuation`、`macro_analysis` 等高频 skill
- 先接入本地搜索与财务指标，保留宏观证据位

## 2. 当前落地文件

### 2.1 新增文件

- `src/lib/assistant/types.ts`
- `src/lib/assistant/skills.ts`
- `src/lib/assistant/context.ts`
- `python-backend/assistant/__init__.py`
- `python-backend/assistant/types.py`
- `python-backend/assistant/skill_registry.py`
- `python-backend/assistant/evidence_broker.py`
- `python-backend/assistant/prompt_builder.py`
- `python-backend/assistant/formatter.py`
- `python-backend/assistant/validator.py`

### 2.2 已接线文件

- `src/app/api/chat/route.ts`
- `python-backend/routes/chat_routes.py`
- `python-backend/workflow/engine.py`

## 3. 第一阶段架构

主链路：

1. Next `/api/chat` 接收消息和上下文
2. 组装 `assistant_context`
3. 调用 Python `/api/query`
4. Python `WorkflowEngine.run_assistant(...)`
5. 依次执行：
   - `time_scheduling`
   - `intent_recognition`
   - `skill_selection`
   - `evidence_collection`
   - `prompt_building`
   - `llm_inference`
   - `result_formatting`
   - `validation`
6. 返回统一结构：
   - `content`
   - `sources`
   - `skill`
   - `warnings`
   - `evidence_summary`
   - `steps`

## 4. Skill Registry

### 4.1 前端 TS 侧

`src/lib/assistant/types.ts` 中定义：

- `SkillId`
- `EvidenceKind`
- `AssistantContext`
- `SkillDefinition`
- `AssistantApiResponse`

`src/lib/assistant/skills.ts` 中定义前端 skill 元信息：

- `company_analysis`
- `earnings_review`
- `valuation`
- `peer_comparison`
- `macro_analysis`
- `macro_to_asset`
- `event_impact`
- `risk_diagnosis`
- `fact_check`

### 4.2 Python 侧

`python-backend/assistant/skill_registry.py` 中注册相同 skill，并定义：

- `required_evidence`
- `optional_evidence`
- `banned_behaviors`
- `output_sections`

## 5. Evidence Broker

### 5.1 输入

`QueryContext`

- `question`
- `page_type`
- `entity_type`
- `stock_code`
- `company_name`
- `indicator_codes`
- `compare_targets`
- `time_range`
- `context_summary`
- `recent_messages`
- `requested_skill`

### 5.2 输出

`EvidenceBundle`

- `skill_id`
- `query`
- `items`
- `grouped`
- `warnings`
- `missing_required`
- `freshness_summary`

### 5.3 第一阶段已接入证据

- `financial_fact`
  - 来自 `SearchAgent.search(...).metrics`
- `research_view`
  - 来自本地搜索 sources
- `annual_report_snippet`
  - 来自 financial report 类型 source
- `news_event`
  - 来自 news 类型 source
- `macro_series`
  - 当前先占位，后续应接 `macro-data` 与宏观 API

## 6. 当前已实现的最小规则

Validator 当前做了轻量检查：

- 没有 sources 时给出警示
- 必需证据缺失时给出警示

后续应扩展：

- 时间一致性校验
- 事实/推断混淆校验
- 数值日期和来源校验
- 风险项缺失校验

## 7. 后续优先事项

### P1

- 把 `macro_series` 从占位升级为真实宏观数据证据
- 接入估值快照与同行对比证据
- 在前端展示 `skill` 和 `warnings`

### P2

- 为 `valuation`、`peer_comparison`、`event_impact` 增加专用 evidence source
- 抽离 `assistant` 返回格式到统一 response 模块
- 让股票页 AI 和分析页 AI 统一协议

### P3

- 新增更严格的 validator
- 引入 YAML 化 skill 定义
- 增强 evidence freshness 和 conflict 检测
- 逐步弱化旧的 `/api/chat` 前端 fallback 逻辑

## 8. 已知限制

- 宏观证据当前仍是占位接入，尚未从 `macro-data` 真正抽取结构化时间序列
- 估值与同行证据在第一阶段尚未纳入 Evidence Broker
- 仓库当前 `npm run lint` 有大量历史错误，暂未在本次骨架改造中清理

## 9. 验证结果

已完成：

- Python assistant 模块语法编译通过
- `WorkflowEngine.run_assistant(...)` 可被路由调用
- `/api/chat` 已可透传 `assistant_context`

待继续验证：

- 与真实 LLM provider 联调
- 宏观、估值、同行证据的逐项接入
- 前端 UI 对 `skill` / `warnings` / `evidence_summary` 的展示
