# 财务指标中英对照字典
# Financial Indicators Chinese-English Dictionary

---

## 一、基本信息字段 / Basic Information Fields

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| Stkcd | 证券代码 | Stock Code | 以沪、深、北证券交易所公布的证券代码为准 |
| ShortName | 证券简称 | Short Name / Stock Short Name | 证券简称 |
| Accper | 统计截止日期 | Reporting Date / Accounting Period End Date | 会计报表日，格式如1999-12-31 |
| Typrep | 报表类型 | Report Type | A＝合并报表(Consolidated)；B＝母公司报表(Parent Company) |
| IfCorrect | 是否发生差错更正 | Whether Error Correction Occurred | 0：否；1：是 |
| DeclareDate | 差错更正披露日期 | Error Correction Disclosure Date | 差错更正公告的披露日期 |
| Indcd | 行业代码 | Industry Code | 证监会行业分类2012年版 |
| Indnme | 行业名称 | Industry Name | 2012年证监会行业分类名称 |
| Indcd1 | 行业代码1 | Industry Code (CPA) | 中国上市公司协会行业分类代码 |
| Indnme1 | 行业名称1 | Industry Name (CPA) | 中国上市公司协会行业分类名称 |
| Source | 公告来源 | Announcement Source | 0：定期报告；1：IPO公告 |

---

## 二、资产负债表项目 / Balance Sheet Items

### 2.1 流动资产 / Current Assets

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| A001101000 | 货币资金 | Cash and Cash Equivalents | 库存现金、银行结算户存款、外埠存款等 |
| A0d1101101 | 其中:客户资金存款 | Customer Deposits (Financial) | 金融企业的客户资金存款数 |
| A0d1102000 | 结算备付金 | Settlement Funds | 证券业务清算与交收款 |
| A0d1102101 | 其中：客户备付金 | Customer Settlement Funds | 证券经纪业务取得的客户备付金 |
| A0b1103000 | 现金及存放中央银行款项 | Cash and Deposits with Central Bank | 持有的现金、存放中央银行款项 |
| A0b1104000 | 存放同业款项 | Interbank Deposits | 存放于其他银行的款项 |
| A0b1105000 | 贵金属 | Precious Metals | 黄金、白银等贵金属存货 |
| A0f1106000 | 拆出资金净额 | Net Funds Lent | 拆借给其他金融机构的款项 |
| A001107000 | 交易性金融资产 | Trading Financial Assets | 为交易目的持有的金融资产 |
| A0f1108000 | 衍生金融资产 | Derivative Financial Assets | 衍生工具、套期工具等 |
| A001109000 | 短期投资净额 | Net Short-term Investments | 短期投资与跌价准备之差额 |
| A001110000 | 应收票据净额 | Net Notes Receivable | 应收票据与坏账准备之差额 |
| A001111000 | 应收账款净额 | Net Accounts Receivable | 应收账款与坏账准备之差额 |
| A001127000 | 应收款项融资 | Receivables Financing | 出售给银行但有追索权的应收款项 |
| A001112000 | 预付款项净额 | Net Prepayments | 预付给供应单位的款项 |
| A0i1113000 | 应收保费净额 | Net Premiums Receivable | 保险企业应收保费 |
| A0i1114000 | 应收分保账款净额 | Net Reinsurance Receivables | 再保险业务应收款项 |
| A0i1115000 | 应收代位追偿款净额 | Net Subrogation Recoveries | 代位追偿权产生的应收款 |
| A0i1116000 | 应收分保合同准备金净额 | Net Reinsurance Contract Reserves | 再保险未到期责任准备金 |
| A0i1116101 | 其中:应收分保未到期责任准备金净额 | Unearned Premium Reserves (Reinsurance) | 分出的未赚保费 |
| A0i1116201 | 其中:应收分保未决赔款准备金净额 | Outstanding Claims Reserves (Reinsurance) | 再保险未决赔款准备金 |
| A0i1116301 | 其中:应收分保寿险责任准备金净额 | Life Insurance Reserves (Reinsurance) | 再保险寿险责任准备金 |
| A0i1116401 | 其中:应收分保长期健康险责任准备金净额 | Long-term Health Insurance Reserves (Reinsurance) | 长期健康险责任准备金 |
| A001119000 | 应收利息净额 | Net Interest Receivable | 债权投资应收取的利息 |
| A001120000 | 应收股利净额 | Net Dividends Receivable | 股权投资应收取的现金股利 |
| A001121000 | 其他应收款净额 | Net Other Receivables | 其他应收及暂付款项 |
| A0f1122000 | 买入返售金融资产净额 | Net Securities Purchased under Resale Agreements | 按返售协议买入的金融资产 |
| A001123000 | 存货净额 | Net Inventory | 存货与跌价准备之差额 |
| A001128000 | 合同资产 | Contract Assets | 已向客户转让商品有权收取对价的权利 |
| A001124000 | 一年内到期的非流动资产 | Non-current Assets Due within One Year | 一年内到期的非流动资产账面价值 |
| A0d1126000 | 存出保证金 | Margin Deposits | 存出的各种保证金 |
| A001125000 | 其他流动资产 | Other Current Assets | 其他流动资产 |
| A001100000 | 流动资产合计 | Total Current Assets | 流动资产各项目合计 |

### 2.2 非流动资产 / Non-current Assets

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| A0i1224000 | 保户质押贷款净额 | Net Policyholder Secured Loans | 保险质押贷款 |
| A0i1225000 | 定期存款 | Time Deposits | 保险公司定期存款 |
| A0b1201000 | 发放贷款及垫款净额 | Net Loans and Advances | 发放的贷款和贴现资产 |
| A001226000 | 债权投资 | Debt Investments | 债券投资 |
| A001202000 | 可供出售金融资产净额 | Net Available-for-sale Financial Assets | 可供出售金融资产 |
| A001227000 | 其他债权投资 | Other Debt Investments | 除债券外的其他债权投资 |
| A001203000 | 持有至到期投资净额 | Net Held-to-maturity Investments | 持有至到期投资 |
| A001204000 | 长期应收款净额 | Net Long-term Receivables | 长期应收款项 |
| A001205000 | 长期股权投资净额 | Net Long-term Equity Investments | 长期股权投资 |
| A001228000 | 其他权益工具投资 | Investments in Other Equity Instruments | 非交易性权益工具投资 |
| A001229000 | 其他非流动金融资产 | Other Non-current Financial Assets | 其他非流动金融资产 |
| A001206000 | 长期债权投资净额 | Net Long-term Debt Investments | 长期债券投资 |
| A001207000 | 长期投资净额 | Net Long-term Investments | 长期投资合计 |
| A0i1209000 | 存出资本保证金 | Capital Margin Deposited | 按规定比例缴存的资本保证金 |
| A0i1210000 | 独立账户资产 | Separate Account Assets | 投资连结产品独立账户资产 |
| A001211000 | 投资性房地产净额 | Net Investment Property | 赚取租金或资本增值的房地产 |
| A001212000 | 固定资产净额 | Net Fixed Assets | 固定资产原价减累计折旧和减值准备 |
| A001213000 | 在建工程净额 | Net Construction in Progress | 未完工程的实际支出 |
| A001214000 | 工程物资 | Engineering Materials | 尚未使用的工程物资 |
| A001215000 | 固定资产清理 | Fixed Assets for Disposal | 尚未清理完毕的固定资产 |
| A001216000 | 生产性生物资产净额 | Net Productive Biological Assets | 为产出农产品持有的生物资产 |
| A001217000 | 油气资产净额 | Net Oil and Gas Assets | 矿区权益和油气井设施 |
| A001230000 | 使用权资产 | Right-of-use Assets | 承租人租赁资产的权利 |
| A001218000 | 无形资产净额 | Net Intangible Assets | 无形资产原价减摊销和减值准备 |
| A0d1218101 | 其中:交易席位费 | Trading Seat Fees | 证券公司交易席位费 |
| A001219000 | 开发支出 | Development Expenditure | 资本化后未结转无形资产的部分 |
| A001220000 | 商誉净额 | Net Goodwill | 企业合并形成的商誉 |
| A001221000 | 长期待摊费用 | Long-term Deferred Expenses | 摊销期限一年以上的费用 |
| A001222000 | 递延所得税资产 | Deferred Tax Assets | 可抵扣暂时性差异产生的递延税资产 |
| A0F1224000 | 代理业务资产 | Agency Business Assets | 不承担风险的代理业务资产 |
| A001223000 | 其他非流动资产 | Other Non-current Assets | 其他非流动资产合计 |
| A001200000 | 非流动资产合计 | Total Non-current Assets | 非流动资产合计 |
| A0f1300000 | 其他资产 | Other Assets | 金融企业披露的其他资产 |
| A001000000 | 资产总计 | Total Assets | 资产各项目总计 |

### 2.3 流动负债 / Current Liabilities

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| A002101000 | 短期借款 | Short-term Borrowings | 一年期以下的借款 |
| A0d2101101 | 其中:质押借款 | Pledged Borrowings | 质押方式融资获得的金额 |
| A0b2102000 | 向中央银行借款 | Borrowings from Central Bank | 向中央银行借入的款项 |
| A0b2103000 | 吸收存款及同业存放 | Deposits and Interbank Balances | 吸收的客户存款和同业存放 |
| A0b2103101 | 其中：同业及其他金融机构存放款项 | Interbank Deposits | 清算款项 |
| A0b2103201 | 其中：吸收存款 | Deposits | 吸收的其他各种存款 |
| A0f2104000 | 拆入资金 | Funds Borrowed | 从金融机构拆入的款项 |
| A002105000 | 交易性金融负债 | Trading Financial Liabilities | 交易性金融负债公允价值 |
| A0f2106000 | 衍生金融负债 | Derivative Financial Liabilities | 衍生工具等产生的负债 |
| A002107000 | 应付票据 | Notes Payable | 尚未到期付款的应付票据 |
| A002108000 | 应付账款 | Accounts Payable | 购买商品或接受劳务应付的款项 |
| A002109000 | 预收款项 | Advance Receipts | 预收购买单位的款项 |
| A002128000 | 合同负债 | Contract Liabilities | 已收或应收客户对价而应转让商品的义务 |
| A0f2110000 | 卖出回购金融资产款 | Securities Sold under Repurchase Agreements | 按回购协议融出的资金 |
| A0i2111000 | 应付手续费及佣金 | Handling Fees and Commissions Payable | 应付手续费及佣金 |
| A002112000 | 应付职工薪酬 | Employee Compensation Payable | 应付给职工的各种薪酬 |
| A002113000 | 应交税费 | Taxes and Fees Payable | 应交的各种税费 |
| A002114000 | 应付利息 | Interest Payable | 按期计提的利息 |
| A002115000 | 应付股利 | Dividends Payable | 尚未支付的现金股利 |
| A0i2116000 | 应付赔付款 | Claims Payable | 应付未付的赔付款项 |
| A0i2117000 | 应付保单红利 | Policyholder Dividends Payable | 应付未付投保人的红利 |
| A0i2118000 | 保户储金及投资款 | Policyholder Deposits and Investment Funds | 储金及投资型保险业务投资款 |
| A0i2119000 | 保险合同准备金 | Insurance Contract Reserves | 未到期责任准备金等 |
| A0i2119101 | 其中:未到期责任准备金 | Unearned Premium Reserves | 尚未终止的非寿险保险责任准备金 |
| A0i2119201 | 其中:未决赔款准备金 | Outstanding Claims Reserves | 已发生尚未结案的赔案准备金 |
| A0i2119301 | 其中:寿险责任准备金 | Life Insurance Reserves | 尚未终止的人寿保险责任准备金 |
| A0i2119401 | 其中:长期健康险责任准备金 | Long-term Health Insurance Reserves | 长期健康保险责任准备金 |
| A002120000 | 其他应付款 | Other Payables | 其他应付、暂收的款项 |
| A0i2121000 | 应付分保账款 | Reinsurance Payables | 再保险业务应付未付的款项 |
| A0d2122000 | 代理买卖证券款 | Securities Trading Agency Funds | 代理客户买卖证券收到的款项 |
| A0d2123000 | 代理承销证券款 | Securities Underwriting Agency Funds | 承销证券形成的承销资金 |
| A0i2124000 | 预收保费 | Unearned Premiums | 未满足保费收入确认条件的保险费 |
| A002125000 | 一年内到期的非流动负债 | Non-current Liabilities Due within One Year | 一年内到期的非流动负债 |
| A002126000 | 其他流动负债 | Other Current Liabilities | 其他流动负债 |
| A002127000 | 递延收益-流动负债 | Deferred Income - Current | 尚待确认的流动负债性质的收益 |
| A002100000 | 流动负债合计 | Total Current Liabilities | 流动负债各项目合计 |

