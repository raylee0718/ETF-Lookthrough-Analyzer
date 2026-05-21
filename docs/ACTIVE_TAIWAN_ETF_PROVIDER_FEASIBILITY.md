# 台灣主動式 ETF 官方持股來源可行性盤點

更新日期：2026-05-21

本文件只盤點官方或半官方來源是否適合成為 ETF 成分股 provider。第三方網站（例如 WantGoo、CMoney、Pocket、MoneyDJ、StockFeel、ETF 資訊網等）可作為人工比對參考，但不得作為官方 provider 來源，也不得將第三方 scraped data 直接存入 ETF 成分股資料。

## 判斷原則

- 優先來源：發行投信官網、投信官網可下載檔、TWSE e添富 / TWSE 報表、公開資訊觀測站。
- 只有在可取得 `stockSymbol`、`stockName`、`weightPercent`、`asOfDate`、`source` 時，才可考慮 `ready_for_provider`。
- 若只有 PCF basket 股數、交易週報、募集頁、公開說明書、產品簡介或 top holdings，暫不自動覆蓋成分股。
- 若 shell 可讀但瀏覽器可能被 CORS 或動態頁阻擋，先維持 CSV fallback，未來再評估 serverless proxy。

## 00981A

- ETF symbol：00981A
- ETF name：主動統一台股增長
- issuer：統一證券投資信託股份有限公司
- support decision：`csv_fallback_only`

### 官方候選來源

| URL | 來源 | source type | shell fetch | browser fetch / CORS | 內容判斷 |
| --- | --- | --- | --- | --- | --- |
| `https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=49YTW` | 統一投信官方 PCF 頁 | HTML / dynamic form / possible Excel export | 可讀，HTTP 200，頁面含 PCF 互動程式 | 未見 `Access-Control-Allow-Origin`；瀏覽器跨網域 fetch 可能被擋 | 看得到申購買回清單流程；尚未確認能穩定取出完整股票權重 |
| `https://www.twse.com.tw/zh/ETFortune/etfInfo/00981A` | TWSE e添富 ETF 商品頁 | HTML | shell 可讀，HTTP 200；瀏覽器/部分 agent 可能遇安全頁 | TWSE 頁面本身不適合作為前端 provider | 可確認 ETF 基本資料、發行公司與策略，不是完整持股權重來源 |
| `https://www.twse.com.tw/zh/ETFReport/ETFWeekly?date=&response=html` | TWSE ETF 週成交資訊 | HTML | 可讀，HTTP 200，且有 `Access-Control-Allow-Origin: *` | 瀏覽器 fetch 較可能可行 | 只有成交金額、成交股數、成交筆數與均價，不含持股 |

### 是否包含可用持股資訊

- full holdings：尚未確認。
- partial holdings：未確認。
- top holdings only：未在官方候選來源中確認。
- PCF basket：統一投信 PCF 頁存在，但資料取出方式仍需進一步解析。
- weights：尚未確認可由官方頁穩定取得。
- shares only：PCF 可能提供申購買回清單相關數量，但尚未確認可用欄位。
- date：PCF 頁流程有查詢日期概念；尚未確認可穩定解析。

### EtfConstituent normalization

- stockSymbol：未確認穩定來源。
- stockName：未確認穩定來源。
- weightPercent：未確認穩定來源，這是目前最大 blocker。
- asOfDate：未確認穩定來源。
- source：可標示為「統一投信官方 PCF」或 TWSE；但尚未達 provider 條件。

### 風險 notes

- 統一投信 PCF 頁是官方候選來源，但目前是動態頁與互動查詢流程，不宜直接做 fragile HTML scraping。
- shell 可讀 PCF 頁面，但沒有確認前端瀏覽器能跨網域直接抓取資料。
- 若下一步要實作 provider，應先獨立確認 `/ETF/Transaction/GetPCF` 或 Excel export 是否可用、欄位是否包含股票權重，而不是直接解析畫面 HTML。
- 目前建議：CSV 匯入。

