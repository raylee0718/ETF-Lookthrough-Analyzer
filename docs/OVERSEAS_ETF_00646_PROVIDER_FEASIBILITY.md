# 00646 官方持股來源可行性評估

更新日期：2026-05-23

本文件只評估 00646 自動化資料來源可行性，不實作 production provider，不新增一鍵更新按鈕，也不使用第三方網站資料。

## 自動化目標

00646 元大S&P500 若未來要自動化，需能從官方來源轉成：

- `etfSymbol`: `00646`
- `stockSymbol`
- `stockName`
- `weightPercent`
- `asOfDate`
- `source`
- `underlyingMarket`: `US`

00646 屬於海外成分股 ETF。所有股票列應分類為 `US` / 美股成分；期貨、現金、保證金等非股票列不應直接轉成股票成分股。

## 官方來源測試

### 1. 元大 00646 申購買回清單頁

| 項目 | 結果 |
| --- | --- |
| URL | `https://www.yuantaetfs.com/tradeInfo/pcf/00646` |
| method | `GET` |
| response type | HTML / Nuxt SSR page |
| shell fetch | HTTP 200，約 1.06 MB HTML |
| browser CORS | 一般頁面不是 JSON provider；頁面本身 SSR 可讀 |
| 是否完整持股 | 頁面 HTML 只直接顯示前幾筆，但 `window.__NUXT__` 內含完整資料 |
| 是否有權重 | 有，股票列顯示商品權重 |
| 是否有 asOfDate | 有，交易日期 `2026/05/21`，上傳時間 `2026-05-22 14:21:21` |
| 是否可 normalize | 可，但不建議優先解析大型 HTML；應優先使用官方 JSON |

頁面可確認：

- 申購買回清單公告日：`2026/05/25`
- 交易日期：`2026/05/21`
- 投資區域：美國 `97.83%`，現金 `2.17%`
- 股票區塊有 Bloomberg-like ticker，例如 `NVDA UQ`、`AAPL UQ`、`BRK/B UN`
- 期貨區塊含 `ES` 小S&P500指數期貨，權重 `2.15`
- Fund Asset 區塊含現金、保證金、應收股利、應付項目

### 2. 元大 00646 基本資訊頁

| 項目 | 結果 |
| --- | --- |
| URL | `https://www.yuantaetfs.com/product/detail/00646/Basic_information` |
| method | `GET` |
| response type | HTML / Nuxt SSR page |
| shell fetch | HTTP 200 |
| 是否完整持股 | 否，主要是產品資訊與指數資訊 |
| 是否有權重 | 否 |
| 是否有 asOfDate | 有產品/指數相關日期，不是 PCF 持股日期 |
| 是否可 normalize | 不適合作為 holdings provider |

此頁可作為 00646 基本資料佐證，例如：

- Benchmark Index：標普500指數 / S&P500 Index
- Bloomberg Ticker：`00646 TT EQUITY`
- 指數成分股檔數：503
- Review/Rebalance Effective Date：`2026/05/21`

### 3. 元大 ETFAPI bridge PCF/Daily JSON

| 項目 | 結果 |
| --- | --- |
| URL | `https://etfapi.yuantaetfs.com/ectranslation/api/bridge?APIType=ETFAPI&CompanyName=YUANTAFUNDS&PageName=%2FtradeInfo%2Fpcf%2F00646&DeviceId=null&FuncId=PCF%2FDaily&AppName=ETF&Device=3&Platform=ETF&ticker=00646&ndate=` |
| method | `GET` |
| params | `ticker=00646`, `FuncId=PCF/Daily`, `PageName=/tradeInfo/pcf/00646`, `ndate=` |
| response type | JSON |
| shell fetch | HTTP 200，`Content-Type: application/json; charset=utf-8`，約 59 KB |
| browser CORS | 回傳 `Access-Control-Allow-Origin: *`，瀏覽器直抓可能可行；仍需實測 production browser |
| 是否完整持股 | 是，`FundWeights.StockWeights` 回傳 503 筆股票列 |
| 是否有權重 | 是，欄位 `weights` 為直接持股權重百分比 |
| 是否只有股數/金額 | 否；同時有 `qty`，但不需要用股數推估權重 |
| 是否有期貨/現金 | 有，`FundWeights.FutureWeights`、`Cash.CashPosition`、`Cash.Margin` |
| 是否有 asOfDate | 有，`PCF.trandate = 20260521`、`PCF.anndate = 20260525`、`PCF.upddate = 2026-05-22 14:21:21` |
| 是否可 normalize | 可以，適合下一步 parser POC |

實測摘要：

- `PCF.trandate`: `20260521`
- `PCF.anndate`: `20260525`
- `PCF.upddate`: `2026-05-22 14:21:21`
- 股票列：503 筆
- 股票權重合計：約 `97.91%`
- 期貨列：1 筆，`ES` 小S&P500指數期貨，權重 `2.15%`
- 現金 / 保證金 / 應收應付：存在於 `Cash` 區塊
- 投資區域：美國 `97.83%`、現金 `2.17%`

主要 JSON 路徑：

