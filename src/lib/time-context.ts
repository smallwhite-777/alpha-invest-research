/**
 * 时间上下文注入模块
 *
 * 解决大语言模型知识截止问题：
 * - LLM知识截止于2024年
 * - 当用户说"最近"、"最新"、"今年"时，模型可能误判为2024年
 * - 通过注入真实当前时间，让模型正确理解时间表述
 */

/**
 * 时间上下文信息
 */
export interface TimeContext {
  currentYear: number
  currentMonth: number
  currentDay: number
  currentDate: string // ISO格式 YYYY-MM-DD
  currentQuarter: `Q${1 | 2 | 3 | 4}`
  latestReportYear: number
  latestReportQuarter: `Q${1 | 2 | 3 | 4}`
  lastYear: number
  nextYear: number
  isFirstHalf: boolean
}

/**
 * 获取当前时间上下文
 */
export function getCurrentTimeContext(): TimeContext {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-11 -> 1-12

  // 计算当前季度
  const quarter = Math.ceil(month / 3) as 1 | 2 | 3 | 4

  // 计算最近的财报季度
  // Q1: 3月底, Q2: 6月底, Q3: 9月底, Q4: 12月底
  let latestReportQuarter: 1 | 2 | 3 | 4
  let latestReportYear: number

  if (month >= 11) {
    // 11月、12月 -> Q3报告应该已出
    latestReportQuarter = 3
    latestReportYear = year
  } else if (month >= 8) {
    // 8月、9月、10月 -> Q2报告应该已出
    latestReportQuarter = 2
    latestReportYear = year
  } else if (month >= 5) {
    // 5月、6月、7月 -> Q1报告应该已出
    latestReportQuarter = 1
    latestReportYear = year
  } else {
    // 1-4月 -> 上一年Q4报告应该已出
    latestReportQuarter = 4
    latestReportYear = year - 1
  }

  return {
    currentYear: year,
    currentMonth: month,
    currentDay: now.getDate(),
    currentDate: now.toISOString().split('T')[0],
    currentQuarter: `Q${quarter}` as `Q${1 | 2 | 3 | 4}`,
    latestReportYear,
    latestReportQuarter: `Q${latestReportQuarter}` as `Q${1 | 2 | 3 | 4}`,
    lastYear: year - 1,
    nextYear: year + 1,
    isFirstHalf: month <= 6,
  }
}

/**
 * 格式化时间上下文供LLM使用
 */
export function formatTimeContextForLLM(ctx: TimeContext | null = null): string {
  const timeCtx = ctx ?? getCurrentTimeContext()

  return `【重要时间信息】
当前真实日期：${timeCtx.currentDate}（${timeCtx.currentYear}年${timeCtx.currentMonth}月${timeCtx.currentDay}日）
当前季度：${timeCtx.currentYear}年${timeCtx.currentQuarter}
最新可用财报：${timeCtx.latestReportYear}年${timeCtx.latestReportQuarter}报告

时间表述对应关系：
- "今年" = ${timeCtx.currentYear}年
- "去年" = ${timeCtx.lastYear}年
- "最近" = ${timeCtx.lastYear}年或${timeCtx.currentYear}年（视具体语境）
- "最新财报" = ${timeCtx.latestReportYear}年${timeCtx.latestReportQuarter}报告

请在回答时使用正确的年份，不要使用2024年作为"今年"或"当前年份"。
`
}

/**
 * 将时间上下文注入到系统提示词中
 */
export function injectTimeContext(
  systemPrompt: string,
  position: 'prefix' | 'suffix' = 'prefix'
): string {
  const timeCtx = formatTimeContextForLLM()

  if (position === 'prefix') {
    return `${timeCtx}\n\n${systemPrompt}`
  } else {
    return `${systemPrompt}\n\n${timeCtx}`
  }
}

/**
 * 获取时间感知提示词片段
 */
export function getTimeAwarePrompt(): string {
  const ctx = getCurrentTimeContext()

  return `
【时间认知提醒】
当前是${ctx.currentYear}年${ctx.currentMonth}月，请确保：
1. "今年"指的是${ctx.currentYear}年，不是2024年
2. "去年"指的是${ctx.lastYear}年
3. "最近两年"指的是${ctx.lastYear}年和${ctx.currentYear - 2}年
4. 最新财报数据来自${ctx.latestReportYear}年${ctx.latestReportQuarter}报告
`
}

/**
 * 获取时间相关常量
 */
export function getTimeConstants() {
  const ctx = getCurrentTimeContext()

  return {
    CURRENT_YEAR: ctx.currentYear,
    LAST_YEAR: ctx.lastYear,
    LATEST_REPORT_YEAR: ctx.latestReportYear,
    VALID_YEAR_RANGE: [2000, ctx.currentYear] as const,
    DEFAULT_QUERY_YEARS: [String(ctx.lastYear), String(ctx.lastYear - 1)],
  }
}

// 缓存，避免重复计算
let cachedContext: TimeContext | null = null
let cacheDate: string | null = null

/**
 * 获取缓存的时间上下文（同一天内只计算一次）
 */
export function getCachedTimeContext(): TimeContext {
  const today = new Date().toISOString().split('T')[0]

  if (cacheDate !== today || !cachedContext) {
    cachedContext = getCurrentTimeContext()
    cacheDate = today
  }

  return cachedContext
}

// 便捷导出
export const currentYear = () => getCachedTimeContext().currentYear
export const lastYear = () => getCachedTimeContext().lastYear
export const latestReportYear = () => getCachedTimeContext().latestReportYear