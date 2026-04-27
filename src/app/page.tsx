'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { LogoSerifTerminal } from '@/components/ui/LogoSerifTerminal'
import { Sparkline, generateSparkSeed } from '@/components/ui/Sparkline'

const prismaFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Network error')
  return res.json()
}

const pyFetcher = async (url: string) => {
  const PY = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5001'
  const res = await fetch(`${PY}${url}`)
  if (!res.ok) throw new Error('Network error')
  return res.json()
}

interface Insight {
  id: string
  title: string
  category: string
  importance: number
  createdAt: string
  source?: string
}

interface InsightsResponse {
  items: Insight[]
  total: number
}

interface Sector {
  name: string
  ticker?: string
  change: number
}

interface SectorResponse {
  success: boolean
  sectors: Sector[]
}

interface Stock {
  code: string
  name: string
  sector: string
  signal: string
  target: string
  change: string
}

const TOP10_SEED: Stock[] = [
  { code: '688981', name: '中芯国际', sector: '半导体', signal: '产能扩张窗口', target: '+38%', change: '+2.14' },
  { code: '300750', name: '宁德时代', sector: '新能源', signal: '海外订单加速', target: '+32%', change: '+1.32' },
  { code: '600519', name: '贵州茅台', sector: '白酒', signal: '渠道库存出清', target: '+24%', change: '+0.85' },
  { code: '002594', name: '比亚迪', sector: '汽车', signal: 'DM-i 5.0 放量', target: '+41%', change: '+3.07' },
  { code: '600036', name: '招商银行', sector: '银行', signal: '净息差企稳', target: '+22%', change: '+0.42' },
  { code: '000858', name: '五粮液', sector: '白酒', signal: '估值回归', target: '+26%', change: '+1.05' },
  { code: '600276', name: '恒瑞医药', sector: '医药', signal: '创新药管线兑现', target: '+30%', change: '+1.84' },
  { code: '000333', name: '美的集团', sector: '家电', signal: '海外份额提升', target: '+25%', change: '+0.62' },
  { code: '601012', name: '隆基绿能', sector: '光伏', signal: 'BC 技术放量', target: '+35%', change: '+2.41' },
  { code: '300059', name: '东方财富', sector: '券商', signal: '交投活跃修复', target: '+20%', change: '+1.18' },
]

const SECTORS_SEED: Sector[] = [
  { name: '半导体', change: 3.42 },
  { name: 'AI 算力', change: 2.87 },
  { name: '新能源车', change: 1.92 },
  { name: '消费电子', change: 1.21 },
  { name: '银行', change: 0.48 },
  { name: '白酒', change: -0.32 },
  { name: '光伏', change: -1.18 },
  { name: '地产', change: -2.04 },
]

const TODAY_OUTPUT_SEED = [
  { tag: '深度报告', tone: 'navy' as const, title: 'AI Agent 重构卖方研究', meta: '研究院 · 18 min' },
  { tag: '产业观点', tone: 'amber' as const, title: 'HBM3e 量产爬坡，国产存储链订单可见度延伸至 Q3', meta: '半导体组 · 9 min' },
  { tag: '情报', tone: 'green' as const, title: '欧洲电池法草案落地，一线厂商海外溢价 1500-2000 元/kWh', meta: '08:31 · 重要度 ◆◆◆◆' },
  { tag: '宏观速评', tone: 'navy' as const, title: '社融超预期，M2-M1 剪刀差收窄至 4.2 个百分点', meta: '宏观组 · 6 min' },
  { tag: '情报', tone: 'green' as const, title: 'Claude 4.5 推理成本下降 70%，下游 SaaS 渗透拐点临近', meta: '08:55 · 重要度 ◆◆◆◆◆' },
]