### 2.4 非流动负债 / Non-current Liabilities

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| A002201000 | 长期借款 | Long-term Borrowings | 一年期以上的各项借款 |
| A0d2202000 | 独立账户负债 | Separate Account Liabilities | 投资连结产品独立账户负债 |
| A002203000 | 应付债券 | Bonds Payable | 发行债券的本金和利息 |
| A002211000 | 租赁负债 | Lease Liabilities | 尚未支付的租赁付款额的现值 |
| A002204000 | 长期应付款 | Long-term Payables | 长期应付款项 |
| A002205000 | 专项应付款 | Special Payables | 专项建设任务等形成的应付款项 |
| A002206000 | 长期负债合计 | Total Long-term Liabilities | 长期负债各项目合计 |
| A002207000 | 预计负债 | Provisions | 预计的各项或有负债 |
| A0F2210000 | 代理业务负债 | Agency Business Liabilities | 代理业务收到的款项 |
| A002208000 | 递延所得税负债 | Deferred Tax Liabilities | 应纳税暂时性差异产生的负债 |
| A002209000 | 其他非流动负债 | Other Non-current Liabilities | 其他非流动负债合计 |
| A002210000 | 递延收益-非流动负债 | Deferred Income - Non-current | 尚待确认的非流动负债性质的收益 |
| A002200000 | 非流动负债合计 | Total Non-current Liabilities | 非流动负债合计 |
| A0f2300000 | 其他负债 | Other Liabilities | 金融企业披露的其他负债 |
| A002000000 | 负债合计 | Total Liabilities | 负债各项目合计 |

### 2.5 所有者权益 / Shareholders' Equity

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| A003101000 | 实收资本(或股本) | Paid-in Capital / Share Capital | 股东投入公司的股本总额 |
| A003112000 | 其他权益工具 | Other Equity Instruments | 普通股以外的权益工具 |
| A003112101 | 其中：优先股 | Preferred Stock | 优先于普通股的股份 |
| A003112201 | 其中：永续债 | Perpetual Bonds | 不规定到期期限的债券 |
| A003112301 | 其中：其他 | Other | 其他权益工具 |
| A003102000 | 资本公积 | Capital Surplus | 股本溢价、法定财产重估增值等 |
| A003102101 | 其中：库存股 | Treasury Stock | 收购、转让或注销的本公司股份金额 |
| A003103000 | 盈余公积 | Surplus Reserve | 从利润中提取的公积金 |
| A0f3104000 | 一般风险准备 | General Risk Reserve | 从净利润中提取的一般风险准备 |
| A003105000 | 未分配利润 | Undistributed Profits | 尚未分配的利润 |
| A003106000 | 外币报表折算差额 | Foreign Currency Translation Difference | 货币折算差额 |
| A003107000 | 加：未确认的投资损失 | Add: Unrecognized Investment Losses | 承担的被投资企业负所有者权益份额 |
| A0F3108000 | 交易风险准备 | Trading Risk Reserve | 证券公司交易风险准备金 |
| A0F3109000 | 专项储备 | Special Reserve | 安全生产费等具有类似性质的费用 |
| A003111000 | 其他综合收益 | Other Comprehensive Income | 未在损益中确认的各项利得和损失 |
| A003100000 | 归属于母公司所有者权益合计 | Total Parent Company Owners' Equity | 归属于母公司所有者份额的权益 |
| A003200000 | 少数股东权益 | Minority Shareholders' Equity | 子公司其他投资者拥有的份额 |
| A003000000 | 所有者权益合计 | Total Shareholders' Equity | 股东权益各项目合计 |
| A004000000 | 负债与所有者权益总计 | Total Liabilities and Shareholders' Equity | 负债与股东权益总计 |

---

## 三、利润表项目 / Income Statement Items

### 3.1 营业收入 / Operating Revenue

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| B001100000 | 营业总收入 | Total Operating Revenue | 经营过程中所有收入之和 |
| B001101000 | 营业收入 | Operating Revenue | 经营过程中确认的营业收入 |
| Bbd1102000 | 利息净收入 | Net Interest Income | 利息收入与利息支出之差额 |
| Bbd1102101 | 利息收入 | Interest Income | 确认的利息收入 |
| Bbd1102203 | 利息支出 | Interest Expense | 发生的利息支出 |
| B0i1103000 | 已赚保费 | Earned Premiums | 保费收入减去分出保费等后的余额 |
| B0i1103101 | 保险业务收入 | Insurance Business Revenue | 原保费收入和分保费收入 |
| B0i1103111 | 其中：分保费收入 | Reinsurance Premiums Income | 再保险业务确认的收入 |
| B0i1103203 | 减：分出保费 | Ceded Premiums | 再保险业务分出的保费 |
| B0i1103303 | 减：提取未到期责任准备金 | Unearned Premium Reserve | 提取的非寿险未到期责任准备金 |
| B0d1104000 | 手续费及佣金净收入 | Net Fee and Commission Income | 手续费及佣金收入与支出之差额 |
| B0d1104101 | 其中：代理买卖证券业务净收入 | Securities Trading Agency Income | 代理买卖证券业务收入与支出差额 |
| B0d1104201 | 其中:证券承销业务净收入 | Securities Underwriting Income | 证券承销业务收入与支出差额 |
| B0d1104301 | 其中：受托客户资产管理业务净收入 | Asset Management Income | 受托客户资产管理业务收入差额 |
| B0d1104401 | 手续费及佣金收入 | Fee and Commission Income | 确认的手续费及佣金收入 |
| B0d1104501 | 手续费及佣金支出 | Fee and Commission Expense | 发生的各项手续费、佣金支出 |
| B0f1105000 | 其他业务收入 | Other Business Revenue | 其他业务所确认的收入 |

### 3.2 营业成本与费用 / Operating Costs and Expenses

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| B001200000 | 营业总成本 | Total Operating Costs | 经营过程中所有成本之和 |
| B001201000 | 营业成本 | Operating Cost | 确认的营业成本 |
| B0i1202000 | 退保金 | Surrender Benefits | 提前解除合同退还的保单现金价值 |
| B0i1203000 | 赔付支出净额 | Net Claims Expenses | 赔付支出减去摊回赔付支出后的余额 |
| B0i1203101 | 赔付支出 | Claims Expenses | 支付的原保险合同赔付款项 |
| B0i1203203 | 减：摊回赔付支出 | Recovered Claims | 向再保险接受人摊回的赔付成本 |
| B0i1204000 | 提取保险责任准备金净额 | Net Insurance Contract Reserves | 提取的保险责任准备金净额 |
| B0i1204101 | 提取保险责任准备金 | Insurance Contract Reserves | 提取的未决赔款准备金等 |
| B0i1204203 | 减：摊回保险责任准备金 | Recovered Insurance Reserves | 摊回的保险责任准备金 |
| B0i1205000 | 保单红利支出 | Policyholder Dividend Expenses | 支付给投保人的红利 |
| B0i1206000 | 分保费用 | Reinsurance Expenses | 支付的分保费用 |
| B001207000 | 税金及附加 | Taxes and Surchanges | 营业税金及附加等相关税费 |
| B0f1208000 | 业务及管理费 | Business and Management Expenses | 业务经营和管理过程中发生的费用 |
| B0i1208103 | 减：摊回分保费用 | Recovered Reinsurance Expenses | 摊回的分保费用 |
| B0I1214000 | 保险业务手续费及佣金支出 | Insurance Commission Expenses | 保险业务手续费及佣金支出 |
| B001209000 | 销售费用 | Selling Expenses | 销售过程中发生的费用 |
| B001210000 | 管理费用 | Administrative Expenses | 组织和管理生产经营发生的费用 |
| B001216000 | 研发费用 | R&D Expenses | 研究开发成本支出 |
| B001211000 | 财务费用 | Financial Expenses | 筹集资金发生的费用 |
| B001211101 | 其中：利息费用(财务费用) | Interest Expense | 债权性融资支付的资金占用费用 |
| B001211203 | 其中：利息收入(财务费用) | Interest Income | 资金提供给他人使用的收入 |

### 3.3 其他收益与损失 / Other Gains and Losses

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| B001305000 | 其他收益 | Other Gains | 与日常活动相关的政府补助 |
| B001302000 | 投资收益 | Investment Income | 对外投资取得的收益 |
| B001302101 | 其中：对联营企业和合营企业的投资收益 | Investment Income from Associates | 对联营企业和合营企业的投资收益 |
| B001302201 | 其中：以摊余成本计量的金融资产终止确认收益 | Gain on Derecognition of Financial Assets | 终止确认金融资产产生的利得 |
| B001303000 | 汇兑收益 | Foreign Exchange Gains | 外币交易因汇率变动产生的收益 |
| B001306000 | 净敞口套期收益 | Net Hedging Gains | 净敞口套期下产生的收益 |
| B001301000 | 公允价值变动收益 | Fair Value Change Gains | 公允价值变动形成的利得 |
| B001212000 | 资产减值损失 | Asset Impairment Losses | 计提各项资产减值准备形成的损失 |
| B001307000 | 信用减值损失 | Credit Impairment Losses | 无法收回造成的损失 |
| B001308000 | 资产处置收益 | Asset Disposal Gains | 出售非流动资产确认的处置利得 |
| B0f1213000 | 其他业务成本 | Other Business Costs | 其他业务所发生的成本 |
| B001304000 | 其他业务利润 | Other Business Profit | 主营业务以外其他业务取得的利润 |