## 00994A

- ETF symbol：00994A
- ETF name：第一金台股趨勢優選主動式 ETF / 主動第一金台股優
- issuer：第一金證券投資信託股份有限公司
- support decision：`csv_fallback_only`

### 官方候選來源

| URL | 來源 | source type | shell fetch | browser fetch / CORS | 內容判斷 |
| --- | --- | --- | --- | --- | --- |
| `https://www.fsitc.com.tw/act/202512_994AETF/index.html` | 第一金投信官方產品 / 募集頁 | HTML | 可讀，HTTP 200 | 未見 `Access-Control-Allow-Origin`；頁面 CSP 允許多來源但不等於可跨域 fetch | 產品介紹、策略與募集資訊；有公開說明書、簡式公開說明書、DM 連結；沒有完整持股權重 |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=1&id=182` | 第一金投信公開說明書 | PDF | 可讀，HTTP 200，PDF 約 176 頁 | PDF 可下載但不適合前端即時 provider | 基金契約、投資範圍與揭露規範；不是每日完整持股 |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=2&id=182` | 第一金投信簡式公開說明書 | PDF | 可讀，HTTP 200，PDF 約 4 頁 | 同上 | 產品摘要；不是完整持股 |
| `https://www.twse.com.tw/zh/ETFortune/newsDetail/8a8216d69a3d6cf9019b8d7c0d7006a7` | TWSE e添富新上市 ETF 簡介 | HTML | 可讀，HTTP 200 | TWSE 頁可讀；不是持股 provider | 可確認上市代號、發行投信、成分股檔數 30-50 檔等資訊 |
| `https://www.twse.com.tw/zh/ETFReport/ETFWeekly?date=&response=html` | TWSE ETF 週成交資訊 | HTML | 可讀，HTTP 200，且有 `Access-Control-Allow-Origin: *` | 瀏覽器 fetch 較可能可行 | 只有交易統計，不含持股 |

### 是否包含可用持股資訊

- full holdings：未發現官方完整持股來源。
- partial holdings：未發現可用官方來源。
- top holdings only：官方產品頁中的「模擬投資組合」屬募集/示意資料，不應作為真實持股 provider。
- PCF basket：未在第一金官方頁中找到可直接下載的 PCF / basket / holdings 檔。
- weights：未在官方候選來源找到真實持股權重。
- shares only：未找到。
- date：公開說明書與產品頁有文件日期 / 募集日期，但不是持股日期。

### EtfConstituent normalization

- stockSymbol：無官方穩定來源。
- stockName：無官方穩定來源。
- weightPercent：無官方穩定來源。
- asOfDate：無官方持股日期來源。
- source：可標示官方文件來源，但文件內容不足以轉成 `EtfConstituent`。

### 風險 notes

- 第一金官方產品頁目前偏產品宣傳與募集資料，不是持股揭露 API。
- TWSE 新上市簡介揭露「持股檔數 30-50 檔」，但不揭露股票清單或權重。
- 第三方網站看似已有持股快照，但不屬官方來源，本專案不得用它們當 provider input。
- 目前建議：CSV 匯入。

## 總結

| ETF | 決策 | 原因 | 下一步 |
| --- | --- | --- | --- |
| 00981A | `csv_fallback_only` | 有官方 PCF 頁候選，但尚未確認可穩定取得完整股票權重，且瀏覽器可能被 CORS / 動態流程阻擋 | 先用 CSV；若要前進，優先驗證官方 PCF AJAX / Excel export |
| 00994A | `csv_fallback_only` | 官方頁與 TWSE 頁可確認商品資訊，但未找到完整持股權重來源 | 先用 CSV；持續觀察第一金是否新增 PCF / holdings download |

兩檔目前都不建議實作自動 provider。若未來官方來源確認具備完整持股與權重，下一步再做小型 parser proof-of-concept；若只有 shell 可讀、瀏覽器不可讀，再評估 serverless proxy。
