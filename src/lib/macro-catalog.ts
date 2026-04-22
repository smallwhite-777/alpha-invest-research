import type { MacroCategory } from '@/lib/constants'

export type MacroFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type MacroSourceCandidate =
  | { type: 'long'; file: string; key: string }
  | { type: 'wide'; file: string; column: string }

export interface MacroCatalogEntry {
  id: string
  code: string
  name: string
  category: MacroCategory
  unit: string
  frequency: MacroFrequency
  source: string
  description?: string
  sourceCandidates: MacroSourceCandidate[]
}

export const MACRO_CATALOG: MacroCatalogEntry[] = [
  {
    id: 'cn_cpi_yoy',
    code: 'CN_CPI_NT_YOY',
    name: '中国 CPI 同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_china_joint_chronos.csv',
    sourceCandidates: [{ type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_CPI_NT_YOY' }],
  },
  {
    id: 'cn_ppi_yoy',
    code: 'CN_PPI_YOY',
    name: '中国 PPI 同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_china_joint_chronos.csv',
    sourceCandidates: [{ type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_PPI_YOY' }],
  },
  {
    id: 'cn_m2_yoy',
    code: 'CN_M2_YOY',
    name: '中国 M2 同比',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_china_joint_chronos.csv',
    sourceCandidates: [{ type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_M2_YOY' }],
  },
  {
    id: 'cn_m1_yoy',
    code: 'CN_M1_YOY',
    name: '中国 M1 同比',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_china_joint_chronos.csv',
    sourceCandidates: [{ type: 'long', file: 'us_china_joint_chronos.csv', key: 'CN_M1_YOY' }],
  },
  {
    id: 'cn_pmi',
    code: 'PMI_CHN',
    name: '中国制造业 PMI',
    category: 'ECONOMIC',
    unit: '点',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/china_macro/china_macro_monthly_clean.csv',
    sourceCandidates: [{ type: 'long', file: 'china_macro/china_macro_monthly_clean.csv', key: 'PMI_CHN' }],
  },
  {
    id: 'cn_gdp_yoy',
    code: 'GDP_CHN_YOY',
    name: '中国 GDP 同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'quarterly',
    source: 'timesfm_deploy/data/china_macro/china_macro_monthly_clean.csv',
    sourceCandidates: [{ type: 'long', file: 'china_macro/china_macro_monthly_clean.csv', key: 'GDP_CHN_YOY' }],
  },
  {
    id: 'cn_ip_yoy',
    code: 'IP_CHN_YOY',
    name: '中国工业增加值同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/china_macro/china_macro_monthly_clean.csv',
    sourceCandidates: [{ type: 'long', file: 'china_macro/china_macro_monthly_clean.csv', key: 'IP_CHN_YOY' }],
  },
  {
    id: 'cn_retail_yoy',
    code: 'RS_CHN_YOY',
    name: '中国社零同比',
    category: 'ECONOMIC',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/china_macro/china_macro_monthly_clean.csv',
    sourceCandidates: [{ type: 'long', file: 'china_macro/china_macro_monthly_clean.csv', key: 'RS_CHN_YOY' }],
  },
  {
    id: 'cn_repo7d',
    code: 'REPO7D_CHN',
    name: '中国 7 天回购利率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'daily',
    source: 'timesfm_deploy/data/china_macro/china_macro_daily.csv',
    sourceCandidates: [
      { type: 'long', file: 'china_macro/china_macro_daily.csv', key: 'REPO7D_CHN' },
      { type: 'long', file: 'china_macro/china_macro_monthly_clean.csv', key: 'REPO7D_CHN' },
    ],
  },
  {
    id: 'cn_10y',
    code: 'TREASURY10Y_CHN',
    name: '中国 10 年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'daily',
    source: 'timesfm_deploy/data/china_macro/china_macro_daily.csv',
    sourceCandidates: [
      { type: 'long', file: 'china_macro/china_macro_daily.csv', key: 'TREASURY10Y_CHN' },
      { type: 'long', file: 'china_macro/china_macro_monthly_clean.csv', key: 'TREASURY10Y_CHN' },
    ],
  },
  {
    id: 'us_fed_funds',
    code: 'US_DFF_M',
    name: '美国联邦基金利率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [
      { type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'DFF_M' },
      { type: 'wide', file: 'us_macro/us_macro_fred_daily.csv', column: 'DFF' },
    ],
  },
  {
    id: 'us_10y',
    code: 'US_DGS10_M',
    name: '美国 10 年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [
      { type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'DGS10_M' },
      { type: 'wide', file: 'us_macro/us_macro_fred_daily.csv', column: 'DGS10' },
    ],
  },
  {
    id: 'us_2y',
    code: 'US_DGS2_M',
    name: '美国 2 年国债收益率',
    category: 'MONETARY',
    unit: '%',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [
      { type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'DGS2_M' },
      { type: 'wide', file: 'us_macro/us_macro_fred_daily.csv', column: 'DGS2' },
    ],
  },
  {
    id: 'us_m2',
    code: 'US_M2SL_M',
    name: '美国 M2',
    category: 'MONETARY',
    unit: '十亿美元',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [{ type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'M2SL_M' }],
  },
  {
    id: 'us_pce',
    code: 'US_PCECTPI_M',
    name: '美国 PCE 物价指数',
    category: 'ECONOMIC',
    unit: '指数',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [
      { type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'PCECTPI_M' },
      { type: 'wide', file: 'us_macro/us_macro_fred_daily.csv', column: 'PCECTPI' },
    ],
  },
  {
    id: 'us_dxy_broad',
    code: 'US_DTWEXBGS_M',
    name: '美元广义指数',
    category: 'SENTIMENT',
    unit: '指数',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [
      { type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'DTWEXBGS_M' },
      { type: 'wide', file: 'us_macro/us_macro_fred_daily.csv', column: 'DTWEXBGS' },
    ],
  },
  {
    id: 'oil_brent',
    code: 'US_DCOILBRENTEU_M',
    name: '布伦特原油',
    category: 'COMMODITY',
    unit: '美元/桶',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [
      { type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'DCOILBRENTEU_M' },
      { type: 'wide', file: 'us_macro/us_macro_fred_daily.csv', column: 'DCOILBRENTEU' },
    ],
  },
  {
    id: 'us_balance_sheet',
    code: 'US_WALCL_M',
    name: '美联储总资产',
    category: 'MONETARY',
    unit: '百万美元',
    frequency: 'monthly',
    source: 'timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv',
    sourceCandidates: [
      { type: 'wide', file: 'us_macro/us_macro_fred_monthly.csv', column: 'WALCL_M' },
      { type: 'wide', file: 'us_macro/us_macro_fred_daily.csv', column: 'WALCL' },
    ],
  },
]