### 3.4 利润 / Profit

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| B001300000 | 营业利润 | Operating Profit | 与经营业务有关的利润 |
| B001400000 | 加：营业外收入 | Add: Non-operating Income | 各项营业外收入 |
| B001400101 | 其中：非流动资产处置利得 | Gains on Disposal of Non-current Assets | 固定资产和无形资产处置利得 |
| B001500000 | 减：营业外支出 | Less: Non-operating Expenses | 各项营业外支出 |
| B001500101 | 其中：非流动资产处置净损益 | Net Gains/Losses on Disposal of Non-current Assets | 处置非流动资产产生的净损益 |
| B001500201 | 其中：非流动资产处置损失 | Losses on Disposal of Non-current Assets | 固定资产和无形资产处置损失 |
| B001000000 | 利润总额 | Total Profit | 公司实现的利润总额 |
| B002100000 | 减：所得税费用 | Less: Income Tax Expense | 应从利润总额中扣除的所得税费用 |
| B002200000 | 未确认的投资损失 | Unrecognized Investment Losses | 承担的被投资企业负所有者权益份额 |
| B002300000 | 影响净利润的其他项目 | Other Items Affecting Net Profit | 影响净利润的其他项目 |
| B002000000 | 净利润 | Net Profit | 公司实现的净利润 |
| B002000101 | 归属于母公司所有者的净利润 | Net Profit Attributable to Parent | 归属于母公司所有者的净利润 |
| B002000301 | 归属于母公司其他权益工具持有者的净利润 | Net Profit Attributable to Other Equity Holders | 归属于其他权益工具持有者的净利润 |
| B002000201 | 少数股东损益 | Minority Shareholders' Profit/Loss | 少数股东享有的利润或分担的亏损 |

### 3.5 每股收益与综合收益 / EPS and Comprehensive Income

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| B003000000 | 基本每股收益 | Basic Earnings per Share (EPS) | 归属于普通股的当期净利润/加权平均股数 |
| B004000000 | 稀释每股收益 | Diluted Earnings per Share | 存在稀释性潜在普通股时的每股收益 |
| B005000000 | 其他综合收益(损失) | Other Comprehensive Income (Loss) | 未在损益中确认的利得和损失 |
| B006000000 | 综合收益总额 | Total Comprehensive Income | 净利润+其他综合收益 |
| B006000101 | 归属于母公司所有者的综合收益 | Comprehensive Income Attributable to Parent | 归属于母公司所有者的综合收益 |
| B006000103 | 归属于母公司其他权益工具持有者的综合收益总额 | Comprehensive Income Attributable to Other Equity Holders | 归属于其他权益工具持有者的综合收益 |
| B006000102 | 归属少数股东的综合收益 | Minority Comprehensive Income | 少数股东的综合收益 |

---

## 四、现金流量表项目 / Cash Flow Statement Items

### 4.1 经营活动现金流量 / Operating Cash Flow

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| C001001000 | 销售商品、提供劳务收到的现金 | Cash Received from Sales and Services | 销售商品、提供劳务收到的现金 |
| C0b1002000 | 客户存款和同业存放款项净增加额 | Net Increase in Customer Deposits | 吸收的客户存款净增加额 |
| C0F1023000 | 存放央行和同业款项净减少额 | Net Decrease in Deposits with Central Bank | 存放央行和同业款项净减少额 |
| C0b1003000 | 向中央银行借款净增加额 | Net Increase in Borrowings from Central Bank | 向中央银行借款净增加额 |
| C0b1004000 | 向其他金融机构拆入资金净增加额 | Net Increase in Borrowings from Other Financial Institutions | 从其他金融机构拆入资金净增加额 |
| C0i1005000 | 收到原保险合同保费取得的现金 | Cash Received from Original Insurance Premiums | 收到的原保险合同保费 |
| C0i1006000 | 收到再保险业务现金净额 | Net Cash Received from Reinsurance | 再保险业务收到的款项净额 |
| C0i1007000 | 保户储金及投资款净增加额 | Net Increase in Policyholder Deposits | 向投保人收取的储金净增加额 |
| C0d1008000 | 处置交易性金融资产净增加额 | Net Increase from Disposal of Trading Financial Assets | 处置交易性金融资产所取得的现金净额 |
| C0f1009000 | 收取利息、手续费及佣金的现金 | Cash Received from Interest, Fees and Commissions | 收到的利息、手续费和佣金 |
| C0d1010000 | 拆入资金净增加额 | Net Increase in Funds Borrowed | 拆入资金净增加额 |
| C0d1011000 | 回购业务资金净增加额 | Net Increase from Repurchase Business | 回购业务融入的资金净额 |
| C0F1024000 | 拆出资金净减少额 | Net Decrease in Funds Lent | 拆出资金净减少额 |
| C0F1025000 | 买入返售款项净减少额 | Net Decrease in Securities Purchased | 买入返售款项净减少额 |
| C001012000 | 收到的税费返还 | Tax Refunds Received | 收到的各种税费返还 |
| C001013000 | 收到的其他与经营活动有关的现金 | Other Cash Received from Operating Activities | 其他与经营活动有关的现金 |
| C001100000 | 经营活动现金流入小计 | Subtotal of Cash Inflows from Operating Activities | 经营活动现金流入小计 |
| C001014000 | 购买商品、接受劳务支付的现金 | Cash Paid for Goods and Services | 购买商品、接受劳务支付的现金 |
| C0b1015000 | 客户贷款及垫款净增加额 | Net Increase in Customer Loans and Advances | 发放的客户贷款净增加额 |
| C0F1026000 | 向中央银行借款净减少额 | Net Decrease in Borrowings from Central Bank | 向中央银行借款净减少额 |
| C0b1016000 | 存放中央银行和同业款项净增加额 | Net Increase in Deposits with Central Bank | 存放央行和同业款项净增加额 |
| C0i1017000 | 支付原保险合同赔付款项的现金 | Cash Paid for Insurance Claims | 实际支付原保险合同赔付的现金 |
| C0f1018000 | 支付利息、手续费及佣金的现金 | Cash Paid for Interest, Fees and Commissions | 实际支付的利息、手续费和佣金 |
| C0F1027000 | 支付再保业务现金净额 | Net Cash Paid for Reinsurance | 再保险业务支付的净额 |
| C0F1028000 | 保户储金及投资款净减少额 | Net Decrease in Policyholder Deposits | 保户储金及投资款净减少额 |
| C0F1029000 | 拆出资金净增加额 | Net Increase in Funds Lent | 拆出资金净增加额 |
| C0F1030000 | 买入返售款项净增加额 | Net Increase in Securities Purchased | 买入返售款项净增加额 |
| C0F1031000 | 拆入资金净减少额 | Net Decrease in Funds Borrowed | 拆入资金净减少额 |
| C0F1032000 | 卖出回购款项净减少额 | Net Decrease in Securities Sold | 卖出回购款项净减少额 |
| C0i1019000 | 支付保单红利的现金 | Cash Paid for Policyholder Dividends | 支付给投保人的红利 |
| C001020000 | 支付给职工以及为职工支付的现金 | Cash Paid to and for Employees | 支付给职工的现金 |
| C001021000 | 支付的各项税费 | Taxes Paid | 支付的各项税费 |
| C001022000 | 支付其他与经营活动有关的现金 | Other Cash Paid for Operating Activities | 其他与经营活动有关的现金 |
| C001200000 | 经营活动现金流出小计 | Subtotal of Cash Outflows from Operating Activities | 经营活动现金流出小计 |
| C001000000 | 经营活动产生的现金流量净额 | Net Cash Flow from Operating Activities | 经营活动现金流入与流出之差额 |

### 4.2 投资活动现金流量 / Investing Cash Flow

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| C002001000 | 收回投资收到的现金 | Cash Received from Investment Disposal | 出售、转让或到期收回投资收到的现金 |
| C002002000 | 取得投资收益收到的现金 | Cash Received from Investment Income | 取得现金股利、利息等 |
| C002003000 | 处置固定资产、无形资产和其他长期资产收回的现金净额 | Cash Received from Disposal of Fixed Assets | 处置固定资产等收回的现金净额 |
| C002004000 | 处置子公司及其他营业单位收到的现金净额 | Cash Received from Disposal of Subsidiaries | 处置子公司收到的现金净额 |
| C002005000 | 收到的其他与投资活动有关的现金 | Other Cash Received from Investing Activities | 其他与投资活动有关的现金 |
| C002100000 | 投资活动产生的现金流入小计 | Subtotal of Cash Inflows from Investing Activities | 投资活动现金流入小计 |
| C002006000 | 购建固定资产、无形资产和其他长期资产支付的现金 | Cash Paid for Fixed Assets | 购买、建造固定资产等支付的现金 |
| C002007000 | 投资支付的现金 | Cash Paid for Investments | 权益性和债权性投资支付的现金 |
| C0i2008000 | 质押贷款净增加额 | Net Increase in Secured Loans | 发放保户质押贷款的净额 |
| C002009000 | 取得子公司及其他营业单位支付的现金净额 | Cash Paid for Acquisition of Subsidiaries | 购买子公司支付的现金净额 |
| C002010000 | 支付其他与投资活动有关的现金 | Other Cash Paid for Investing Activities | 其他与投资活动有关的现金 |
| C002200000 | 投资活动产生的现金流出小计 | Subtotal of Cash Outflows from Investing Activities | 投资活动现金流出小计 |
| C002000000 | 投资活动产生的现金流量净额 | Net Cash Flow from Investing Activities | 投资活动现金流入与流出之差额 |

### 4.3 筹资活动现金流量 / Financing Cash Flow

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| C003008000 | 吸收投资收到的现金 | Cash Received from Investors | 发行股票、债券等方式筹集的资金 |
| C003001000 | 吸收权益性投资收到的现金 | Cash Received from Equity Investment | 以发行股票方式筹集的资金 |
| C003001101 | 其中：子公司吸收少数股东投资收到的现金 | Minority Investment in Subsidiaries | 子公司吸收少数股东投资收到的现金 |
| C003003000 | 发行债券收到的现金 | Cash Received from Bond Issuance | 发行债券筹集的资金 |
| C003002000 | 取得借款收到的现金 | Cash Received from Borrowings | 借入的资金 |
| C003004000 | 收到其他与筹资活动有关的现金 | Other Cash Received from Financing Activities | 其他与筹资活动有关的现金 |
| C003100000 | 筹资活动现金流入小计 | Subtotal of Cash Inflows from Financing Activities | 筹资活动现金流入小计 |
| C003005000 | 偿还债务支付的现金 | Cash Paid for Debt Repayment | 偿还债务的本金 |
| C003006000 | 分配股利、利润或偿付利息支付的现金 | Cash Paid for Dividends and Interest | 支付的现金股利和利息 |
| C003006101 | 其中：子公司支付给少数股东的股利、利润 | Minority Dividends Paid | 子公司支付给少数股东的股利 |
| C003007000 | 支付其他与筹资活动有关的现金 | Other Cash Paid for Financing Activities | 其他与筹资活动有关的现金 |
| C003200000 | 筹资活动现金流出小计 | Subtotal of Cash Outflows from Financing Activities | 筹资活动现金流出小计 |
| C003000000 | 筹资活动产生的现金流量净额 | Net Cash Flow from Financing Activities | 筹资活动现金流入与流出之差额 |

### 4.4 现金及现金等价物 / Cash and Cash Equivalents

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| C004000000 | 汇率变动对现金及现金等价物的影响 | Effect of Foreign Exchange Rate Changes | 外币现金流量折算差额 |
| C007000000 | 其他对现金的影响 | Other Effects on Cash | 其他影响现金的科目 |
| C005000000 | 现金及现金等价物净增加额 | Net Increase in Cash and Cash Equivalents | 现金及现金等价物净增加额 |
| C005001000 | 期初现金及现金等价物余额 | Beginning Cash and Cash Equivalents | 期初现金及现金等价物余额 |
| C006000000 | 期末现金及现金等价物余额 | Ending Cash and Cash Equivalents | 期末现金及现金等价物余额 |

