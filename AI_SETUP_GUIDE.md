# AI 分析功能配置指南

## ✅ 已完成的功能

### 1. 文件上传页面 (`/analyze`)
- ✅ 拖拽上传支持
- ✅ 多文件上传
- ✅ 支持格式：PDF、Word (.docx)、TXT、Markdown

### 2. AI 分析服务
- ✅ 支持 DeepSeek (推荐)
- ✅ 支持 SiliconFlow (备用)
- ✅ 投研专用 Prompt 设计
- ✅ 估值分析、投资建议、风险提示

### 3. 文件解析
- ✅ PDF 文本提取
- ✅ Word (.docx) 文本提取
- ✅ 文本文件直接读取

---

## 🔑 配置步骤

### 第一步：选择 AI 服务提供商

**推荐方案：DeepSeek（优先）**
- 免费额度：5000万 tokens
- 效果：接近 GPT-4/Claude
- 价格：用完后 1元/百万 tokens

**备用方案：SiliconFlow**
- 免费额度：14元 (~200万 tokens)
- 支持多种开源模型

---

### 第二步：申请 API Key

#### DeepSeek (推荐)
1. 访问 https://platform.deepseek.com
2. 用手机号注册账号
3. 进入「API Keys」页面
4. 点击「创建 API Key」
5. 复制密钥（以 `sk-` 开头）

#### SiliconFlow (备用)
1. 访问 https://siliconflow.cn
2. 注册账号
3. 进入「API 密钥」页面
4. 创建密钥

---

### 第三步：配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
# 选择其中一种（推荐 DeepSeek）
DEEPSEEK_API_KEY=sk-your-api-key-here

# 或者使用 SiliconFlow
# SILICONFLOW_API_KEY=your-api-key-here

# 默认使用的提供商（可选）
DEFAULT_AI_PROVIDER=deepseek
```

---

### 第四步：重启服务器

修改 `.env.local` 后需要重启 Next.js 服务器：

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
npm run dev
```

---

## 🧪 测试

1. 打开 http://localhost:3002/analyze
2. 拖拽或点击上传一个 PDF/Word/文本文件
3. 点击「开始 AI 分析」
4. 等待 2-5 秒，查看分析结果

---

## 📊 当前状态

**目前运行模式：** 模拟数据模式
- ✅ 界面功能完整可用
- ✅ 文件上传、解析正常
- ⚠️ 分析结果是模拟数据（不是真实 AI）

**切换到真实 AI：**
配置 `DEEPSEEK_API_KEY` 后自动切换

---

## 💡 使用建议

### 适合分析的文件类型
- 📄 投资研究报告
- 📊 财报文件（PDF/Word）
- 📰 新闻资讯文章
- 📝 行业分析笔记

### 分析内容包含
- 核心摘要
- 关键要点（5条）
- 情感倾向（看涨/中性/看跌）
- 投资建议（买入/持有/卖出/观望）
- 估值分析（如有数据）
- 风险提示
- 投资机会

---

## 🔧 常见问题

### Q: 上传文件后显示"不支持的文件类型"
A: 请确保文件格式为 PDF、.docx、.txt、.md 之一

### Q: 分析一直转圈没有结果
A: 检查是否配置了 API Key，或查看控制台错误信息

### Q: 分析结果不够准确
A: 这是 AI 模型的问题，可以尝试：
- 使用更大的模型（DeepSeek-V3）
- 上传更完整的文档
- 合并相关文档一起分析

### Q: 如何切换 AI 提供商？
A: 修改 `.env.local` 中的 `DEFAULT_AI_PROVIDER` 为 `deepseek` 或 `siliconflow`

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 检查 `.env.local` 文件是否正确配置
2. 查看终端输出的错误信息
3. 确认 API Key 是否有效（可以在对应平台测试）