const INTEL_FEED_SEED = [
  { time: '09:42', tag: '半导体', importance: 5, title: 'HBM3e 量产爬坡，国产存储链订单可见度延伸至 Q3', source: 'open1nvest 内参' },
  { time: '09:18', tag: '宏观', importance: 4, title: '社融增量超预期，M2-M1 剪刀差收窄至 4.2 个百分点', source: '央行' },
  { time: '08:55', tag: 'AI', importance: 5, title: 'Claude 4.5 推理成本下降 70%，下游 SaaS 渗透率拐点临近', source: 'Anthropic' },
  { time: '08:31', tag: '新能源', importance: 4, title: '欧洲电池法草案落地，国内一线厂商海外溢价 1500-2000 元/kWh', source: 'EU Council' },
  { time: '08:12', tag: '医药', importance: 3, title: 'GLP-1 国内首个仿制药申报上市，渗透曲线或加速', source: 'NMPA' },
  { time: '07:48', tag: '军工', importance: 3, title: '低轨星座组网招标启动，预算同比 +28%', source: '中国卫星网络集团' },
]

const REPORTS_SEED = [
  { id: 'R-2604', tag: '深度', title: 'AI Agent 重构卖方研究：覆盖广度与时效的非对称优势', read: '18 min', author: 'open1nvest 研究院' },
  { id: 'R-2598', tag: '产业', title: 'HBM 与先进封装：从台积电 CoWoS 到长电先进的国产替代路径', read: '24 min', author: '半导体组' },
  { id: 'R-2591', tag: '宏观', title: '剪刀差收窄之后：流动性传导的三阶段框架', read: '15 min', author: '宏观组' },
  { id: 'R-2585', tag: '策略', title: '风格轮动信号：成长 vs 价值的隐含拐点', read: '12 min', author: '策略组' },
]

const NAVY = 'var(--primary)'
const CREAM = 'var(--background)'
const PAPER = 'var(--card)'
const AMBER = 'var(--warning)'
const SAGE = 'var(--up)'
const MAROON = 'var(--down)'
const MUTED = 'var(--muted-foreground)'
const FG = 'var(--foreground)'