---

## 五、现金流量表补充资料 / Cash Flow Statement Supplementary Information

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| D000101000 | 净利润 | Net Profit | 本期实现的净利润 |
| D000118000 | 信用减值损失 | Credit Impairment Losses | 无法收回造成的损失 |
| D000117000 | 未确认的投资损失 | Unrecognized Investment Losses | 承担的被投资企业负权益份额 |
| D000102000 | 资产减值准备 | Asset Impairment Provisions | 本期计提的各项资产减值准备 |
| D000103000 | 固定资产折旧、油气资产折耗、生产性生物资产折旧 | Depreciation | 本期计提的固定资产折旧等 |
| D000104000 | 无形资产摊销 | Amortization of Intangible Assets | 累计摊入成本费用的无形资产价值 |
| D000105000 | 长期待摊费用摊销 | Amortization of Deferred Expenses | 累计摊入成本费用的长期待摊费用 |
| D000106000 | 处置固定资产、无形资产和其他长期资产的损失 | Losses on Disposal of Long-term Assets | 处置固定资产等发生的净损失 |
| D000107000 | 固定资产报废损失 | Fixed Asset Scrapping Losses | 固定资产盘亏后的净损失 |
| D000108000 | 公允价值变动损失 | Fair Value Change Losses | 公允价值变动损益 |
| D000109000 | 财务费用 | Financial Expenses | 本期发生的财务费用 |
| D000110000 | 投资损失 | Investment Losses | 本期投资发生的损失 |
| D000111000 | 递延所得税资产减少 | Decrease in Deferred Tax Assets | 递延所得税资产期初与期末差额 |
| D000112000 | 递延所得税负债增加 | Increase in Deferred Tax Liabilities | 递延所得税负债期初与期末差额 |
| D000113000 | 存货的减少 | Decrease in Inventory | 本期存货的减少 |
| D000114000 | 经营性应收项目的减少 | Decrease in Operating Receivables | 经营性应收项目的减少 |
| D000115000 | 经营性应付项目的增加 | Increase in Operating Payables | 经营性应付项目的增加 |
| D000116000 | 其他 | Others | 其他应调整的项目 |
| D000100000 | 经营活动产生的现金流量净额 | Net Cash Flow from Operating Activities | 本期经营活动产生的现金流量净额 |
| D000201000 | 债务转为资本 | Debt to Capital | 本期转为资本的债务金额 |
| D000202000 | 一年内到期的可转换公司债券 | Convertible Bonds Due within One Year | 一年内到期的可转换公司债券本息 |
| D000203000 | 融资租赁固定资产 | Finance Lease Fixed Assets | 本期融资租入的固定资产金额 |
| D000204000 | 现金的期末余额 | Ending Cash Balance | 现金账户的期末余额 |
| D000205000 | 现金的期初余额 | Beginning Cash Balance | 现金账户的期初余额 |
| D000206000 | 现金等价物的期末余额 | Ending Cash Equivalents Balance | 现金等价物账户的期末余额 |
| D000207000 | 现金等价物的期初余额 | Beginning Cash Equivalents Balance | 现金等价物账户的期初余额 |
| D000200000 | 现金及现金等价物净增加额 | Net Increase in Cash and Cash Equivalents | 本期现金及现金等价物的净增加额 |

---

## 六、财务比率 / Financial Ratios

### 6.1 偿债能力 / Solvency Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F010101A | 流动比率 | Current Ratio | 流动资产/流动负债 |
| F010201A | 速动比率 | Quick Ratio / Acid Test Ratio | (流动资产-存货)/流动负债 |
| F010301A | 保守速动比率 | Conservative Quick Ratio | (货币资金+交易性金融资产+应收票据+应收账款)/流动负债 |
| F010401A | 现金比率 | Cash Ratio | 现金及现金等价物期末余额/流动负债 |
| F010501A | 营运资金与借款比 | Working Capital to Borrowings Ratio | (流动资产-流动负债)/(短期借款+长期借款) |
| F010601A | 营运资金 | Working Capital | 流动资产合计-流动负债合计 |
| F010701B | 利息保障倍数A | Interest Coverage Ratio A | (净利润+所得税费用+财务费用)/财务费用 |
| F010702B | 利息保障倍数B | Interest Coverage Ratio B | (净利润+财务费用)/财务费用 |
| F010801B | 经营活动产生的现金流量净额/流动负债 | Operating Cash Flow to Current Liabilities | 经营活动产生的现金流量净额/流动负债合计 |
| F010901B | 现金流利息保障倍数 | Cash Flow Interest Coverage Ratio | 经营活动产生的现金流量净额/财务费用 |
| F011001B | 现金流到期债务保障倍数 | Cash Flow Debt Coverage Ratio | 经营活动产生的现金流量净额/(一年内到期非流动负债+应付票据) |
| F011201A | 资产负债率 | Debt-to-Asset Ratio | 负债合计/资产总计 |
| F011301A | 长期借款与总资产比 | Long-term Borrowings to Total Assets | 长期借款/资产总计 |
| F011401A | 有形资产负债率 | Tangible Debt-to-Asset Ratio | 负债合计/(资产总计-无形资产-商誉) |
| F011501A | 有形资产带息债务比 | Tangible Assets to Interest-bearing Debt | (非流动负债+短期借款+一年内到期非流动负债)/(资产总计-无形资产-商誉) |
| F011601A | 权益乘数 | Equity Multiplier | 资产总计/所有者权益合计 |
| F011701A | 产权比率 | Debt-to-Equity Ratio | 负债合计/所有者权益合计 |
| F011801A | 权益对负债比率 | Equity to Debt Ratio | 所有者权益合计/负债合计 |
| F011901A | 长期资本负债率 | Long-term Capital Debt Ratio | 非流动负债合计/(所有者权益+非流动负债合计) |
| F012001A | 长期负债权益比率 | Long-term Debt to Equity Ratio | 非流动负债合计/所有者权益合计 |
| F012101A | 长期债务与营运资金比率 | Long-term Debt to Working Capital Ratio | 非流动负债合计/(流动资产-流动负债) |
| F012201B | 息税折旧摊销前利润/负债合计 | EBITDA to Total Liabilities | (净利润+所得税+财务费用+折旧摊销)/负债合计平均余额 |
| F012301B | 经营活动产生的现金流量净额/负债合计 | Operating Cash Flow to Total Liabilities | 经营活动产生的现金流量净额/负债合计平均余额 |
| F012401B | 经营活动产生的现金流量净额/带息债务 | Operating Cash Flow to Interest-bearing Debt | 经营活动产生的现金流量净额/带息债务平均余额 |
| F012501B | 负债与权益市价比率 | Debt to Market Value Ratio | 负债合计/市值A |
| F012601B | 有形净值债务率 | Tangible Net Worth Debt Ratio | 负债总额/有形净资产总额 |
| F012701B | 固定支出偿付倍数 | Fixed Charge Coverage Ratio | (利润总额+财务费用+折旧摊销)/(财务费用+折旧摊销) |

### 6.2 营运能力 / Activity Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F040101B | 应收账款与收入比 | Accounts Receivable to Revenue | 应收账款/营业收入 |
| F040201B | 应收账款周转率A | Accounts Receivable Turnover A | 营业收入/应收账款期末余额 |
| F040202B | 应收账款周转率B | Accounts Receivable Turnover B | 营业收入/应收账款平均占用额 |
| F040203B | 应收账款周转率C | Accounts Receivable Turnover C | 营业收入/应收账款平均占用额(上年) |
| F040204B | 应收账款周转率D | Accounts Receivable Turnover D | 调整因子×营业收入/应收账款净额平均余额 |
| F040205C | 应收账款周转率TTM | Accounts Receivable Turnover TTM | 营业收入TTM/应收账款净额平均余额 |
| F040301B | 应收账款周转天数A | Days Sales Outstanding A | 计算期天数/应收账款周转率A |
| F040302B | 应收账款周转天数B | Days Sales Outstanding B | 计算期天数/应收账款周转率B |
| F040303B | 应收账款周转天数C | Days Sales Outstanding C | 计算期天数/应收账款周转率C |
| F040304C | 应收账款周转天数TTM | Days Sales Outstanding TTM | 365/应收账款周转率TTM |
| F040401B | 存货与收入比 | Inventory to Revenue | 存货/营业收入 |
| F040501B | 存货周转率A | Inventory Turnover A | 营业成本/存货期末余额 |
| F040502B | 存货周转率B | Inventory Turnover B | 营业成本/存货平均占用额 |
| F040503B | 存货周转率C | Inventory Turnover C | 营业成本/存货平均占用额(上年) |
| F040504B | 存货周转率D | Inventory Turnover D | 调整因子×营业成本/存货净额平均余额 |
| F040505C | 存货周转率TTM | Inventory Turnover TTM | 营业成本TTM/存货净额平均余额 |
| F040601B | 存货周转天数A | Days Inventory Outstanding A | 计算期天数/存货周转率A |
| F040602B | 存货周转天数B | Days Inventory Outstanding B | 计算期天数/存货周转率B |
| F040603B | 存货周转天数C | Days Inventory Outstanding C | 计算期天数/存货周转率C |
| F040604C | 存货周转天数TTM | Days Inventory Outstanding TTM | 365/存货周转率TTM |
| F040701B | 营业周期A | Operating Cycle A | 应收账款周转天数A+存货周转天数A |
| F040702B | 营业周期B | Operating Cycle B | 应收账款周转天数B+存货周转天数B |
| F040703B | 营业周期C | Operating Cycle C | 应收账款周转天数C+存货周转天数C |
| F040704C | 营业周期TTM | Operating Cycle TTM | 存货周转天数TTM+应收账款周转天数TTM |
| F040801B | 应付账款周转率A | Accounts Payable Turnover A | 营业成本/应付账款期末余额 |
| F040802B | 应付账款周转率B | Accounts Payable Turnover B | 营业成本/应付账款平均占用额 |
| F040803B | 应付账款周转率C | Accounts Payable Turnover C | 营业成本/应付账款平均占用额(上年) |
| F040804B | 应付账款周转率D | Accounts Payable Turnover D | 调整因子×营业成本/应付账款平均余额 |
| F040805C | 应付账款周转率TTM | Accounts Payable Turnover TTM | 营业成本TTM/应付账款平均余额 |
| F040901B | 营运资金(资本)周转率A | Working Capital Turnover A | 营业收入/营运资金 |
| F040902B | 营运资金(资本)周转率B | Working Capital Turnover B | 营业收入/平均营运资金 |
| F040903B | 营运资金(资本)周转率C | Working Capital Turnover C | 营业收入/平均营运资金(上年) |
| F040904B | 营运资金(资本)周转率D | Working Capital Turnover D | 调整因子×营业收入/平均营运资金 |
| F040905C | 营运资金(资本)周转率TTM | Working Capital Turnover TTM | 营业收入TTM/平均营运资金 |
| F041001B | 现金及现金等价物周转率A | Cash Turnover A | 营业收入/现金及现金等价物余额 |
| F041002B | 现金及现金等价物周转率B | Cash Turnover B | 营业收入/现金及现金等价物平均余额 |
| F041003B | 现金及现金等价物周转率C | Cash Turnover C | 营业收入/现金及现金等价物平均余额(上年) |
| F041004B | 现金及现金等价物周转率D | Cash Turnover D | 调整因子×营业收入/期末现金平均余额 |
| F041005C | 现金及现金等价物周转率TTM | Cash Turnover TTM | 营业收入TTM/期末现金平均余额 |
| F041101B | 流动资产与收入比 | Current Assets to Revenue | 流动资产/营业收入 |
| F041201B | 流动资产周转率A | Current Assets Turnover A | 营业收入/流动资产期末余额 |
| F041202B | 流动资产周转率B | Current Assets Turnover B | 营业收入/流动资产平均占用额 |
| F041203B | 流动资产周转率C | Current Assets Turnover C | 营业收入/流动资产平均占用额(上年) |
| F041204B | 流动资产周转率D | Current Assets Turnover D | 调整因子×营业收入/流动资产平均占用额 |
| F041205C | 流动资产周转率TTM | Current Assets Turnover TTM | 营业收入TTM/流动资产平均占用额 |
| F041301B | 固定资产与收入比 | Fixed Assets to Revenue | 固定资产/营业收入 |
| F041401B | 固定资产周转率A | Fixed Assets Turnover A | 营业收入/固定资产期末净额 |
| F041402B | 固定资产周转率B | Fixed Assets Turnover B | 营业收入/固定资产平均净额 |
| F041403B | 固定资产周转率C | Fixed Assets Turnover C | 营业收入/固定资产平均净额(上年) |
| F041404B | 固定资产周转率D | Fixed Assets Turnover D | 调整因子×营业收入/固定资产平均净额 |
| F041405C | 固定资产周转率TTM | Fixed Assets Turnover TTM | 营业收入TTM/固定资产平均净额 |
| F041501B | 非流动资产周转率A | Non-current Assets Turnover A | 营业收入/非流动资产合计期末余额 |
| F041502B | 非流动资产周转率B | Non-current Assets Turnover B | 营业收入/非流动资产平均余额 |
| F041503B | 非流动资产周转率C | Non-current Assets Turnover C | 营业收入/非流动资产平均余额(上年) |
| F041504B | 非流动资产周转率D | Non-current Assets Turnover D | 调整因子×营业收入/非流动资产平均余额 |
| F041505C | 非流动资产周转率TTM | Non-current Assets Turnover TTM | 营业收入TTM/非流动资产平均余额 |
| F041601B | 资本密集度 | Capital Intensity | 总资产/营业收入 |
| F041701B | 总资产周转率A | Total Assets Turnover A | 营业收入/资产总额期末余额 |
| F041702B | 总资产周转率B | Total Assets Turnover B | 营业收入/平均资产总额 |
| F041703B | 总资产周转率C | Total Assets Turnover C | 营业收入/平均资产总额(上年) |
| F041704B | 总资产周转率D | Total Assets Turnover D | 调整因子×营业收入/平均资产总额 |
| F041705C | 总资产周转率TTM | Total Assets Turnover TTM | 营业收入TTM/平均资产总额 |
| F041801B | 股东权益周转率A | Equity Turnover A | 营业收入/股东权益期末余额 |
| F041802B | 股东权益周转率B | Equity Turnover B | 营业收入/平均股东权益 |
| F041803B | 股东权益周转率C | Equity Turnover C | 营业收入/平均股东权益(上年) |
| F041804B | 股东权益周转率D | Equity Turnover D | 调整因子×营业收入/平均股东权益 |
| F041805C | 股东权益周转率TTM | Equity Turnover TTM | 营业收入TTM/平均股东权益 |