- 股票：`FundWeights.StockWeights[]`
- 期貨：`FundWeights.FutureWeights[]`
- ETF：`FundWeights.ETFWeights[]`
- 債券：`FundWeights.BondWeights[]`
- 現金與保證金：`Cash.CashPosition[]`、`Cash.Margin[]`
- 投資區域：`Cash.InvestArea[]`
- 日期：`PCF.trandate`、`PCF.anndate`、`PCF.upddate`

股票列欄位：

- `code`: Bloomberg-like ticker，例如 `NVDA UQ`、`JPM UN`、`BRK/B UN`
- `name`: 商品名稱，例如 `NVIDIA CORP`
- `ename`: 英文名稱，例如 `NVIDIA Corp`
- `weights`: 直接權重百分比
- `qty`: 商品數量

## Ticker cleanup

00646 parser POC 應沿用既有 `normalizeImportedStockSymbol` 規則：

- `NVDA UQ` -> `NVDA`
- `AAPL UQ` -> `AAPL`
- `JPM UN` -> `JPM`
- `CBOE UF` -> `CBOE`
- `BRK/B UN` -> `BRK.B`
- `BF/B UN` -> `BF.B`

若清理後仍含空白或異常字元，應回傳 warnings，但不應直接中斷整批 parser。

## Futures / cash handling

Step 44 不實作非股票曝險。

下一步 parser POC 建議：

- 只將 `FundWeights.StockWeights[]` 轉成 `EtfConstituent[]`
- `underlyingMarket` 固定設為 `US`
- `FutureWeights`、`CashPosition`、`Margin` 只記錄為 warnings / metadata，不轉成股票成分股
- 未來若要顯示期貨或現金曝險，應新增明確的非股票 exposure type，不要塞進 `stockSymbol`

## 00646 Parser POC

Step 45 已建立 parser proof-of-concept：

- parser function：`parseYuanta00646HoldingsResponse`
- sample fixture：`src/data/sample00646HoldingsResponse.ts`
- smoke utility：`runSample00646ParserSmokeTest`
- official source：元大 ETFAPI bridge PCF/Daily JSON
- stock rows source：`FundWeights.StockWeights[]`

Normalized fields：

- `etfSymbol`: `00646`
- `stockSymbol`: 由 `code` / `stkcd` 清理後取得
- `stockName`: 優先使用 `name`，備援 `ename`
- `weightPercent`: 由 `weights` / `weight` 解析
- `asOfDate`: 優先使用 context，否則使用 `PCF.trandate`
- `source`: 預設 `元大投信 00646 官方持股資料`
- `underlyingMarket`: 固定 `US`

Ticker cleanup：

- `NVDA UQ` -> `NVDA`
- `AAPL UQ` -> `AAPL`
- `JPM UN` -> `JPM`
- `CBOE UF` -> `CBOE`
- `BRK/B UN` -> `BRK.B`
- `BF/B UN` -> `BF.B`

Weight parsing：

- 接受 number，例如 `8.18`
- 接受 string，例如 `"8.18"`、`"8.18%"`
- 跳過空值、`--`、無效數字或負數，並加入 warnings
- 不會自行補權重或用股數推估權重

Futures / cash handling：

- `FutureWeights` 不會轉成 `EtfConstituent`
- `CashPosition` 不會轉成 `EtfConstituent`
- `Margin` 不會轉成 `EtfConstituent`
- parser 會回傳 `ignoredNonStockRows` 與 warning，提醒非股票列已排除

00646 的股票列來自美股 / S&P 500 類成分，parser POC 對所有有效股票列固定設定 `underlyingMarket: "US"`，讓穿透分析顯示為美股成分。

此 POC 尚未接入 production UI：

- 沒有新增 00646 更新按鈕
- 沒有加入「一鍵更新目前持有 ETF」
- 沒有自動寫入 localStorage
- CSV / 貼上表格仍是目前可用 fallback

## Serverless proxy 評估

00646 官方 JSON 回傳 `Access-Control-Allow-Origin: *`，因此瀏覽器端直抓可能可行；但仍需在 production browser 實測。

即使 CORS 可行，若未來要維持一致架構，仍可透過既有 `/api/etf-holdings` serverless proxy 統一：

- symbol whitelist
- 官方 URL 固定，不開放任意 URL proxy
- parser / warnings / normalized response shape
- 短期 cache header

目前判斷：`ready_for_parser_poc`，不需要先做更多來源研究。

## 最終決策

Decision: `ready_for_parser_poc`

理由：

- 官方 Yuanta PCF/Daily JSON 已確認可 shell fetch。
- JSON 有完整 503 筆股票列。
- `weights` 可直接作為 `weightPercent`。
- `PCF.trandate` 可作為 `asOfDate`。
- 00646 ticker cleanup 規則已在 Step 42 建立。
- 期貨 / 現金列存在，但可在 parser POC 中先排除股票 constituents 之外。

不在 Step 44 實作：

- 不新增 00646 production provider。
- 不新增 00646 自動更新按鈕。
- 不抓第三方 S&P 500 成分股。
- 不新增匯率換算。
- 不改現有 0050 / 00981A 自動更新流程。