const toneColor = (tone: 'navy' | 'amber' | 'green'): string => {
  if (tone === 'amber') return AMBER
  if (tone === 'green') return SAGE
  return NAVY
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-serif"
      style={{
        fontSize: 13,
        letterSpacing: '0.25em',
        color: MUTED,
        marginBottom: 8,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ children, size = 32 }: { children: React.ReactNode; size?: number }) {
  return (
    <h2
      className="font-display"
      style={{
        fontSize: size,
        fontWeight: 500,
        margin: 0,
        letterSpacing: '-0.01em',
        lineHeight: 1.1,
        color: FG,
      }}
    >
      {children}
    </h2>
  )
}

export default function Homepage() {
  const { data: insightsTop } = useSWR<InsightsResponse>('/api/intelligence?limit=5', prismaFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })
  const { data: insightsFeed } = useSWR<InsightsResponse>(
    '/api/intelligence?limit=6',
    prismaFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 },
  )
  const { data: sectorData } = useSWR<SectorResponse>('/api/market/sectors', pyFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  })

  const todayItems =
    insightsTop?.items && insightsTop.items.length > 0
      ? insightsTop.items.slice(0, 5).map((it) => ({
          tag: it.category.replace(/_/g, ' '),
          tone: (it.importance >= 5 ? 'amber' : it.importance >= 3 ? 'green' : 'navy') as 'navy' | 'amber' | 'green',
          title: it.title,
          meta: `${formatRelative(it.createdAt)} · 重要度 ${'◆'.repeat(it.importance)}`,
        }))
      : TODAY_OUTPUT_SEED

  const intelItems =
    insightsFeed?.items && insightsFeed.items.length > 0
      ? insightsFeed.items.slice(0, 6).map((it) => ({
          time: formatTime(it.createdAt),
          tag: it.category.replace(/_/g, ' '),
          importance: it.importance,
          title: it.title,
          source: it.source || 'open1nvest',
        }))
      : INTEL_FEED_SEED

  const sectors = sectorData?.success && sectorData.sectors.length >= 4 ? sectorData.sectors.slice(0, 8) : SECTORS_SEED

  const dateLabel = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: CREAM, color: FG }}
    >
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        {/* HERO */}
        <section
          className="bg-data-lattice"
          style={{
            position: 'relative',
            padding: '80px 60px 60px',
            borderBottom: '1px solid rgba(0,22,41,0.08)',
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: 60,
              alignItems: 'start',
            }}
          >
            {/* Left: brand statement */}
            <div>
              <div
                className="font-serif"
                style={{
                  fontSize: 13,
                  letterSpacing: '0.2em',
                  color: MUTED,
                  marginBottom: 32,
                }}
              >
                二〇二六年四月 · 第 142 期
              </div>

              {/* Brand statement — one sentence, natural wrap */}
              <h1
                className="font-display"
                style={{
                  fontSize: 76,
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  fontWeight: 500,
                  margin: 0,
                  color: FG,
                  maxWidth: 920,
                }}
              >
                AI 投研，从信号开始；你的
                <em
                  style={{
                    fontStyle: 'italic',
                    color: AMBER,
                    fontWeight: 500,
                  }}
                >
                  投研副驾
                </em>
                。
              </h1>

              {/* Sub-copy */}
              <div
                className="font-serif"
                style={{
                  marginTop: 36,
                  fontSize: 22,
                  lineHeight: 1.6,
                  color: FG,
                  maxWidth: 720,
                }}
              >
                以知识复利驱动的{' '}
                <em
                  className="font-display"
                  style={{ color: AMBER, fontStyle: 'italic', fontWeight: 500 }}
                >
                  行业 Agent 专家集群
                </em>
                ，以极致速度挖掘市场{' '}
                <em
                  className="font-display"
                  style={{ fontStyle: 'italic', fontWeight: 500 }}
                >
                  alpha
                </em>
                。
              </div>

              {/* CTA */}
              <div style={{ marginTop: 40, display: 'flex', gap: 12 }}>
                <Link
                  href="/analyze"
                  style={{
                    padding: '12px 26px',
                    background: NAVY,
                    color: 'var(--primary-foreground)',
                    fontSize: 13,
                    textDecoration: 'none',
                    display: 'inline-block',
                    transition: 'opacity 0.15s',
                  }}
                  className="hover:opacity-85"
                >
                  开始使用 →
                </Link>
                <Link
                  href="/intelligence"
                  style={{
                    padding: '12px 26px',
                    background: 'transparent',
                    color: NAVY,
                    border: `1px solid ${NAVY}`,
                    fontSize: 13,
                    textDecoration: 'none',
                    display: 'inline-block',
                    transition: 'all 0.15s',
                  }}
                  className="hover:bg-primary hover:text-[var(--primary-foreground)]"
                >
                  阅读今日观点
                </Link>
              </div>
            </div>

            {/* Right: today's output */}
            <aside style={{ background: PAPER, padding: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '1px solid rgba(0,22,41,0.10)',
                }}
              >
                <span
                  className="font-serif"
                  style={{
                    fontSize: 13,
                    letterSpacing: '0.2em',
                    color: NAVY,
                    fontWeight: 500,
                  }}
                >
                  今 日 产 出 · {dateLabel}
                </span>
                <span className="font-mono-data" style={{ fontSize: 11, color: MUTED }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      background: SAGE,
                      marginRight: 6,
                    }}
                  />
                  {todayItems.length} 条更新
                </span>
              </div>
              {todayItems.map((a, i, arr) => (
                <Link
                  key={i}
                  href="/intelligence"
                  style={{
                    display: 'block',
                    padding: '14px 0',
                    fontSize: 13,
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(0,22,41,0.05)' : 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div
                    className="font-mono-data"
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.15em',
                      color: toneColor(a.tone),
                      marginBottom: 6,
                      textTransform: 'uppercase',
                    }}
                  >
                    {a.tag}
                  </div>
                  <div
                    className="font-serif"
                    style={{
                      fontSize: 14,
                      lineHeight: 1.45,
                      fontWeight: 500,
                      marginBottom: 4,
                      color: FG,
                    }}
                  >
                    {a.title}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>{a.meta}</div>
                </Link>
              ))}
              <Link
                href="/intelligence"
                style={{
                  display: 'block',
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(0,22,41,0.10)',
                  fontSize: 12,
                  color: NAVY,
                  cursor: 'pointer',
                  textAlign: 'right',
                  textDecoration: 'none',
                }}
              >
                查看全部今日产出 →
              </Link>
            </aside>
          </div>

          {/* Features row */}
          <div
            style={{
              marginTop: 80,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 0,
              paddingTop: 40,
              borderTop: '1px solid rgba(0,22,41,0.10)',
              position: 'relative',
            }}
          >
            {[
              {
                n: '〇一',
                t: '情报分享',
                d: '产业链一手信号、政策落点、海外异动 —— Agent 全网捕获，按重要度分级推送，事件发生即触达。',
                href: '/intelligence',
              },
              {
                n: '〇二',
                t: '智能问答',
                d: '随时向 Agent 提问任何标的、任何主题。它会调用所有研究记忆，给出带逻辑链与数据支撑的回答。',
                href: '/analyze',
              },
              {
                n: '〇三',
                t: '深度观点',
                d: '行业 Agent 持续输出长报告与策略观点，从产业框架到个股推荐，每一个结论都可追溯、可质询。',
                href: '/intelligence?type=RESEARCH_REPORT',
              },
            ].map((p, i) => (
              <Link
                key={p.n}
                href={p.href}
                style={{
                  padding: '0 32px',
                  borderRight: i < 2 ? '1px solid rgba(0,22,41,0.10)' : 'none',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                }}
              >
                <div
                  className="font-serif"
                  style={{
                    fontSize: 13,
                    letterSpacing: '0.25em',
                    color: AMBER,
                    marginBottom: 14,
                    fontWeight: 500,
                  }}
                >
                  功 能 {p.n}
                </div>
                <div
                  className="font-display"
                  style={{
                    fontSize: 26,
                    lineHeight: 1.25,
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  {p.t}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: MUTED,
                  }}
                >
                  {p.d}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* TOP10 + Sector heatmap */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            borderBottom: '1px solid rgba(0,22,41,0.08)',
          }}
        >
          {/* TOP10 */}
          <div style={{ padding: '48px 56px', borderRight: '1px solid rgba(0,22,41,0.08)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 24,
              }}
            >
              <div>
                <SectionLabel>看 涨 名 单</SectionLabel>
                <SectionTitle>open1nvest 看涨观点 · 十只精选</SectionTitle>
              </div>
              <Link
                href="/stock"
                style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}
              >
                查看全部 →
              </Link>
            </div>
            <div>
              {TOP10_SEED.map((s, i) => (
                <Link
                  key={s.code}
                  href={`/stock/${s.code}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1.4fr 90px 1.5fr 70px 70px 70px',
                    padding: '12px 0',
                    fontSize: 13,
                    borderBottom: i < TOP10_SEED.length - 1 ? '1px solid rgba(0,22,41,0.05)' : 'none',
                    alignItems: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span className="font-mono-data" style={{ fontSize: 11, color: MUTED }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="font-serif" style={{ fontWeight: 500 }}>
                      {s.name}
                    </span>
                    <span
                      className="font-mono-data"
                      style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}
                    >
                      {s.code}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: MUTED }}>{s.sector}</span>
                  <span className="font-serif" style={{ fontStyle: 'italic', fontSize: 13 }}>
                    {s.signal}
                  </span>
                  <Sparkline values={generateSparkSeed(i + 1)} color="var(--up)" width={64} height={20} />
                  <span
                    className="font-mono-data"
                    style={{ textAlign: 'right', color: SAGE, fontWeight: 500 }}
                  >
                    {s.target}
                  </span>
                  <span
                    className="font-mono-data"
                    style={{ textAlign: 'right', color: SAGE }}
                  >
                    {s.change}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Sector heatmap */}
          <div style={{ padding: '48px 56px' }}>
            <SectionLabel>行 情 看 板</SectionLabel>
            <SectionTitle>板块强弱 · 风格轮动</SectionTitle>
            <div
              style={{
                marginTop: 28,
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1,
                background: 'rgba(0,22,41,0.06)',
              }}
            >
              {sectors.slice(0, 8).map((s) => {
                const up = s.change > 0
                const intensity = Math.min(Math.abs(s.change) / 4, 1)
                const vol = Math.abs(s.change) > 2 ? '高' : Math.abs(s.change) > 1 ? '中' : '低'
                return (
                  <div
                    key={s.name}
                    style={{
                      padding: '20px 16px',
                      background: CREAM,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: up ? SAGE : MAROON,
                        opacity: intensity * 0.18,
                      }}
                    />
                    <div style={{ position: 'relative' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>{s.name}</div>
                      <div
                        className="font-display"
                        style={{
                          fontSize: 28,
                          fontWeight: 500,
                          color: up ? SAGE : MAROON,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {up ? '+' : ''}
                        {s.change.toFixed(2)}%
                      </div>
                      <div
                        className="font-mono-data"
                        style={{ fontSize: 10, color: MUTED, marginTop: 4 }}
                      >
                        波动 {vol}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Intel feed full-width */}
        <section
          style={{
            padding: '64px 60px',
            borderBottom: '1px solid rgba(0,22,41,0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 32,
            }}
          >
            <div>
              <SectionLabel>情 报 流</SectionLabel>
              <SectionTitle size={36}>Agent 实时情报 · 重要度排序</SectionTitle>
            </div>
            <span className="font-mono-data" style={{ fontSize: 12, color: MUTED }}>
              过去 4 小时 · 共 {intelItems.length} 条
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
              background: 'rgba(0,22,41,0.05)',
              borderTop: '1px solid rgba(0,22,41,0.08)',
            }}
          >
            {intelItems.map((it, i) => (
              <Link
                key={i}
                href="/intelligence"
                style={{
                  background: CREAM,
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(0,22,41,0.06)',
                  borderRight: i % 2 === 0 ? '1px solid rgba(0,22,41,0.06)' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '54px 1fr',
                  gap: 16,
                  alignItems: 'baseline',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span className="font-mono-data" style={{ fontSize: 12, color: MUTED }}>
                  {it.time}
                </span>
                <div>
                  <div style={{ marginBottom: 6, fontSize: 11 }}>
                    <span className="font-mono-data" style={{ color: AMBER }}>
                      {'◆'.repeat(it.importance)}
                    </span>
                    <span style={{ color: MUTED, marginLeft: 8 }}>{it.tag}</span>
                  </div>
                  <div
                    className="font-serif"
                    style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 500 }}
                  >
                    {it.title}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{it.source}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Reports */}
        <section style={{ padding: '64px 60px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 32,
            }}
          >
            <div>
              <SectionLabel>深 度 研 究</SectionLabel>
              <SectionTitle size={36}>本周长篇 · Agent 出品</SectionTitle>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              background: 'rgba(0,22,41,0.08)',
            }}
          >
            {REPORTS_SEED.map((r) => (
              <Link
                key={r.id}
                href="/intelligence?type=RESEARCH_REPORT"
                style={{
                  padding: '28px 24px',
                  background: CREAM,
                  cursor: 'pointer',
                  borderTop: `2px solid ${NAVY}`,
                  minHeight: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div>
                  <div
                    className="font-mono-data"
                    style={{
                      fontSize: 11,
                      color: AMBER,
                      letterSpacing: '0.15em',
                      marginBottom: 18,
                    }}
                  >
                    {r.tag} · {r.id}
                  </div>
                  <h3
                    className="font-display"
                    style={{
                      fontSize: 20,
                      lineHeight: 1.35,
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {r.title}
                  </h3>
                </div>
                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(0,22,41,0.10)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: MUTED,
                  }}
                >
                  <span>{r.author}</span>
                  <span>{r.read}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: '40px 60px',
            background: NAVY,
            color: 'var(--primary-foreground)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <LogoSerifTerminal size={16} color="var(--primary-foreground)" showCursor={false} />
          <span
            className="font-serif"
            style={{
              fontSize: 11,
              opacity: 0.6,
              letterSpacing: '0.2em',
            }}
          >
            AI 驱动的研究机构 · 向公众开放
          </span>
        </footer>
      </div>
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