### 6.3 盈利能力 / Profitability Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F050101B | 资产报酬率A | Return on Assets A | (利润总额+财务费用)/资产总额 |
| F050102B | 资产报酬率B | Return on Assets B | (利润总额+财务费用)/平均资产总额 |
| F050103B | 资产报酬率C | Return on Assets C | (利润总额+财务费用)/平均资产总额(上年) |
| F050104C | 资产报酬率TTM | Return on Assets TTM | (利润总额TTM+财务费用TTM)/平均资产总额 |
| F050201B | 总资产净利润率(ROA)A | Return on Total Assets A | 净利润/总资产余额 |
| F050202B | 总资产净利润率(ROA)B | Return on Total Assets B | 净利润/总资产平均余额 |
| F050203B | 总资产净利润率(ROA)C | Return on Total Assets C | 净利润/总资产平均余额(上年) |
| F050204C | 总资产净利润率(ROA)TTM | Return on Total Assets TTM | 净利润TTM/总资产平均余额 |
| F050301B | 流动资产净利润率A | Return on Current Assets A | 净利润/流动资产余额 |
| F050302B | 流动资产净利润率B | Return on Current Assets B | 净利润/流动资产平均余额 |
| F050303B | 流动资产净利润率C | Return on Current Assets C | 净利润/流动资产平均余额(上年) |
| F050304C | 流动资产净利润率TTM | Return on Current Assets TTM | 净利润TTM/流动资产平均余额 |
| F050401B | 固定资产净利润率A | Return on Fixed Assets A | 净利润/固定资产余额 |
| F050402B | 固定资产净利润率B | Return on Fixed Assets B | 净利润/固定资产平均余额 |
| F050403B | 固定资产净利润率C | Return on Fixed Assets C | 净利润/固定资产平均余额(上年) |
| F050404C | 固定资产净利润率TTM | Return on Fixed Assets TTM | 净利润TTM/固定资产平均余额 |
| F050501B | 净资产收益率(ROE)A | Return on Equity A | 净利润/股东权益余额 |
| F050502B | 净资产收益率(ROE)B | Return on Equity B | 净利润/股东权益平均余额 |
| F050503B | 净资产收益率(ROE)C | Return on Equity C | 净利润/股东权益平均余额(上年) |
| F050504C | 净资产收益率(ROE)TTM | Return on Equity TTM | 净利润TTM/股东权益平均余额 |
| F050601B | 息税前利润(EBIT) | Earnings Before Interest and Taxes | 净利润+所得税费用+财务费用 |
| F050601C | 息税前利润(EBIT)TTM | EBIT TTM | 净利润TTM+所得税费用TTM+财务费用TTM |
| F050701B | 息前税后利润 | After-tax Interest Profit | 息税前利润×(1-所得税率) |
| F050801B | 息税折旧摊销前收入(EBITDA) | EBITDA | 净利润+所得税+财务费用+折旧摊销 |
| F050801C | 息税折旧摊销前收入(EBITDA)TTM | EBITDA TTM | 净利润TTM+所得税TTM+财务费用TTM+折旧摊销TTM |
| F050901B | 净利润与利润总额比 | Net Profit to Total Profit | 净利润/利润总额 |
| F051001B | 利润总额与息税前利润比 | Total Profit to EBIT | 利润总额/息税前利润 |
| F051101B | 息税前利润与资产总额比 | EBIT to Total Assets | 息税前利润/资产总额 |
| F051201B | 投入资本回报率(ROIC) | Return on Invested Capital | (净利润+财务费用)/(资产总计-流动负债+应付票据+短期借款+一年内到期非流动负债) |
| F053201B | 长期资本收益率 | Return on Long-term Capital | (净利润+所得税费用+财务费用)/长期资本额 |
| F053301B | 营业毛利率 | Gross Profit Margin | (营业收入-营业成本)/营业收入 |
| F053301C | 营业毛利率TTM | Gross Profit Margin TTM | (营业收入-营业成本)TTM/营业收入TTM |
| F051301B | 营业成本率 | Operating Cost Ratio | 营业成本/营业收入 |
| F051301C | 营业成本率TTM | Operating Cost Ratio TTM | 营业成本TTM/营业收入TTM |
| F051401B | 营业利润率 | Operating Profit Margin | 营业利润/营业收入 |
| F051401C | 营业利润率TTM | Operating Profit Margin TTM | 营业利润TTM/营业收入TTM |
| F051501B | 营业净利率 | Net Profit Margin | 净利润/营业收入 |
| F051501C | 营业净利率TTM | Net Profit Margin TTM | 净利润TTM/营业收入TTM |
| F051601B | 总营业成本率 | Total Operating Cost Ratio | 营业总成本/营业总收入 |
| F051601C | 总营业成本率TTM | Total Operating Cost Ratio TTM | 营业总成本TTM/营业总收入TTM |
| F051701B | 销售费用率 | Selling Expense Ratio | 销售费用/营业收入 |
| F051701C | 销售费用率TTM | Selling Expense Ratio TTM | 销售费用TTM/营业收入TTM |
| F051801B | 管理费用率 | Administrative Expense Ratio | 管理费用/营业收入 |
| F051801C | 管理费用率TTM | Administrative Expense Ratio TTM | 管理费用TTM/营业收入TTM |
| F051901B | 财务费用率 | Financial Expense Ratio | 财务费用/营业收入 |
| F051901C | 财务费用率TTM | Financial Expense Ratio TTM | 财务费用TTM/营业收入TTM |
| F053401B | 研发费用率 | R&D Expense Ratio | 研发费用/营业收入 |
| F052001B | 销售期间费用率 | Total Operating Expense Ratio | (销售费用+管理费用+财务费用)/营业收入 |
| F052001C | 销售期间费用率TTM | Total Operating Expense Ratio TTM | (销售+管理+财务费用)TTM/营业收入TTM |
| F052101B | 成本费用利润率 | Cost Expense Profit Ratio | 利润总额/(营业成本+税金及附加+销售费用+管理费用+财务费用+研发费用) |
| F052101C | 成本费用利润率TTM | Cost Expense Profit Ratio TTM | 利润总额TTM/(营业成本+税金及附加+销售+管理+财务+研发费用)TTM |
| F052201B | 资产减值损失/营业收入 | Impairment Loss to Revenue | 资产减值损失/营业收入 |
| F052201C | 资产减值损失/营业收入TTM | Impairment Loss to Revenue TTM | 资产减值损失TTM/营业收入TTM |
| F052301B | 息税折旧摊销前营业利润率 | EBITDA Margin | EBITDA/营业总收入 |
| F052301C | 息税折旧摊销前利润率TTM | EBITDA Margin TTM | EBITDATTM/营业总收入TTM |
| F052401B | 息税前营业利润率 | EBIT Margin | (净利润+所得税+财务费用)/营业收入 |
| F052401C | 息税前营业利润率TTM | EBIT Margin TTM | (净利润+所得税+财务费用)TTM/营业收入TTM |
| F052901B | 现金与利润总额比 | Cash to Total Profit Ratio | 经营活动产生的现金流量净额/利润总额 |
| F052901C | 现金与利润总额比TTM | Cash to Total Profit Ratio TTM | 经营活动产生的现金流量净额TTM/利润总额TTM |
| F053001B | 归属于母公司净资产收益率(ROE)A | ROE (Parent) A | 归属于母公司净利润/归属于母公司期末权益 |
| F053002B | 归属于母公司净资产收益率(ROE)B | ROE (Parent) B | 归属于母公司净利润/归属于母公司平均权益 |
| F053003B | 归属于母公司净资产收益率(ROE)C | ROE (Parent) C | 归属于母公司净利润/归属于母公司平均权益(上年) |
| F053004C | 归属于母公司净资产收益率(ROE)TTM | ROE (Parent) TTM | 归属于母公司净利润TTM/归属于母公司平均权益 |
| F053101B | 归属于母公司综合收益率A | Comprehensive Return (Parent) A | 归属于母公司综合收益/归属于母公司期末权益 |
| F053102B | 归属于母公司综合收益率B | Comprehensive Return (Parent) B | 归属于母公司综合收益/归属于母公司平均权益 |
| F053103B | 归属于母公司综合收益率C | Comprehensive Return (Parent) C | 归属于母公司综合收益/归属于母公司平均权益(上年) |
| F053104C | 归属于母公司综合收益率TTM | Comprehensive Return (Parent) TTM | 归属于母公司综合收益TTM/归属于母公司平均权益 |
| F053202B | 投资收益率 | Investment Return Rate | 本期投资收益/长期投资期末值 |

