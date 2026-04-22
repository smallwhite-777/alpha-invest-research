# Macro Data Refresh

官网宏观页现在只消费发布目录 `macro-data/data/`，但发布目录的母数据仍然来自 `Knowledgebase/timesfm_deploy/data/`。

## 一键更新命令

```bash
npm run macro:update
```

这个命令会顺序执行两步：

1. `python scripts/refresh_macro_upstream.py`
   刷新上游原始数据
2. `npm run macro:rebuild-data`
   用最新上游数据重建官网发布目录

## 当前接入的数据源

### 美国

- 来源：FRED 公共 CSV
- 写入：
  - `Knowledgebase/timesfm_deploy/data/us_macro/us_macro_fred_daily.csv`
  - `Knowledgebase/timesfm_deploy/data/us_macro/us_macro_fred_monthly.csv`
  - `Knowledgebase/timesfm_deploy/data/us_macro/us_macro_fred_chronos.csv`
  - `Knowledgebase/timesfm_deploy/data/us_macro/fred_series_catalog.csv`

### 中国

- 来源：AKShare 公共接口
- 当前刷新并覆盖的系列：
  - `CN_CPI_NT_YOY`
  - `CN_PPI_YOY`
  - `CN_M1_YOY`
  - `CN_M2_YOY`
  - `PMI_CHN`
  - `GDP_CHN_YOY`
  - `IP_CHN_YOY`
  - `RS_CHN_YOY`
- 写入：
  - `Knowledgebase/timesfm_deploy/data/us_china_joint_chronos.csv`
  - `Knowledgebase/timesfm_deploy/data/china_macro/china_macro_monthly_clean.csv`
  - `Knowledgebase/timesfm_deploy/data/china_macro/china_macro_real_akshare.csv`
  - `Knowledgebase/timesfm_deploy/data/china_macro/china_macro_real_chronos.csv`

## 暂时保留旧值的系列

以下系列当前仍沿用上游现有文件中的旧值，不由一键脚本重抓：

- `REPO7D_CHN`
- `TREASURY10Y_CHN`

原因：现有官网只需要它们可读，且上游公开抓取脚本没有稳定的无鉴权更新链路。

## 运行结果

每次刷新后会生成：

- `macro-data/upstream-refresh.json`

这里会记录本次刷新时间、各数据源是否成功、以及每个系列的最新日期。
