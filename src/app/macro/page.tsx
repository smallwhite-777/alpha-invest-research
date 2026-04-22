import { MacroPageClient } from '@/components/macro/MacroPageClient'
import { getLocalMacroData, getLocalMacroIndicators } from '@/lib/macro-local'

const SECTION_GROUPS = [
  { key: 'china', title: '中国', codes: ['CN_M2_YOY', 'PMI_CHN', 'CN_CPI_NT_YOY', 'CN_PPI_YOY', 'GDP_CHN_YOY', 'RS_CHN_YOY'] },
  { key: 'us', title: '美国', codes: ['US_DFF_M', 'US_DGS10_M', 'US_DGS2_M', 'US_M2SL_M', 'US_PCECTPI_M', 'US_DTWEXBGS_M'] },
  { key: 'liquidity', title: '流动性', codes: ['CN_M2_YOY', 'CN_M1_YOY', 'REPO7D_CHN', 'US_DFF_M', 'US_WALCL_M'] },
  { key: 'inflation', title: '通胀', codes: ['CN_CPI_NT_YOY', 'CN_PPI_YOY', 'US_PCECTPI_M', 'US_DCOILBRENTEU_M'] },
  { key: 'rates', title: '利率', codes: ['REPO7D_CHN', 'TREASURY10Y_CHN', 'US_DFF_M', 'US_DGS10_M', 'US_DGS2_M'] },
  { key: 'commodities', title: '大宗', codes: ['US_DCOILBRENTEU_M', 'CN_PPI_YOY', 'PMI_CHN'] },
]

const DEFAULT_COMPARE_CODES = ['CN_M2_YOY', 'US_DGS10_M']

export default async function MacroPage() {
  const allCodes = Array.from(new Set(SECTION_GROUPS.flatMap((group) => group.codes)))
  const [initialMacroGroups, initialComparisonGroups] = await Promise.all([
    getLocalMacroData(allCodes, { limit: 120 }),
    getLocalMacroData(DEFAULT_COMPARE_CODES, { limit: 120 }),
  ])
  const initialIndicators = getLocalMacroIndicators()

  return (
    <MacroPageClient
      initialIndicators={initialIndicators}
      initialMacroGroups={initialMacroGroups}
      initialComparisonGroups={initialComparisonGroups}
    />
  )
}