### 6.4 成长能力 / Growth Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F080101A | 资本保值增值率A | Capital Preservation & Appreciation A | 期末所有者权益/期初所有者权益 |
| F080102A | 资本保值增值率B | Capital Preservation & Appreciation B | 期末所有者权益/上年同期期末所有者权益 |
| F080201A | 母公司资本保值增值率 | Parent Capital Preservation Rate | 期末归属于母公司权益/上年同期期末归属于母公司权益 |
| F080301A | 资本积累率A | Capital Accumulation Rate A | (期末-期初所有者权益)/期初所有者权益 |
| F080302A | 资本积累率B | Capital Accumulation Rate B | (期末-上年同期所有者权益)/上年同期所有者权益 |
| F080401A | 母公司资本积累率 | Parent Capital Accumulation Rate | (期末-上年同期归属于母公司权益)/上年同期归属于母公司权益 |
| F080501A | 固定资产增长率A | Fixed Assets Growth Rate A | (期末-期初固定资产净额)/期初固定资产净额 |
| F080502A | 固定资产增长率B | Fixed Assets Growth Rate B | (期末-上年同期固定资产净额)/上年同期固定资产净额 |
| F080601A | 总资产增长率A | Total Assets Growth Rate A | (期末-期初资产总计)/期初资产总计 |
| F080602A | 总资产增长率B | Total Assets Growth Rate B | (期末-上年同期资产总计)/上年同期资产总计 |
| F080701B | 净资产收益率增长率A | ROE Growth Rate A | (本期-上期ROE)/上期ROE |
| F080702B | 净资产收益率增长率B | ROE Growth Rate B | (本期-上年同期ROE)/上年同期ROE |
| F080801B | 基本每股收益增长率A | EPS Growth Rate A | (本期-上期每股收益)/上期每股收益 |
| F080802B | 基本每股收益增长率B | EPS Growth Rate B | (本期-上年同期每股收益)/上年同期每股收益 |
| F080901B | 稀释每股收益增长率A | Diluted EPS Growth Rate A | (本期-上期稀释每股收益)/上期稀释每股收益 |
| F080902B | 稀释每股收益增长率B | Diluted EPS Growth Rate B | (本期-上年同期稀释每股收益)/上年同期稀释每股收益 |
| F081001B | 净利润增长率A | Net Profit Growth Rate A | (本期-上期净利润)/上期净利润 |
| F081002B | 净利润增长率B | Net Profit Growth Rate B | (本期-上年同期净利润)/上年同期净利润 |
| F081101B | 利润总额增长率A | Total Profit Growth Rate A | (本期-上期利润总额)/上期利润总额 |
| F081102B | 利润总额增长率B | Total Profit Growth Rate B | (本期-上年同期利润总额)/上年同期利润总额 |
| F081201B | 营业利润增长率A | Operating Profit Growth Rate A | (本期-上期营业利润)/上期营业利润 |
| F081202B | 营业利润增长率B | Operating Profit Growth Rate B | (本期-上年同期营业利润)/上年同期营业利润 |
| F081301B | 归属于母公司净利润增长率 | Net Profit Growth Rate (Parent) | (本期-上年同期归属于母公司净利润)/上年同期归属于母公司净利润 |
| F081401B | 综合收益增长率 | Comprehensive Income Growth Rate | (本期-上年同期综合收益)/上年同期综合收益 |
| F081501B | 归属于母公司综合收益增长率 | Comprehensive Income Growth (Parent) | (本期-上年同期归属于母公司综合收益)/上年同期归属于母公司综合收益 |
| F081601B | 营业收入增长率A | Revenue Growth Rate A | (本期-上期营业收入)/上期营业收入 |
| F081602C | 营业收入增长率B | Revenue Growth Rate B | (本期-上年同期营业收入)/上年同期营业收入 |
| F081701B | 营业总收入增长率 | Total Revenue Growth Rate | (本期-上年同期营业总收入)/上年同期营业总收入 |
| F081801B | 营业总成本增长率 | Total Cost Growth Rate | (本期-上年同期营业总成本)/上年同期营业总成本 |
| F081901B | 销售费用增长率 | Selling Expense Growth Rate | (本期-上年同期销售费用)/上年同期销售费用 |
| F082001B | 管理费用增长率 | Administrative Expense Growth Rate | (本期-上年同期管理费用)/上年同期管理费用 |
| F082601B | 可持续增长率 | Sustainable Growth Rate | ROE×收益留存率/(1-ROE×收益留存率) |
| F082701A | 所有者权益增长率A | Equity Growth Rate A | (期末-期初所有者权益)/期初所有者权益 |
| F082702A | 所有者权益增长率B | Equity Growth Rate B | (期末-上年同期所有者权益)/上年同期所有者权益 |
| F082802A | 每股净资产增长率A | BPS Growth Rate A | (期末-期初每股净资产)/期初每股净资产 |
| F082802A | 每股净资产增长率B | BPS Growth Rate B | (期末-上年同期每股净资产)/上年同期每股净资产 |

### 6.5 现金流量比率 / Cash Flow Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F060101B | 净利润现金净含量 | Net Profit Cash Content | 经营活动产生的现金流量净额/净利润 |
| F060101C | 净利润现金净含量TTM | Net Profit Cash Content TTM | 经营活动现金流量净额TTM/净利润TTM |
| F060201B | 营业收入现金含量 | Revenue Cash Content | 销售商品收到的现金/营业收入 |
| F060201C | 营业收入现金含量TTM | Revenue Cash Content TTM | 销售商品收到的现金TTM/营业收入TTM |
| F060301B | 营业收入现金净含量 | Revenue Cash Net Content | 经营活动现金流量净额/营业总收入 |
| F060301C | 营业收入现金净含量TTM | Revenue Cash Net Content TTM | 经营活动现金流量净额TTM/营业总收入TTM |
| F060401B | 营业利润现金净含量 | Operating Profit Cash Content | 经营活动现金流量净额/营业利润 |
| F060401C | 营业利润现金净含量TTM | Operating Profit Cash Content TTM | 经营活动现金流量净额TTM/营业利润TTM |
| F060901B | 筹资活动债权人现金净流量 | Creditor Cash Flow | 发行债券+取得借款-偿还债务-其他筹资支出 |
| F060901C | 筹资活动债权人现金净流量TTM | Creditor Cash Flow TTM | 债权人现金净流量TTM |
| F061001B | 筹资活动股东现金净流量 | Shareholder Cash Flow | 吸收权益投资-分配股利 |
| F061001C | 筹资活动股东现金净流量TTM | Shareholder Cash Flow TTM | 股东现金净流量TTM |
| F061201B | 折旧摊销 | Depreciation and Amortization | 固定资产折旧+无形资产摊销+长期待摊费用摊销 |
| F061201C | 折旧摊销TTM | Depreciation and Amortization TTM | 折旧摊销TTM |
| F061301B | 公司现金流1 | Corporate Cash Flow 1 | 净利润+财务费用-资产变动+负债变动-股东变动 |
| F061302B | 公司现金流2 | Corporate Cash Flow 2 | 现金净增加额-筹资活动现金流量净额 |
| F061301C | 公司现金流TTM1 | Corporate Cash Flow TTM1 | 公司现金流1 TTM |
| F061302C | 公司现金流TTM2 | Corporate Cash Flow TTM2 | 现金净增加额TTM-筹资活动净额TTM |
| F061401B | 股权现金流1 | Equity Cash Flow 1 | 净利润-所有者权益变动-股东变动+货币资金变动 |
| F061402B | 股权现金流2 | Equity Cash Flow 2 | 现金净增加额-吸收投资+分配股利 |
| F061401C | 股权现金流TTM1 | Equity Cash Flow TTM1 | 股权现金流1 TTM |
| F061402C | 股权现金流TTM2 | Equity Cash Flow TTM2 | 现金净增加额TTM-吸收投资TTM+分配股利TTM |
| F061501B | 公司自由现金流(原有) | Free Cash Flow (Original) | EBITDA-营运资本追加-资本支出 |
| F061601B | 股权自由现金流(原有) | Free Cash Flow to Equity (Original) | 净利润+非现金支出-营运资本追加-资本支出-债务偿还+新发债 |
| F061701B | 全部现金回收率 | Cash Recovery Rate | 经营活动现金流量净额/资产总计期末余额 |
| F061801B | 营运指数 | Operating Index | 经营活动现金流量/(净利润-投资收益+非现金支出) |
| F061901B | 资本支出与折旧摊销比 | Capex to Depreciation Ratio | 资本支出/折旧摊销 |
| F062001B | 现金适合比率 | Cash Suitability Ratio | 经营活动现金流量/(资本支出+股利+存货变动) |
| F062101B | 现金再投资比率 | Cash Reinvestment Ratio | 经营活动现金流量/(固定资产+长期投资+营运资本) |
| F062201B | 现金满足投资比率 | Cash Sufficiency Ratio | 近5年经营现金流量合计/近5年投资支出合计 |
| F062301B | 股权自由现金流 | Free Cash Flow to Equity | 净利润+非现金支出-营运资本追加-资本支出-债务偿还+新发行债务 |
| F062401B | 企业自由现金流 | Free Cash Flow to Firm | 息前税后利润+折旧摊销-营运资本增加-资本支出 |

