import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: 'file:./prisma/dev.db'
})

const prisma = new PrismaClient({ adapter })

// Helpers
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function normalRand(mean: number, std: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

function generateTimeSeries(base: number, trend: number, volatility: number, count: number): number[] {
  const result: number[] = []
  let val = base
  for (let i = 0; i < count; i++) {
    val += trend + normalRand(0, volatility)
    result.push(parseFloat(val.toFixed(2)))
  }
  return result
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function monthsAgo(n: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(1)
  return d
}

// ===== Data Definitions =====

const TAGS_DATA = [
  { name: '产能扩张', color: '#3b82f6' },
  { name: '价格战', color: '#ef4444' },
  { name: '政策利好', color: '#00d4aa' },
  { name: '财报超预期', color: '#f59e0b' },
  { name: '渠道调研', color: '#a855f7' },
  { name: '库存周期', color: '#06b6d4' },
  { name: '技术突破', color: '#8b5cf6' },
  { name: '出口管制', color: '#ef4444' },
  { name: '集中度提升', color: '#10b981' },
  { name: '需求回暖', color: '#22c55e' },
  { name: '供给收缩', color: '#f97316' },
  { name: '国产替代', color: '#e11d48' },
  { name: '行业拐点', color: '#06b6d4' },
  { name: '资本开支', color: '#6366f1' },
  { name: '上游涨价', color: '#dc2626' },
  { name: '下游放量', color: '#16a34a' },
  { name: '格局优化', color: '#0891b2' },
  { name: '海外拓展', color: '#7c3aed' },
  { name: '监管变化', color: '#ea580c' },
  { name: '估值修复', color: '#059669' },
  { name: '高管变动', color: '#9333ea' },
  { name: '并购重组', color: '#2563eb' },
  { name: '研发进展', color: '#0ea5e9' },
  { name: '订单验证', color: '#14b8a6' },
  { name: '产品迭代', color: '#8b5cf6' },
  { name: '渗透率提升', color: '#f43f5e' },
  { name: '周期底部', color: '#84cc16' },
  { name: '景气上行', color: '#22d3ee' },
  { name: '业绩预告', color: '#fbbf24' },
  { name: '机构调研', color: '#a78bfa' },
]

const SECTORS_DATA = [
  { code: 'SEMICONDUCTOR', name: '半导体' },
  { code: 'NEV', name: '新能源车' },
  { code: 'AI_COMPUTING', name: 'AI算力' },
  { code: 'PHARMA', name: '医药' },
  { code: 'CONSUMER_ELECTRONICS', name: '消费电子' },
]

const STOCKS_DATA = [
  // Semiconductor
  { symbol: '688981.SH', name: '中芯国际', market: 'SH', sectorCode: 'SEMICONDUCTOR', sectorName: '半导体', baseRevenue: 120, baseMargin: 22, basePE: 45 },
  { symbol: '603501.SH', name: '韦尔股份', market: 'SH', sectorCode: 'SEMICONDUCTOR', sectorName: '半导体', baseRevenue: 55, baseMargin: 28, basePE: 35 },
  { symbol: '002371.SZ', name: '北方华创', market: 'SZ', sectorCode: 'SEMICONDUCTOR', sectorName: '半导体', baseRevenue: 45, baseMargin: 35, basePE: 55 },
  { symbol: '600584.SH', name: '长电科技', market: 'SH', sectorCode: 'SEMICONDUCTOR', sectorName: '半导体', baseRevenue: 75, baseMargin: 15, basePE: 28 },
  // NEV
  { symbol: '002594.SZ', name: '比亚迪', market: 'SZ', sectorCode: 'NEV', sectorName: '新能源车', baseRevenue: 1500, baseMargin: 20, basePE: 22 },
  { symbol: '300750.SZ', name: '宁德时代', market: 'SZ', sectorCode: 'NEV', sectorName: '新能源车', baseRevenue: 900, baseMargin: 25, basePE: 28 },
  { symbol: '02015.HK', name: '理想汽车', market: 'HK', sectorCode: 'NEV', sectorName: '新能源车', baseRevenue: 300, baseMargin: 22, basePE: 40 },
  { symbol: '09868.HK', name: '小鹏汽车', market: 'HK', sectorCode: 'NEV', sectorName: '新能源车', baseRevenue: 120, baseMargin: 8, basePE: 65 },
  // AI
  { symbol: '688256.SH', name: '寒武纪', market: 'SH', sectorCode: 'AI_COMPUTING', sectorName: 'AI算力', baseRevenue: 8, baseMargin: 45, basePE: 120 },
  { symbol: '688041.SH', name: '海光信息', market: 'SH', sectorCode: 'AI_COMPUTING', sectorName: 'AI算力', baseRevenue: 18, baseMargin: 55, basePE: 90 },
  { symbol: '300308.SZ', name: '中际旭创', market: 'SZ', sectorCode: 'AI_COMPUTING', sectorName: 'AI算力', baseRevenue: 35, baseMargin: 30, basePE: 45 },
  { symbol: '601138.SH', name: '工业富联', market: 'SH', sectorCode: 'AI_COMPUTING', sectorName: 'AI算力', baseRevenue: 2200, baseMargin: 8, basePE: 18 },
  // Pharma
  { symbol: '600276.SH', name: '恒瑞医药', market: 'SH', sectorCode: 'PHARMA', sectorName: '医药', baseRevenue: 60, baseMargin: 85, basePE: 50 },
  { symbol: '603259.SH', name: '药明康德', market: 'SH', sectorCode: 'PHARMA', sectorName: '医药', baseRevenue: 100, baseMargin: 38, basePE: 35 },
  { symbol: '300760.SZ', name: '迈瑞医疗', market: 'SZ', sectorCode: 'PHARMA', sectorName: '医药', baseRevenue: 85, baseMargin: 65, basePE: 40 },
  { symbol: '688235.SH', name: '百济神州', market: 'SH', sectorCode: 'PHARMA', sectorName: '医药', baseRevenue: 55, baseMargin: 72, basePE: 80 },
  // Consumer Electronics
  { symbol: '002475.SZ', name: '立讯精密', market: 'SZ', sectorCode: 'CONSUMER_ELECTRONICS', sectorName: '消费电子', baseRevenue: 550, baseMargin: 12, basePE: 25 },
  { symbol: '002241.SZ', name: '歌尔股份', market: 'SZ', sectorCode: 'CONSUMER_ELECTRONICS', sectorName: '消费电子', baseRevenue: 200, baseMargin: 14, basePE: 22 },
  { symbol: '688036.SH', name: '传音控股', market: 'SH', sectorCode: 'CONSUMER_ELECTRONICS', sectorName: '消费电子', baseRevenue: 160, baseMargin: 25, basePE: 18 },
  { symbol: '02382.HK', name: '舜宇光学', market: 'HK', sectorCode: 'CONSUMER_ELECTRONICS', sectorName: '消费电子', baseRevenue: 90, baseMargin: 18, basePE: 30 },
]

const MACRO_INDICATORS = [
  { code: 'cn_pmi', name: '中国制造业PMI', category: 'ECONOMIC', country: 'CN', unit: '点', frequency: 'MONTHLY', base: 50, trend: 0, vol: 1.5 },
  { code: 'cn_gdp_yoy', name: 'GDP同比增速', category: 'ECONOMIC', country: 'CN', unit: '%', frequency: 'QUARTERLY', base: 5.0, trend: 0, vol: 0.5 },
  { code: 'cn_industrial_va', name: '工业增加值同比', category: 'ECONOMIC', country: 'CN', unit: '%', frequency: 'MONTHLY', base: 5.5, trend: 0, vol: 1.2 },
  { code: 'cn_fai', name: '固定资产投资增速', category: 'ECONOMIC', country: 'CN', unit: '%', frequency: 'MONTHLY', base: 4.0, trend: -0.02, vol: 0.8 },
  { code: 'cn_social_financing', name: '社融存量增速', category: 'MONETARY', country: 'CN', unit: '%', frequency: 'MONTHLY', base: 9.5, trend: -0.03, vol: 0.3 },
  { code: 'cn_m2', name: 'M2增速', category: 'MONETARY', country: 'CN', unit: '%', frequency: 'MONTHLY', base: 8.5, trend: 0.02, vol: 0.4 },
  { code: 'us_cn_spread', name: '中美10Y利差', category: 'MONETARY', country: 'GLOBAL', unit: 'bp', frequency: 'MONTHLY', base: -150, trend: 0.5, vol: 15 },
  { code: 'shibor_3m', name: 'SHIBOR 3M', category: 'MONETARY', country: 'CN', unit: '%', frequency: 'MONTHLY', base: 2.2, trend: -0.01, vol: 0.15 },
  { code: 'brent_oil', name: '布伦特原油', category: 'COMMODITY', country: 'GLOBAL', unit: '美元/桶', frequency: 'MONTHLY', base: 78, trend: 0.2, vol: 5 },
  { code: 'lme_copper', name: 'LME铜', category: 'COMMODITY', country: 'GLOBAL', unit: '美元/吨', frequency: 'MONTHLY', base: 8500, trend: 15, vol: 300 },
  { code: 'rebar', name: '螺纹钢', category: 'COMMODITY', country: 'CN', unit: '元/吨', frequency: 'MONTHLY', base: 3800, trend: -5, vol: 150 },
  { code: 'gold', name: '黄金', category: 'COMMODITY', country: 'GLOBAL', unit: '美元/盎司', frequency: 'MONTHLY', base: 1900, trend: 8, vol: 40 },
  { code: 'csi300_vol', name: '沪深300波动率', category: 'SENTIMENT', country: 'CN', unit: '%', frequency: 'MONTHLY', base: 18, trend: 0, vol: 4 },
  { code: 'northbound_flow', name: '北向资金净流入', category: 'SENTIMENT', country: 'CN', unit: '亿元', frequency: 'MONTHLY', base: 50, trend: 0, vol: 80 },
  { code: 'margin_balance', name: '融资余额', category: 'SENTIMENT', country: 'CN', unit: '亿元', frequency: 'MONTHLY', base: 15000, trend: 20, vol: 300 },
]

const INTEL_TEMPLATES = [
  // INDUSTRY_TRACK
  { category: 'INDUSTRY_TRACK', sectorCode: 'SEMICONDUCTOR', title: '半导体设备国产化率持续提升，北方华创订单饱满', summary: '根据渠道调研，国内半导体设备厂商订单持续饱满，北方华创刻蚀设备已进入多家晶圆厂验证阶段。', content: '## 核心要点\n\n根据近期对半导体设备产业链的调研：\n\n1. **北方华创**刻蚀设备已在中芯国际14nm产线通过验证\n2. 国产设备整体导入率从去年的15%提升至25%\n3. 预计2025年底有望突破30%\n\n## 投资建议\n\n关注国产替代逻辑下的设备龙头，重点跟踪订单确认节奏。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'SEMICONDUCTOR', title: '存储芯片价格企稳回升，库存去化接近尾声', summary: 'DRAM和NAND价格连续两个月环比上涨，产业链库存水位回归健康。', content: '## 调研结论\n\n- DRAM合约价Q4环比上涨8-10%\n- NAND合约价环比上涨5-8%\n- 下游手机和服务器需求同步改善\n- 三星、SK海力士减产效果显现\n\n库存周期拐点基本确认，看好韦尔股份等设计公司业绩弹性。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'NEV', title: '比亚迪12月销量创历史新高，新能源渗透率突破45%', summary: '比亚迪单月销量突破34万辆，全年销量有望达到350万辆。国内新能源渗透率持续攀升。', content: '## 销量数据\n\n- 比亚迪12月销量：34.2万辆（+45% YoY）\n- 其中纯电：18.5万辆\n- 插混：15.7万辆\n- 出口：3.8万辆\n\n## 行业趋势\n\n新能源汽车渗透率已突破45%，预计2025年将达50%。混动车型增速快于纯电，比亚迪DM-i系列成为核心增长驱动力。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'NEV', title: '宁德时代发布神行超充电池，充电10分钟续航400km', summary: '宁德时代推出新一代超快充电池，充电速度大幅提升，有望加速新能源汽车普及。', content: '技术突破要点：\n\n1. 4C超快充，10分钟充电400km\n2. 能量密度提升至200Wh/kg\n3. 循环寿命超3000次\n4. 预计2025年Q2量产\n\n对产业链影响：利好正极材料和电解液供应商。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'AI_COMPUTING', title: 'AI服务器需求爆发，光模块供不应求', summary: '中际旭创800G光模块产能满载，订单排到明年Q2，海外头部云厂商持续加单。', content: '## 产业链跟踪\n\n- 800G光模块需求量环比增长50%\n- 中际旭创、新易盛产能利用率超100%\n- 价格端保持稳定，毛利率有望维持30%以上\n- 1.6T产品研发顺利，预计2025年下半年量产\n\n## 投资逻辑\n\nAI算力基础设施建设持续超预期，光模块环节确定性最高。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'AI_COMPUTING', title: '国产GPU进展追踪：海光DCU三代产品性能逼近A100', summary: '海光信息新一代DCU产品在推理场景下性能达到A100的80%，获得多家互联网公司采购意向。', content: '根据海光信息内部交流：\n\n1. 深算三号训练性能达A100的60%，推理达80%\n2. 软件生态持续完善，适配主流深度学习框架\n3. 互联网头部客户开始规模采购\n4. 预计2025年出货量翻倍\n\n国产GPU替代逻辑持续强化。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'PHARMA', title: '恒瑞医药创新药出海再获突破，PD-1海外三期读出', summary: '恒瑞医药PD-1抑制剂海外三期临床达到主要终点，有望成为首个进入美国市场的国产PD-1。', content: '## 临床数据\n\n- 卡瑞利珠单抗联合化疗vs化疗一线治疗nsNSCLC\n- OS HR=0.72，P<0.001\n- PFS HR=0.56\n- 安全性可控\n\n## 商业化展望\n\n预计2025年申报FDA，2026年有望获批。全球PD-1市场规模超500亿美元。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'PHARMA', title: '医疗器械出海加速，迈瑞医疗海外收入占比持续提升', summary: '迈瑞医疗海外市场增速超30%，超声、监护仪等核心产品在欧美市场份额持续提升。', content: '迈瑞医疗海外业务跟踪：\n\n- 海外收入占比提升至42%\n- 超声产品海外增速40%+\n- 监护仪全球市占率提升至15%\n- 新兴市场和发达市场同步放量\n\n长期看好国产医疗器械全球化趋势。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'CONSUMER_ELECTRONICS', title: 'Apple Vision Pro产业链跟踪：立讯精密获得核心代工份额', summary: '立讯精密成为Vision Pro主要代工厂，预计2025年MR设备出货量达200-300万台。', content: '## MR产业链更新\n\n- 立讯精密获得Vision Pro 60%代工份额\n- 歌尔股份负责光学模组\n- 舜宇光学供应Pancake镜片\n\n## 出货预期\n\n- 2024年：50万台\n- 2025年：200-300万台（低价版本推出）\n\nMR有望成为下一个消费电子大品类。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'CONSUMER_ELECTRONICS', title: '传音控股非洲市场份额稳固，印度市场快速增长', summary: '传音在非洲智能机市场份额超40%，印度市场跻身前五，新兴市场战略成效显著。', content: '传音控股渠道调研要点：\n\n1. 非洲智能机市场份额41%，功能机超60%\n2. 印度市场份额提升至8%，排名第五\n3. 东南亚市场开始布局\n4. 本地化运营能力构成核心壁垒\n\n新兴市场消费升级逻辑持续兑现。' },

  // POLICY_RUMOR
  { category: 'POLICY_RUMOR', sectorCode: 'SEMICONDUCTOR', title: '传闻：大基金三期即将启动，总规模或超3000亿', summary: '市场传闻国家集成电路产业投资基金三期正在筹备中，规模有望超过前两期之和。', content: '## 传闻要点\n\n- 大基金三期总规模或达3000-5000亿元\n- 重点投向先进制程、设备和材料\n- 预计2024年底或2025年初正式成立\n- 社会资本配套有望带动万亿级投资\n\n**注意：此为市场传闻，尚未官方确认。**' },
  { category: 'POLICY_RUMOR', sectorCode: 'NEV', title: '新能源汽车购置税减免政策有望延续至2027年', summary: '据知情人士透露，新能源汽车购置税减免政策将再延续两年至2027年底。', content: '政策传闻：\n\n1. 购置税减免政策将延续至2027年12月31日\n2. 限额可能从3万元降至2万元\n3. 插混车型继续享受优惠\n4. 预计近期将正式发文\n\n如政策落地，将继续支撑新能源汽车销量增长。' },
  { category: 'POLICY_RUMOR', sectorCode: 'AI_COMPUTING', title: '传闻美国将收紧对华AI芯片出口管制范围', summary: '据外媒报道，美国商务部正在考虑进一步限制对华AI芯片及相关技术的出口。', content: '## 政策风险\n\n- 限制范围可能扩大至推理芯片\n- H20等降规格产品可能被纳入管制\n- 预计2025年Q1出台新规\n\n## 影响评估\n\n- 短期利空英伟达中国业务\n- 中长期利好海光、寒武纪等国产替代\n- 需密切关注具体执行细节\n\n**建议：加大对国产GPU产业链的配置。**' },
  { category: 'POLICY_RUMOR', sectorCode: 'PHARMA', title: '传闻医保谈判创新药降幅将收窄，鼓励创新导向更明确', summary: '据参与谈判的药企反馈，2024年医保谈判创新药平均降幅可能从60%收窄至40%以内。', content: '医保谈判传闻：\n\n1. 创新药降幅有望收窄\n2. 续约规则更加透明\n3. 创新程度高的药品给予更优价格\n4. 罕见病药物可能简化谈判流程\n\n如降幅收窄，将显著改善创新药企盈利预期。利好恒瑞医药、百济神州等。' },
  { category: 'POLICY_RUMOR', sectorCode: 'CONSUMER_ELECTRONICS', title: '传闻消费电子以旧换新补贴将扩大至手机和平板', summary: '消费电子以旧换新政策或将从家电扩展到手机、平板等品类，补贴力度有望加大。', content: '政策传闻：\n\n- 以旧换新范围扩大至手机、平板、笔记本\n- 单台补贴300-500元\n- 预计刺激3000万台换机需求\n- 2025年Q1可能出台细则\n\n利好立讯精密、歌尔股份等苹果产业链公司。' },

  // MEETING_MINUTES
  { category: 'MEETING_MINUTES', sectorCode: 'SEMICONDUCTOR', title: '中芯国际管理层交流纪要：产能利用率恢复至85%', summary: '与中芯国际IR交流，公司表示产能利用率已恢复至85%，预计Q4进一步提升。', content: '## 交流要点\n\n1. **产能利用率**：Q3达85%，Q4目标90%+\n2. **收入指引**：Q4环比增长5-7%\n3. **资本开支**：全年75亿美元，维持不变\n4. **先进制程**：N+1/N+2持续推进\n5. **客户结构**：国内客户收入占比达80%\n\n## 分析师观点\n\n行业复苏趋势确认，中芯国际作为国内代工龙头将充分受益。维持\"增持\"评级。' },
  { category: 'MEETING_MINUTES', sectorCode: 'NEV', title: '比亚迪战略规划交流：2025年目标500万辆', summary: '参加比亚迪内部战略交流会，公司制定2025年500万辆销售目标，海外市场是重点突破方向。', content: '## 战略要点\n\n1. **销量目标**：2025年500万辆（含出口）\n2. **海外市场**：目标出口60万辆，重点布局东南亚、欧洲\n3. **产品规划**：将推出3款全新车型\n4. **技术路线**：DM-i 5.0超级混动将发布\n5. **智能驾驶**：加大研发投入，2025年实现城区NOA\n\n看好比亚迪全球化和智能化双重驱动。' },
  { category: 'MEETING_MINUTES', sectorCode: 'AI_COMPUTING', title: '中际旭创电话会议纪要：800G光模块明年收入翻倍', summary: '参加中际旭创业绩交流电话会议，管理层对800G光模块需求持乐观态度。', content: '## 电话会核心内容\n\n1. **800G光模块**：2024年收入占比超40%，2025年翻倍\n2. **1.6T进展**：样品已送主要客户验证，预计H2量产\n3. **产能扩张**：铜陵新工厂2025年Q1投产\n4. **毛利率**：800G毛利率30%+，1.6T初期可能更高\n5. **客户结构**：海外大客户占比超60%\n\n光模块行业高景气度持续，维持强烈推荐。' },
  { category: 'MEETING_MINUTES', sectorCode: 'PHARMA', title: '药明康德年度策略交流：CXO行业见底回升', summary: '参加药明康德投资者开放日，管理层表示全球CXO行业需求已见底，2025年有望恢复增长。', content: '## 交流纪要\n\n1. **行业趋势**：全球生物医药融资回暖，CXO需求企稳\n2. **订单情况**：新签订单Q3环比增长15%\n3. **产能布局**：海外产能继续扩张\n4. **合规风险**：积极应对生物安全法案\n5. **收入指引**：2025年恢复双位数增长\n\n投资建议：CXO板块估值处于历史低位，建议逢低布局。' },
  { category: 'MEETING_MINUTES', sectorCode: 'CONSUMER_ELECTRONICS', title: '歌尔股份投资者交流：VR/MR业务迎来拐点', summary: '与歌尔股份管理层交流，公司VR/MR业务已走出低谷，2025年有望恢复高增长。', content: '## 交流要点\n\n1. **VR/MR业务**：Q3收入环比增长30%\n2. **Meta Quest**：新一代产品将贡献主要增量\n3. **Apple Vision Pro**：光学模组已量产\n4. **声学业务**：TWS耳机保持稳定增长\n5. **利润率**：产品结构优化带动毛利率改善\n\n看好歌尔在MR元宇宙赛道的卡位优势。' },

  // More entries to fill to ~50
  { category: 'INDUSTRY_TRACK', sectorCode: 'SEMICONDUCTOR', title: '功率半导体需求回暖，新能源车和光伏驱动增长', summary: '车规级IGBT和碳化硅MOSFET需求强劲，供给端产能持续扩张。', content: '功率半导体调研：\n\n- 车规IGBT需求增速30%+\n- SiC MOSFET渗透率提升至15%\n- 国产厂商份额持续提升\n- 价格端趋于稳定' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'NEV', title: '固态电池产业化进程加速，多家企业宣布量产计划', summary: '固态电池技术路线逐渐明朗，预计2026-2027年实现半固态电池大规模量产。', content: '固态电池产业进展：\n\n1. 宁德时代半固态电池2025年量产\n2. 清陶能源获上汽定点\n3. 丰田全固态电池2027-2028年量产\n4. 硫化物路线和氧化物路线并行发展' },
  { category: 'POLICY_RUMOR', sectorCode: 'AI_COMPUTING', title: '传闻国家将出台AI算力基础设施建设专项规划', summary: '据悉相关部委正在制定AI算力基础设施中长期发展规划，总投资或超万亿。', content: '传闻要点：\n\n- AI算力纳入新型基础设施建设重点\n- 目标2027年总算力规模翻番\n- 财政补贴+专项债支持\n- 鼓励国产芯片和软件生态建设' },
  { category: 'MEETING_MINUTES', sectorCode: 'SEMICONDUCTOR', title: '韦尔股份策略交流：CIS芯片需求拐点确认', summary: '韦尔股份管理层表示CMOS图像传感器需求已回暖，手机和汽车双轮驱动。', content: '交流纪要：\n\n1. 手机CIS：高端48M/50M放量\n2. 汽车CIS：ADAS渗透率提升带动需求\n3. 安防CIS：AI需求带来增量\n4. 毛利率改善至30%+' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'CONSUMER_ELECTRONICS', title: 'AI手机渗透率快速提升，端侧AI芯片成新竞争焦点', summary: 'AI手机出货量占比快速提升至20%，预计2025年将达35%。', content: 'AI手机追踪：\n\n- 高通骁龙8 Gen3/联发科天玑9300支持端侧大模型\n- 三星、OPPO、小米加速推出AI功能\n- 端侧AI对存储要求提升（12GB+RAM成标配）\n- 利好产业链：内存、SoC、光学模组' },
  { category: 'POLICY_RUMOR', sectorCode: 'PHARMA', title: '传闻DRG/DIP支付改革将设创新医疗器械豁免目录', summary: '据参与政策制定的专家透露，创新医疗器械有望获得DRG豁免，利好迈瑞医疗等龙头。', content: '政策传闻：\n\n1. DRG/DIP改革将设豁免目录\n2. 创新医疗器械纳入豁免范围\n3. 减轻创新产品进院阻力\n4. 预计2025年上半年试点' },
  { category: 'MEETING_MINUTES', sectorCode: 'NEV', title: '宁德时代供应商大会纪要：2025年出货目标400GWh', summary: '参加宁德时代年度供应商大会，公司披露2025年出货目标和产能规划。', content: '大会要点：\n\n1. 2025年出货目标400GWh\n2. 海外产能匈牙利工厂2025年投产\n3. 钠离子电池开始规模出货\n4. 储能业务目标翻倍' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'AI_COMPUTING', title: 'DeepSeek等国产大模型突破，训练成本大幅下降', summary: '国产大模型技术快速迭代，训练成本下降90%，推理效率大幅提升。', content: 'AI大模型进展：\n\n- DeepSeek-V3性能接近GPT-4\n- 训练成本仅500万美元\n- MoE架构大幅降低推理成本\n- 开源模型生态加速发展\n\n利好国内AI应用落地和算力需求。' },
  { category: 'INDUSTRY_TRACK', sectorCode: 'PHARMA', title: '百济神州泽布替尼全球销售突破20亿美元', summary: '百济神州核心产品泽布替尼全球化进展顺利，年化销售额突破20亿美元里程碑。', content: '泽布替尼商业化更新：\n\n1. Q3单季销售6.2亿美元\n2. 年化销售突破20亿美元\n3. 美国市场份额超过伊布替尼\n4. 欧洲和日本市场快速增长\n\n中国创新药出海标杆案例。' },
  { category: 'MEETING_MINUTES', sectorCode: 'CONSUMER_ELECTRONICS', title: '立讯精密管理层交流：AI服务器连接器业务爆发', summary: '立讯精密新增长极浮现，AI服务器高速连接器业务收入翻倍增长。', content: '交流纪要：\n\n1. AI服务器连接器收入同比翻倍\n2. 获得英伟达GB200供应链份额\n3. 消费电子业务保持稳定\n4. 汽车业务增速30%\n5. 整体毛利率改善趋势明确' },
]

async function main() {
  console.log('Seeding database...')

  // Clean existing data
  await prisma.macroDataPoint.deleteMany()
  await prisma.macroIndicator.deleteMany()
  await prisma.watchlistItem.deleteMany()
  await prisma.valuationData.deleteMany()
  await prisma.financialData.deleteMany()
  await prisma.stock.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.intelligenceTag.deleteMany()
  await prisma.intelligenceSector.deleteMany()
  await prisma.intelligenceStock.deleteMany()
  await prisma.intelligence.deleteMany()
  await prisma.tag.deleteMany()

  // 1. Create Tags
  console.log('Creating tags...')
  const tags = await Promise.all(
    TAGS_DATA.map((t) => prisma.tag.create({ data: t }))
  )

  // 2. Create Stocks
  console.log('Creating stocks...')
  for (const s of STOCKS_DATA) {
    await prisma.stock.create({
      data: {
        symbol: s.symbol,
        name: s.name,
        market: s.market,
        sectorCode: s.sectorCode,
        sectorName: s.sectorName,
      },
    })
  }

  // 3. Create Intelligence
  console.log('Creating intelligence entries...')
  for (let i = 0; i < INTEL_TEMPLATES.length; i++) {
    const t = INTEL_TEMPLATES[i]
    const dayOffset = randInt(1, 90)
    const createdAt = daysAgo(dayOffset)

    const sectorData = SECTORS_DATA.find((s) => s.code === t.sectorCode)!
    const relatedStocks = STOCKS_DATA.filter((s) => s.sectorCode === t.sectorCode)
    const pickedStocks = pickN(relatedStocks, randInt(0, 2))
    const pickedTags = pickN(tags, randInt(2, 4))

    await prisma.intelligence.create({
      data: {
        title: t.title,
        content: t.content,
        summary: t.summary,
        category: t.category,
        importance: Math.min(5, Math.max(1, Math.round(normalRand(3, 1)))),
        source: pick(['产业链调研', '专家访谈', '公司公告', '行业会议', '渠道反馈', '内部研究']),
        authorName: pick(['张明', '李华', '王晨', '陈思远', '刘倩', '赵一帆']),
        createdAt,
        updatedAt: createdAt,
        sectors: {
          create: [{ sectorCode: sectorData.code, sectorName: sectorData.name }],
        },
        stocks: {
          create: pickedStocks.map((s) => ({
            stockSymbol: s.symbol,
            stockName: s.name,
          })),
        },
        tags: {
          create: pickedTags.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
    })
  }

  // 4. Create Financial Data
  console.log('Creating financial data...')
  const periods = [
    { period: '2023Q1', date: '2023-03-31' },
    { period: '2023Q2', date: '2023-06-30' },
    { period: '2023Q3', date: '2023-09-30' },
    { period: '2023Q4', date: '2023-12-31' },
    { period: '2024Q1', date: '2024-03-31' },
    { period: '2024Q2', date: '2024-06-30' },
    { period: '2024Q3', date: '2024-09-30' },
    { period: '2024Q4', date: '2024-12-31' },
  ]

  for (const stock of STOCKS_DATA) {
    const revSeries = generateTimeSeries(stock.baseRevenue, stock.baseRevenue * 0.02, stock.baseRevenue * 0.05, 8)
    const marginSeries = generateTimeSeries(stock.baseMargin, 0.1, 1.5, 8)

    for (let q = 0; q < periods.length; q++) {
      const revenue = revSeries[q]
      const grossMargin = Math.max(5, Math.min(95, marginSeries[q]))
      const netMargin = grossMargin * rand(0.2, 0.5)
      const netProfit = revenue * netMargin / 100
      const totalAssets = revenue * rand(2, 5)
      const totalEquity = totalAssets * rand(0.4, 0.7)
      const totalDebt = totalAssets - totalEquity
      const roe = (netProfit / totalEquity) * 100
      const roa = (netProfit / totalAssets) * 100
      const assetTurnover = revenue / totalAssets
      const equityMultiplier = totalAssets / totalEquity

      await prisma.financialData.create({
        data: {
          stockSymbol: stock.symbol,
          period: periods[q].period,
          periodDate: periods[q].date,
          revenue: parseFloat(revenue.toFixed(2)),
          revenueYoy: parseFloat((rand(-10, 30)).toFixed(2)),
          grossMargin: parseFloat(grossMargin.toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          netProfitYoy: parseFloat((rand(-20, 50)).toFixed(2)),
          roe: parseFloat(roe.toFixed(2)),
          roa: parseFloat(roa.toFixed(2)),
          capex: parseFloat((revenue * rand(0.05, 0.25)).toFixed(2)),
          operatingCF: parseFloat((netProfit * rand(0.8, 1.5)).toFixed(2)),
          totalAssets: parseFloat(totalAssets.toFixed(2)),
          totalEquity: parseFloat(totalEquity.toFixed(2)),
          totalDebt: parseFloat(totalDebt.toFixed(2)),
          assetTurnover: parseFloat(assetTurnover.toFixed(4)),
          equityMultiplier: parseFloat(equityMultiplier.toFixed(4)),
          netMargin: parseFloat(netMargin.toFixed(2)),
        },
      })
    }
  }

  // 5. Create Valuation Data (weekly for 3 months ~= 13 weeks)
  console.log('Creating valuation data...')
  for (const stock of STOCKS_DATA) {
    const basePE = stock.basePE
    const basePrice = rand(20, 300)
    const peSeries = generateTimeSeries(basePE, 0, basePE * 0.05, 13)
    const priceSeries = generateTimeSeries(basePrice, basePrice * 0.005, basePrice * 0.03, 13)

    for (let w = 0; w < 13; w++) {
      const d = daysAgo(90 - w * 7)
      const pe = Math.max(5, peSeries[w])
      const price = Math.max(1, priceSeries[w])
      const pb = pe * rand(0.05, 0.15)
      const ps = pe * rand(0.1, 0.5)

      await prisma.valuationData.create({
        data: {
          stockSymbol: stock.symbol,
          date: dateStr(d),
          pe: parseFloat(pe.toFixed(2)),
          pb: parseFloat(pb.toFixed(2)),
          ps: parseFloat(ps.toFixed(2)),
          marketCap: parseFloat((price * rand(10, 50)).toFixed(2)),
          price: parseFloat(price.toFixed(2)),
        },
      })
    }
  }

  // 6. Create default watchlist
  console.log('Creating default watchlist...')
  const watchlistStocks = ['002594.SZ', '300750.SZ', '688981.SH', '688256.SH', '600276.SH', '002475.SZ']
  for (let i = 0; i < watchlistStocks.length; i++) {
    await prisma.watchlistItem.create({
      data: {
        userId: 'default',
        stockSymbol: watchlistStocks[i],
        sortOrder: i,
      },
    })
  }

  // 7. Create Macro Indicators and Data
  console.log('Creating macro indicators and data...')
  for (const ind of MACRO_INDICATORS) {
    await prisma.macroIndicator.create({
      data: {
        code: ind.code,
        name: ind.name,
        category: ind.category,
        country: ind.country,
        unit: ind.unit,
        frequency: ind.frequency,
        description: `${ind.name}，频率：${ind.frequency === 'MONTHLY' ? '月度' : ind.frequency === 'QUARTERLY' ? '季度' : '日度'}`,
      },
    })

    const values = generateTimeSeries(ind.base, ind.trend, ind.vol, 60)
    for (let m = 0; m < 60; m++) {
      const d = monthsAgo(60 - m)
      await prisma.macroDataPoint.create({
        data: {
          indicatorCode: ind.code,
          date: dateStr(d),
          value: values[m],
        },
      })
    }
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
