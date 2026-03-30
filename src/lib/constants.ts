export const SECTORS = [
  { code: 'SEMICONDUCTOR', name: '半导体', color: '#3b82f6' },
  { code: 'NEV', name: '新能源车', color: '#00d4aa' },
  { code: 'AI_COMPUTING', name: 'AI算力', color: '#a855f7' },
  { code: 'PHARMA', name: '医药', color: '#f59e0b' },
  { code: 'CONSUMER_ELECTRONICS', name: '消费电子', color: '#ef4444' },
] as const

export type SectorCode = (typeof SECTORS)[number]['code']

export const INTELLIGENCE_CATEGORIES = [
  { value: 'INDUSTRY_TRACK', label: '产业链追踪' },
  { value: 'POLICY_RUMOR', label: '政策传闻' },
  { value: 'MEETING_MINUTES', label: '会议纪要' },
  { value: 'RESEARCH_REPORT', label: '研究报告' },
  { value: 'GOSSIP', label: '段子' },
  { value: 'NEWS', label: '新闻' },
] as const

export type IntelligenceCategory = (typeof INTELLIGENCE_CATEGORIES)[number]['value']

export const IMPORTANCE_LEVELS = [
  { value: 1, label: '一般', color: '#555555' },
  { value: 2, label: '关注', color: '#3b82f6' },
  { value: 3, label: '重要', color: '#f59e0b' },
  { value: 4, label: '紧急', color: '#ef4444' },
  { value: 5, label: '极重要', color: '#ff4757' },
] as const

export type ImportanceLevel = (typeof IMPORTANCE_LEVELS)[number]['value']

export const MACRO_CATEGORIES = [
  { value: 'ECONOMIC', label: '经济数据' },
  { value: 'MONETARY', label: '货币政策' },
  { value: 'COMMODITY', label: '大宗商品' },
  { value: 'SENTIMENT', label: '市场情绪' },
] as const

export type MacroCategory = (typeof MACRO_CATEGORIES)[number]['value']

// 申万行业分类 (一级行业)
export const SW_SECTORS = [
  { code: 'SW_BANK', name: '银行' },
  { code: 'SW_REALESTATE', name: '房地产' },
  { code: 'SW_ELECTRONICS', name: '电子' },
  { code: 'SW_COMPUTER', name: '计算机' },
  { code: 'SW_MEDIA', name: '传媒' },
  { code: 'SW_COMMUNICATION', name: '通信' },
  { code: 'SW_POWER_EQUIPMENT', name: '电力设备' },
  { code: 'SW_AUTO', name: '汽车' },
  { code: 'SW_MACHINERY', name: '机械设备' },
  { code: 'SW_PHARMA', name: '医药生物' },
  { code: 'SW_FOOD', name: '食品饮料' },
  { code: 'SW_HOUSEHOLD', name: '家用电器' },
  { code: 'SW_TEXTILE', name: '纺织服饰' },
  { code: 'SW_BUILDING', name: '建筑装饰' },
  { code: 'SW_MATERIAL', name: '建筑材料' },
  { code: 'SW_STEEL', name: '钢铁' },
  { code: 'SW_NONFERROUS', name: '有色金属' },
  { code: 'SW_CHEMICAL', name: '基础化工' },
  { code: 'SW_AGRICULTURE', name: '农林牧渔' },
  { code: 'SW_MILITARY', name: '国防军工' },
  { code: 'SW_UTILITY', name: '公用事业' },
  { code: 'SW_TRANSPORT', name: '交通运输' },
  { code: 'SW_COAL', name: '煤炭' },
  { code: 'SW_OIL', name: '石油石化' },
  { code: 'SW_ENV', name: '环保' },
  { code: 'SW_RETAIL', name: '商贸零售' },
  { code: 'SW_TOURISM', name: '社会服务' },
  { code: 'SW_BEAUTY', name: '美容护理' },
  { code: 'SW_SECURITIES', name: '非银金融' },
  { code: 'SW_DECORATION', name: '轻工制造' },
] as const

export type SwSectorCode = (typeof SW_SECTORS)[number]['code']

export const NAV_ITEMS = [
  { href: '/', label: '概览', icon: 'Home' },
  { href: '/intelligence', label: '情报看板', icon: 'Shield' },
  { href: '/stock', label: '个股看板', icon: 'BarChart3' },
  { href: '/macro', label: '宏观看板', icon: 'Globe' },
  { href: '/analyze', label: '智能分析', icon: 'FileText' },
  { href: '/news', label: '实时新闻', icon: 'Newspaper' },
  { href: '/research', label: '研报问答', icon: 'Search' },
] as const