### 6.6 估值指标 / Valuation Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F100101B | 市盈率(PE)1 | P/E Ratio 1 | 今收盘价/(净利润/实收资本) |
| F100102B | 市盈率(PE)2 | P/E Ratio 2 | 今收盘价/(调整因子×净利润/实收资本) |
| F100103C | 市盈率(PE)TTM | P/E Ratio TTM | 今收盘价/(净利润TTM/实收资本) |
| F100201B | 市销率(PS)1 | P/S Ratio 1 | 今收盘价/(营业总收入上年年报/实收资本) |
| F100202B | 市销率(PS)2 | P/S Ratio 2 | 今收盘价/(调整因子×营业总收入/实收资本) |
| F100203C | 市销率(PS)TTM | P/S Ratio TTM | 今收盘价/(营业总收入TTM/实收资本) |
| F100301B | 市现率(PCF)1 | P/CF Ratio 1 | 今收盘价/(经营现金流上年年报/实收资本) |
| F100302B | 市现率(PCF)2 | P/CF Ratio 2 | 今收盘价/(调整因子×经营现金流/实收资本) |
| F100303C | 市现率(PCF)TTM | P/CF Ratio TTM | 今收盘价/(经营现金流TTM/实收资本) |
| F100401A | 市净率(PB) | P/B Ratio | 今收盘价/(所有者权益/实收资本) |
| F100501A | 市值有形资产比 | Market to Tangible Assets | 今收盘价/(有形资产/实收资本) |
| F100601B | 市盈率母公司(PE)1 | P/E Ratio (Parent) 1 | 今收盘价/(归属于母公司净利润上年年报/实收资本) |
| F100602B | 市盈率母公司(PE)2 | P/E Ratio (Parent) 2 | 今收盘价/(调整因子×归属于母公司净利润/实收资本) |
| F100603C | 市盈率母公司(PE)TTM | P/E Ratio (Parent) TTM | 今收盘价/(归属于母公司净利润TTM/实收资本) |
| F100701A | 市净率母公司(PB) | P/B Ratio (Parent) | 今收盘价/(归属于母公司权益/实收资本) |
| F100901A | 托宾Q值A | Tobin's Q A | 市值A/资产总计 |
| F100902A | 托宾Q值B | Tobin's Q B | 市值A/(资产总计-无形资产-商誉) |
| F100903A | 托宾Q值C | Tobin's Q C | 市值B/资产总计 |
| F100904A | 托宾Q值D | Tobin's Q D | 市值B/(资产总计-无形资产-商誉) |
| F101001A | 账面市值比A | Book to Market Ratio A | 资产总计/市值A |
| F101002A | 账面市值比B | Book to Market Ratio B | 资产总计/市值B |
| F101101B | 本利比 | Price to Dividend Ratio | 今收盘价/每股派息税后 |
| F101201B | 普通股获利率A | Dividend Yield A | 每股派息税后/今收盘价 |
| F101202B | 普通股获利率B | Dividend Yield B | 每股派息税后/今收盘价+资本利得率 |
| F101301B | 企业价值倍数 | Enterprise Value Multiplier | 总市值/EBITDA |
| F101302C | 企业价值倍数TTM | Enterprise Value Multiplier TTM | 总市值/EBITDA TTM |

### 6.7 资产结构 / Asset Structure Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F030101A | 流动资产比率 | Current Assets Ratio | 流动资产合计/资产总计 |
| F030201A | 现金资产比率 | Cash Assets Ratio | 期末现金等价物余额/资产总计 |
| F030301A | 应收类资产比率 | Receivables Ratio | (应收票据+应收账款)/资产总计 |
| F030401A | 营运资金对流动资产比率 | Working Capital to Current Assets | (流动资产-流动负债)/流动资产 |
| F030501A | 营运资金比率 | Working Capital Ratio | (流动资产-流动负债)/资产总计 |
| F030601A | 营运资金对净资产比率 | Working Capital to Net Worth | 营运资金/净资产总额 |
| F030701A | 非流动资产比率 | Non-current Assets Ratio | 非流动资产/总资产 |
| F030801A | 固定资产比率 | Fixed Assets Ratio | 固定资产净额/资产合计 |
| F030901A | 无形资产比率 | Intangible Assets Ratio | 无形资产净额/资产总计 |
| F031001A | 有形资产比率 | Tangible Assets Ratio | 有形资产总额/总资产 |
| F031101A | 所有者权益比率 | Equity Ratio | 股东权益合计/资产总额 |
| F031201A | 留存收益资产比 | Retained Earnings to Assets | (盈余公积+未分配利润)/资产总额 |
| F031301A | 长期资产适合率 | Long-term Assets Suitability | (所有者权益+非流动负债)/(固定资产+长期投资) |
| F031401A | 股东权益对固定资产比率 | Equity to Fixed Assets | 股东权益/固定资产净额 |
| F031501A | 流动负债比率 | Current Liabilities Ratio | 流动负债合计/负债合计 |
| F031601A | 经营负债比率 | Operating Liabilities Ratio | (流动负债-短期借款-交易性金融负债)/负债合计 |
| F031701A | 金融负债比率 | Financial Liabilities Ratio | (非流动负债+短期借款+交易性金融负债)/负债合计 |
| F031801A | 非流动负债比率 | Non-current Liabilities Ratio | 非流动负债合计/负债合计 |
| F031901A | 母公司所有者权益占比 | Parent Equity Ratio | 归属于母公司所有者权益/所有者权益合计 |
| F032001A | 少数股东权益占比 | Minority Interest Ratio | 少数股东权益/所有者权益合计 |

### 6.8 利润结构 / Profit Structure Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F032101B | 主营业务利润占比 | Main Business Profit Ratio | (营业收入-营业成本)/利润总额 |
| F032201B | 金融活动利润占比 | Financial Activities Profit Ratio | (投资收益+公允价值变动收益)/利润总额 |
| F032301B | 营业利润占比 | Operating Profit Ratio | 营业利润/利润总额 |
| F032401B | 营业外收入占比 | Non-operating Income Ratio | (营业外收入-营业外支出)/利润总额 |
| F032501B | 流转税率 | Turnover Tax Rate | 税金及附加/营业总收入 |
| F032601B | 综合税率A | Comprehensive Tax Rate A | (税金及附加+所得税)/营业总收入 |
| F032701B | 综合税率B | Comprehensive Tax Rate B | (税金及附加+所得税)/利润总额 |
| F032801B | 所得税率 | Income Tax Rate | 所得税费用/利润总额 |
| F032901B | 归属于母公司净利润占比 | Net Profit (Parent) Ratio | 归属于母公司净利润/净利润 |
| F033001B | 少数股东损益净利润占比 | Minority Profit Ratio | 少数股东损益/净利润 |
| F033101B | 净利润综合收益占比 | Net Profit to Comprehensive Income | 净利润/综合收益总额 |
| F033201B | 其他综合收益占比 | Other Comprehensive Income Ratio | 其他综合收益/综合收益总额 |
| F033301B | 归属于母公司综合收益占比 | Comprehensive Income (Parent) Ratio | 归属于母公司综合收益/综合收益总额 |
| F033401B | 归属于少数股东综合收益占比 | Minority Comprehensive Income Ratio | 归属于少数股东综合收益/综合收益总额 |
| F033501A | 母公司所有者权益与投入资本比 | Parent Equity to Invested Capital | 归属于母公司所有者权益/投入资本 |

### 6.9 杠杆比率 / Leverage Ratios

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F020101A | 财务杠杆 | Financial Leverage | (净利润+所得税+财务费用)/(净利润+所得税) |
| F020201B | 经营杠杆 | Operating Leverage | (净利润+所得税+财务费用+折旧摊销)/(净利润+所得税+财务费用) |
| F020301B | 综合杠杆 | Combined Leverage | (净利润+所得税+财务费用+折旧摊销)/(净利润+所得税) |

---

## 七、每股指标 / Per Share Indicators

| 字段代码 | 中文名称 | 英文名称 | 计算公式 |
|---------|---------|----------|---------|
| F090101B | 每股收益1 | EPS 1 | 净利润/实收资本本期期末值 |
| F090101C | 每股收益TTM1 | EPS TTM 1 | 净利润TTM/实收资本 |
| F090102B | 每股收益2 | EPS 2 | 净利润/最新股本 |
| F090102C | 每股收益TTM2 | EPS TTM 2 | 净利润TTM/最新股本 |
| F090103B | 每股收益3 | EPS 3 | (净利润-营业外收入+营业外支出)/实收资本 |
| F090103C | 每股收益TTM3 | EPS TTM 3 | (净利润-营业外+营业外支出)TTM/实收资本 |
| F090104B | 每股收益4 | EPS 4 | (净利润-营业外收入+营业外支出)/最新股本 |
| F090104C | 每股收益TTM4 | EPS TTM 4 | (净利润-营业外+营业外支出)TTM/最新股本 |
| F090201B | 每股综合收益1 | Comprehensive EPS 1 | 综合收益总额/实收资本 |
| F090201C | 每股综合收益TTM1 | Comprehensive EPS TTM 1 | 综合收益总额TTM/实收资本 |
| F090202B | 每股综合收益2 | Comprehensive EPS 2 | 综合收益总额/最新股本 |
| F090202C | 每股综合收益TTM2 | Comprehensive EPS TTM 2 | 综合收益总额TTM/最新股本 |
| F090301B | 归属于母公司每股收益1 | EPS (Parent) 1 | 归属于母公司净利润/实收资本 |
| F090301C | 归属于母公司每股收益TTM1 | EPS (Parent) TTM 1 | 归属于母公司净利润TTM/实收资本 |
| F090401B | 归属于母公司每股综合收益1 | Comprehensive EPS (Parent) 1 | 归属于母公司综合收益/实收资本 |
| F090401C | 归属于母公司每股综合收益TTM1 | Comprehensive EPS (Parent) TTM 1 | 归属于母公司综合收益TTM/实收资本 |
| F090501B | 每股营业总收入1 | Total Revenue per Share 1 | 营业总收入/实收资本 |
| F090501C | 每股营业总收入TTM1 | Total Revenue per Share TTM 1 | 营业总收入TTM/实收资本 |
| F090601B | 每股营业收入1 | Revenue per Share 1 | 营业收入/实收资本 |
| F090601C | 每股营业收入TTM1 | Revenue per Share TTM 1 | 营业收入TTM/实收资本 |
| F090701B | 息税前每股收益1 | EBIT per Share 1 | EBIT/实收资本 |
| F090701C | 息税前每股收益TTM1 | EBIT per Share TTM 1 | EBITTTM/实收资本 |
| F090801B | 息税折旧摊销前每股收益1 | EBITDA per Share 1 | EBITDA/实收资本 |
| F090801C | 息税折旧摊销前每股收益TTM1 | EBITDA per Share TTM 1 | EBITDATTM/实收资本 |
| F090901B | 每股营业利润1 | Operating Profit per Share 1 | 营业利润/实收资本 |
| F090901C | 每股营业利润TTM1 | Operating Profit per Share TTM 1 | 营业利润TTM/实收资本 |
| F091001A | 每股净资产1 | BPS 1 | 所有者权益合计/实收资本 |
| F091002A | 每股净资产2 | BPS 2 | 所有者权益合计/最新股本 |
| F091101A | 每股有形资产1 | Tangible Assets per Share 1 | 有形资产/实收资本 |
| F091102A | 每股有形资产2 | Tangible Assets per Share 2 | 有形资产/最新股本 |
| F091201A | 每股负债1 | Debt per Share 1 | 负债合计/实收资本 |
| F091202A | 每股负债2 | Debt per Share 2 | 负债合计/最新股本 |
| F091301A | 每股资本公积1 | Capital Surplus per Share 1 | 资本公积/实收资本 |
| F091302A | 每股资本公积2 | Capital Surplus per Share 2 | 资本公积/最新股本 |
| F091401A | 每股盈余公积1 | Surplus Reserve per Share 1 | 盈余公积/实收资本 |
| F091402A | 每股盈余公积2 | Surplus Reserve per Share 2 | 盈余公积/最新股本 |
| F091501A | 每股未分配利润1 | Undistributed Profit per Share 1 | 未分配利润/实收资本 |
| F091502A | 每股未分配利润2 | Undistributed Profit per Share 2 | 未分配利润/最新股本 |
| F091601A | 每股留存收益1 | Retained Earnings per Share 1 | (盈余公积+未分配利润)/实收资本 |
| F091602A | 每股留存收益2 | Retained Earnings per Share 2 | (盈余公积+未分配利润)/最新股本 |
| F091701A | 归属于母公司每股净资产1 | BPS (Parent) 1 | 归属于母公司权益/实收资本 |
| F091702A | 归属于母公司每股净资产2 | BPS (Parent) 2 | 归属于母公司权益/最新股本 |
| F091801B | 每股经营活动产生的现金流量净额1 | Operating CF per Share 1 | 经营现金流净额/实收资本 |
| F091801C | 每股经营活动产生的现金流量净额TTM1 | Operating CF per Share TTM 1 | 经营现金流净额TTM/实收资本 |
| F091802B | 每股经营活动产生的现金流量净额2 | Operating CF per Share 2 | 经营现金流净额/最新股本 |
| F091802C | 每股经营活动产生的现金流量净额TTM2 | Operating CF per Share TTM 2 | 经营现金流净额TTM/最新股本 |
| F091901B | 每股投资活动现金净流量1 | Investing CF per Share 1 | 投资活动现金流净额/实收资本 |
| F091901C | 每股投资活动现金净流量TTM1 | Investing CF per Share TTM 1 | 投资活动现金流净额TTM/实收资本 |
| F091902B | 每股投资活动现金净流量2 | Investing CF per Share 2 | 投资活动现金流净额/最新股本 |
| F091902C | 每股投资活动现金净流量TTM2 | Investing CF per Share TTM 2 | 投资活动现金流净额TTM/最新股本 |
| F092001B | 每股筹资活动现金净流量1 | Financing CF per Share 1 | 筹资活动现金流净额/实收资本 |
| F092001C | 每股筹资活动现金净流量TTM1 | Financing CF per Share TTM 1 | 筹资活动现金流净额TTM/实收资本 |
| F092002B | 每股筹资活动现金净流量2 | Financing CF per Share 2 | 筹资活动现金流净额/最新股本 |
| F092002C | 每股筹资活动现金净流量TTM2 | Financing CF per Share TTM 2 | 筹资活动现金流净额TTM/最新股本 |
| F092101B | 每股企业自由现金流量1 | FCFF per Share 1 | 企业自由现金流/实收资本 |
| F092101C | 每股企业自由现金流量TTM1 | FCFF per Share TTM 1 | 企业自由现金流TTM/实收资本 |
| F092102B | 每股企业自由现金流量2 | FCFF per Share 2 | 企业自由现金流/最新股本 |
| F092102C | 每股企业自由现金流量TTM2 | FCFF per Share TTM 2 | 企业自由现金流TTM/最新股本 |
| F092201B | 每股股东自由现金流量1 | FCFE per Share 1 | 股东自由现金流/实收资本 |
| F092201C | 每股股东自由现金流量TTM1 | FCFE per Share TTM 1 | 股东自由现金流TTM/实收资本 |
| F092202B | 每股股东自由现金流量2 | FCFE per Share 2 | 股东自由现金流/最新股本 |
| F092202C | 每股股东自由现金流量TTM2 | FCFE per Share TTM 2 | 股东自由现金流TTM/最新股本 |
| F092301B | 每股折旧和摊销1 | D&A per Share 1 | 折旧摊销/实收资本 |
| F092301C | 每股折旧和摊销TTM1 | D&A per Share TTM 1 | 折旧摊销TTM/实收资本 |
| F092302B | 每股折旧和摊销2 | D&A per Share 2 | 折旧摊销/最新股本 |
| F092302C | 每股折旧和摊销TTM2 | D&A per Share TTM 2 | 折旧摊销TTM/最新股本 |
| F092601B | 每股现金净流量1 | Cash Flow per Share 1 | 现金净增加额/实收资本 |
| F092601C | 每股现金净流量TTM1 | Cash Flow per Share TTM 1 | 现金净增加额TTM/实收资本 |
| F092602B | 每股现金净流量2 | Cash Flow per Share 2 | 现金净增加额/最新股本 |
| F092602C | 每股现金净流量TTM2 | Cash Flow per Share TTM 2 | 现金净增加额TTM/最新股本 |

