import { POST } from '../src/app/api/chat/route'

async function run(stage: 'outline' | 'article') {
  const payload: Record<string, unknown> = {
    messages: [{ role: 'user', content: '请帮我撰写一份贵州茅台深度研究报告' }],
    mode: 'deep',
    use_workflow: true,
    context_summary: '用户希望撰写贵州茅台深度研究报告',
    context_state: {
      primaryCompany: '贵州茅台',
      stockCodes: ['600519'],
      comparisonTargets: [],
      topicKeywords: ['贵州茅台', '深度研究', '估值'],
      updatedAt: Date.now(),
    },
    requested_skill: 'company_analysis',
    deep_mode_stage: stage,
  }

  if (stage === 'article') {
    payload.writing_outline = `# 贵州茅台深度分析写作框架

## 一、执行摘要
## 二、商业模式与竞争优势
## 三、经营与财务质量
## 四、估值与风险`
  }

  const request = new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const response = await POST(request as never)
  const data = await response.json()

  console.log(`\n=== ${stage.toUpperCase()} ===`)
  console.log(JSON.stringify(data, null, 2))

  return data
}

async function main() {
  const outline = await run('outline')
  const article = await run('article')

  const outlineOk =
    typeof outline?.result === 'string' &&
    outline.result.includes('贵州茅台') &&
    outline.result.includes('写作框架') &&
    Array.isArray(outline.sources) &&
    outline.sources.length === 0

  const articleOk =
    typeof article?.result === 'string' &&
    article.result.includes('贵州茅台') &&
    !article.result.includes('抱歉，我无法完成分析')

  if (!outlineOk || !articleOk) {
    console.error('\nDeep fallback regression failed.')
    process.exit(1)
  }

  console.log('\nDeep fallback regression passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