---

## 八、其他财务指标 / Other Financial Indicators

| 字段代码 | 中文名称 | 英文名称 | 说明 |
|---------|---------|----------|------|
| F020101 | 非经常性损益 | Non-recurring Gains and Losses | 直接来源于年报财务摘要 |
| F020102 | 归属于上市公司股东的扣除非经常性损益的净利润 | Net Profit Attributable (Deducted) | 扣除非经常性损益后的净利润 |
| F020103 | 加权平均净资产收益率 | Weighted Average ROE | 加权平均净资产收益率 |
| F020104 | 扣除非经常性损益后的加权平均净资产收益率 | Weighted Average ROE (Adjusted) | 扣除非经常性损益后的加权平均ROE |
| F020105 | 扣除非经常性损益后的基本每股收益 | Basic EPS (Adjusted) | 扣除非经常性损益后的基本每股收益 |
| F020106 | 每股经营活动产生的现金流量净额 | Operating CF per Share | 每股经营现金流 |
| F020107 | 归属于上市公司股东的每股净资产 | BPS (Parent) | 归属于母公司每股净资产 |
| F020108 | 基本每股收益 | Basic EPS | 基本每股收益 |
| F020109 | 稀释每股收益 | Diluted EPS | 稀释每股收益 |

---

## 九、简化字段 / Simplified Field Names

| 中文名称 | 英文名称 |
|---------|----------|
| 货币资金 | Cash |
| 应收账款 | Accounts Receivable |
| 一年内到期的非流动资产 | NonCurrentAssetsInYear |
| 流动资产合计 | TotalCurrentAssets |
| 存货 | Inventory |
| 其他流动资产 | OtherCurrentAssets |
| 固定资产 | FixedAssets |
| 固定资产清理 | DisposalOfFixedAssets |
| 无形资产 | IntangibleAssets |
| 资产总额 | TotalAssets |
| 流动负债合计 | TotalCurrentLiabilities |
| 负债总额 | TotalLiabilities |
| 短期借款 | ShortTermLoan |
| 应付账款 | AccountsPayable |
| 应付税费 | TaxesPayable |
| 应付股利 | StockDividendPayable |
| 一年内到期的长期负债 | LongLiabInYearChange |
| 所有者权益合计 | TotalEquity |
| 股本 | CapitalStock |
| 营业总收入 | TotalRevenue |
| 营业收入 | OperatingRevenue |
| 营业总成本 | TotalOperatingCost |
| 营业成本 | OperatingCost |
| 营业税金及附加 | BusinessTaxAndSurcharge |
| 销售费用 | SellingExpenses |
| 管理费用 | ManagementExpense |
| 研发费用 | RDExpenses |
| 财务费用 | FinanceExpense |
| 营业利润 | OperatingProfit |
| 营业外收入 | NonOperatingIncome |
| 营业外支出 | NonOperatingExpenses |
| 利润总额 | TotalProfit |
| 所得税费用 | IncomeTax |
| 净利润 | NetProfit |
| 固定资产折旧 | Depreciation |
| 无形资产摊销 | AmorOfIntangibleAssets |
| 长期待摊费用摊销 | AmorOfDeferredExpenses |
| 经营活动产生的现金流量净额 | OperatingNetCashFlow |

---

## 十、补充指标 / Supplementary Indicators

| 中文名称 | 英文名称 | 计算公式 |
|---------|----------|---------|
| 资产负债率 | AssetLiabilityRatio | 负债总额/资产总额 |
| 总资产报酬率A | ROTAA | (利润总额+财务费用)/平均资产总额 |
| 总资产报酬率B | ROTAB | (利润总额+财务费用)/平均资产总额 |
| 总资产报酬率C | ROTAC | (利润总额+财务费用)/平均资产总额 |
| 总资产净利润率A | ROAA | 净利润/平均资产总额 |
| 总资产净利润率B | ROAB | 净利润/平均资产总额 |
| 总资产净利润率C | ROAC | 净利润/平均资产总额 |
| 净资产收益率(ROE)A | ROEA | 净利润/股东权益平均余额 |
| 净资产收益率(ROE)B | ROEB | 净利润/股东权益平均余额 |
| 净资产收益率(ROE)C | ROEC | 净利润/股东权益平均余额 |
| 市值A | MarketValueA | A股×收盘价+负债 |
| 市值B | MarketValueB | (总股本-B股)×收盘价+负债 |
| 账面市值比A | ValueBookRatioA | 资产总计/市值A |
| 账面市值比B | ValueBookRatioB | 资产总计/市值B |
| 每股收益 | EPS | 净利润/总股数 |
| 每股净资产 | NAVPS | 股东权益总额/普通股股数 |
| 总资产 | TotalAssets | 资产总计 |
| 总负债 | TotalLiabilities | 负债总计 |
| 营业收入 | OperatingRevenue | 营业收入 |
| 经营性净现金流 | OperatingNetCashFlow | 经营活动产生的现金流量净额 |
| 总资产净利润率 | ROA | 净利润/资产总计 |
| 资产负债率 | AssetLiabilityRatio | 总负债/总资产 |
| 金融负债 | FinancialLiability | 短期借款+一年内到期负债+长期借款+应付债券 |
| 经营负债 | OperatingLiability | 总负债-金融负债 |
| 账面市值比 | BookToMarketRatio | 股东权益/公司市值 |
| 管理费用率 | ManagementExpenseRatio | 管理费用/总资产 |
| 有形资产比率 | TangibleAssetRatio | (总资产-无形资产-商誉)/总资产 |
| 流动比率 | CurrentRatio | 流动资产/流动负债 |
| 存货周转率 | InventoryTurnover | 营业成本/存货净额 |
| 营运资金周转率 | WorkingCapitalTurnover | 营业收入/营运资金 |
| 现金及现金等价物周转率 | CashEquivalentsTurnover | 营业收入/期末现金余额 |
| 营业收入增长率 | OperatingRevenueGrowth | (本期-上期营业收入)/上期营业收入 |
| 非债务税盾 | NonDebtTaxShield | 折旧/总资产 |
| 所得税率 | IncomeTaxTate | 所得税/利润总额 |
| 盈利波动性 | ProfitsVolatility | (EBIT/总资产)三年波动率 |
| 现金流波动性 | CashFlowVolatility | (现金流/总资产)三年波动率 |
| 利息覆盖率 | InterestCoverageRatio | EBITDA/利息支出 |
| 税负 | TaxBearing | 所得税/营业收入 |
| 银行借款比例 | BankLoanRatio | (短期借款+长期借款)/总资产 |
| 短期借款依赖度 | ShortLoanDependence | 短期借款/总资产 |
| 大股东占款 | ShareholdersOccupy | (其他应收款-其他应付款)/总资产 |
| 年报公布日期 | Annodt | 年报公布日期 |
| 资本支出 | Capexp | 购建固定资产等支付的现金 |
| 实际税率 | Etaxrt | 所得税费用/税前利润 |
| 特殊项目利润 | Speitem | 税前利润-营业利润 |
| 员工数目 | Nstaff | 上市公司员工总人数 |

---

## 附注 / Notes

- **TTM (Trailing Twelve Months)**: 过去12个月累计收益
- **A/B/C后缀**: 表示不同的计算方法
  - A: 期初 vs 期末
  - B: 期初平均 vs 期末
  - C: 上年同期平均 vs 期末
- **合并报表 vs 母公司报表**: Typrep = A 为合并报表，B 为母公司报表
- **市值的两种计算方法**:
  - 市值A: 考虑所有股份类型
  - 市值B: 仅考虑流通股份

---

*文档生成时间: 2026-03-29*
*来源: D:/Reserach Reports/CogTree/docs/indicators.txt*
