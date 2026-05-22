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
- support decision：`needs_serverless_proxy`

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

## 00981A 官方 PCF 深度驗證

Step 29 針對統一投信官方 PCF 頁做進一步驗證。結論是：官方頁面確實 expose 可用的 AJAX JSON 與 Excel 匯出來源，JSON 已包含可直接對應 `weightPercent` 的 `NavRate` 欄位；但該官方端點沒有回傳 CORS header，純前端瀏覽器 fetch 很可能被擋。因此目前不直接接 production provider，決策改為 `needs_serverless_proxy`，MVP 仍建議 CSV 匯入。

### 測試端點

| candidate source | method | request shape | response type | shell fetch | browser / CORS | holdings result |
| --- | --- | --- | --- | --- | --- | --- |
| `https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=49YTW` | GET | query：`fundCode=49YTW` | HTML | 可讀，HTTP 200 | 無 `Access-Control-Allow-Origin`；頁面本身不是 JSON provider | 內含 Vue/jQuery PCF app、基金清單與 AJAX request 程式碼 |
| `https://www.ezmoney.com.tw/ETF/Transaction/GetPCF` | POST | JSON body：`{"fundCode":"49YTW","date":"115/05/22","specificDate":true}`；headers：`Content-Type: application/json; charset=utf-8`、`X-Requested-With: XMLHttpRequest`、`Referer: ...PCF?fundCode=49YTW` | JSON | 可讀，HTTP 200 | response 無 `Access-Control-Allow-Origin`；OPTIONS preflight 回一般 HTML error page，可能需要 serverless proxy | 可取得完整股票明細，含股票代號、名稱、股數、金額與 `NavRate` |
| `https://www.ezmoney.com.tw/ETF/Transaction/PCFExcelNPOI?fundCode=49YTW&date=115/05/22&specificDate=true` | GET | query：`fundCode`、民國日期 `date`、`specificDate` | Excel `.xlsx` | 可讀，HTTP 200，檔名 `ETF_Portfolio_Composition_File_20260521.xlsx` | 無 `Access-Control-Allow-Origin`；直接下載不適合目前前端自動 provider | Excel shared strings 內含股票代號、股票名稱、股數、持股權重 |

### JSON 欄位驗證

`GetPCF` 成功回傳：

- `pcf`：10 筆 PCF 摘要資料。
- `fund`：00981A 基金基本資料。
- `asset`：2 個 asset group，其中 `AssetCode: "ST"` 是股票。
- `assetDetailSchema`：欄位 schema；股票 schema 將 `NavRate` 標示為「持股權重」。

股票明細位於：

`asset[] -> AssetCode === "ST" -> Details[]`

可用欄位：

- `DetailCode`：股票代號，可映射為 `stockSymbol`。
- `DetailName`：股票名稱，可映射為 `stockName`。
- `NavRate`：持股權重，可映射為 `weightPercent`。
- `TranDate`：明細交易日期，可映射或輔助映射 `asOfDate`。
- `Share`：股數。
- `Amount`：持股金額。

本次 shell 測試結果：

- stock rows：53 筆。
- `NavRate` 合計：約 95.68%，表示股票曝險之外可能仍有現金或其他部位。
- top rows 範例：2330 台積電 9.93%、2383 台光電 8.46%、2345 智邦 5.90%、2454 聯發科 5.78%、2308 台達電 5.09%。
- PCF `TranDate`：2026-05-21。
- PCF `PostDate`：2026-05-22。

### Normalization 可行性

可以從官方 JSON 直接組成：

- `etfSymbol`：固定 `00981A`
- `stockSymbol`：`DetailCode`
- `stockName`：`DetailName`
- `weightPercent`：`NavRate`
- `asOfDate`：優先用 PCF `TranDate` 或股票明細 `TranDate`
- `source`：`統一投信官方 PCF`

### 仍不直接接 provider 的原因

- 官方 JSON 端點 shell 可讀，但 response 沒有 CORS header。
- `OPTIONS` preflight 測試沒有回可用的 `Access-Control-Allow-*`，而是一般 HTML error page。
- 前端 production site 若從不同 origin 呼叫 `https://www.ezmoney.com.tw/ETF/Transaction/GetPCF`，高機率會被瀏覽器阻擋。
- 若只在本機 shell 或 serverless function 讀取，資料結構已足夠進入 parser proof-of-concept。

### 支援決策

- support decision：`needs_serverless_proxy`
- 原因：官方來源穩定性與欄位完整度看起來足夠，但 frontend-only 瀏覽器 fetch 可能被 CORS 擋住。
- MVP current action：仍使用 CSV 匯入。
- 下一步：不要直接在 UI 加 auto-fetch；先做一個小型 00981A parser proof-of-concept 或 serverless proxy 設計評估。

## 00981A Parser POC

Step 30 已加入純 parser proof-of-concept，用來驗證「統一投信官方 PCF JSON -> `EtfConstituent[]`」的資料轉換，不會在瀏覽器 UI 呼叫官方端點，也不會提供 00981A 的儲存 provider 結果按鈕。

### Parser status

- parser function：`parseUniPresident00981APcfResponse`
- sample fixture：`src/data/sample00981APcfResponse.ts`
- smoke utility：`runSample00981APcfParserSmokeTest`
- official endpoint：`https://www.ezmoney.com.tw/ETF/Transaction/GetPCF`
- request method：`POST`
- request body example：`{"fundCode":"49YTW","date":"115/05/22","specificDate":true}`

### Holdings row location

Parser 只依 Step 29 驗證到的官方 JSON 結構解析：

`asset[] -> AssetCode === "ST" -> Details[]`

目前不解析畫面 HTML，也不解析第三方網站資料。

### Normalized output fields

- `etfSymbol`：`00981A`
- `stockSymbol`：從 `DetailCode` 取得，會 trim、轉大寫並移除 `.TW` / `.TWO` 等尾碼。
- `stockName`：從 `DetailName` 取得。
- `weightPercent`：從 `NavRate` / 「持股權重」取得，支援 number、`"3.25"`、`"3.25%"`，無效或空值不會補假資料。
- `asOfDate`：優先使用 context 傳入日期，其次使用股票明細 `TranDate`，再嘗試 PCF 摘要日期。
- `source`：預設 `統一投信 00981A 官方 PCF`。

### Invalid row handling

- 若找不到 `asset[AssetCode=ST].Details`，回傳 `errors`，不產生 constituents。
- 若單列缺少有效股票代號、名稱或 `NavRate` 權重，該列會被略過並加入 `warnings`。
- 若 JSON 有股票明細但沒有任何有效權重，回傳 `errors`。
- PCF 若僅提供股數但沒有權重或市值，不能直接用於穿透分析，除非另外取得價格或市值並可靠換算。本 parser 不會偽造權重。

### 為什麼仍不是 production frontend provider

- 官方 JSON 端點 shell 可讀，但沒有回傳 CORS header。
- 前端瀏覽器直接跨網域呼叫 `GetPCF` 仍可能被 CORS / preflight 阻擋。
- 目前沒有 serverless proxy，也沒有把 00981A 接到 UI auto-fetch / save flow。
- MVP fallback 仍是 CSV 匯入。

### 下一步

若要往自動化前進，建議先評估極薄 serverless proxy，讓 proxy 負責呼叫官方 `GetPCF`，前端只接收已正規化或可解析的官方 JSON；在 proxy / parser 穩定前，不應把 00981A 顯示成 production-ready provider。

## 00994A

- ETF symbol：00994A
- ETF name：第一金台股趨勢優選主動式 ETF / 主動第一金台股優
- issuer：第一金證券投資信託股份有限公司
- support decision：`ready_for_parser_poc`

### 官方候選來源

| URL | 來源 | source type | shell fetch | browser fetch / CORS | 內容判斷 |
| --- | --- | --- | --- | --- | --- |
| `https://www.fsitc.com.tw/FundDetail.aspx?ID=182` | 第一金投信基金詳細頁 | HTML / dynamic AJAX | 可讀，HTTP 200，頁面含申購買回清單 tab 與 `WebAPI.aspx/Get_hd` 呼叫 | 未見 `Access-Control-Allow-Origin`；頁面內 AJAX 同源可用，但外部前端跨域可能被擋 | 可確認 FundID 182、股票代號 00994A、PCF 顯示區與官方 AJAX request shape |
| `https://www.fsitc.com.tw/WebAPI.aspx/Get_hd` | 第一金投信 FundDetail AJAX | JSON via POST | 可讀，HTTP 200，回傳 `application/json; charset=utf-8` | response 無 `Access-Control-Allow-Origin`；OPTIONS preflight 無可用 CORS header | 可取得完整股票明細，含股票代號、股票名稱、持股權重與股數 |
| `https://www.fsitc.com.tw/ETFList.aspx` | 第一金投信 ETF list | HTML | 可讀，HTTP 200 | 未見 CORS header | ETF 列表 / 導航，不是持股資料來源 |
| `https://www.fsitc.com.tw/act/202512_994AETF/index.html` | 第一金投信官方產品 / 募集頁 | HTML | 可讀，HTTP 200 | 未見 `Access-Control-Allow-Origin`；頁面 CSP 允許多來源但不等於可跨域 fetch | 產品介紹、策略與募集資訊；有公開說明書、簡式公開說明書、DM 連結；沒有完整持股權重 |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=1&id=182` | 第一金投信公開說明書 | PDF | 可讀，HTTP 200，PDF 約 176 頁 | PDF 可下載但不適合前端即時 provider | 基金契約、投資範圍與揭露規範；不是每日完整持股 |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=2&id=182` | 第一金投信簡式公開說明書 | PDF | 可讀，HTTP 200，PDF 約 4 頁 | 同上 | 產品摘要；不是完整持股 |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=3&id=182` | 第一金投信基金月報 / 文件下載 | PDF | 可讀，HTTP 200 | PDF 可下載但不適合前端即時 provider | 可能包含揭露資料，但不是每日完整 PCF JSON |
| `https://www.twse.com.tw/rwd/zh/ETF/productContent?id=00994A&response=json` | TWSE ETF productContent API | JSON | 可讀，HTTP 200，且 `Access-Control-Allow-Origin: *` | 瀏覽器 fetch 較可能可行 | 可確認 ETF 商品規格與 PCF 入口，PCF 欄位指向第一金 FundDetail；不含持股明細 |
| `https://www.twse.com.tw/zh/products/securities/etf/products/content.html?00994A=` | TWSE ETF product info page | HTML | 可讀，HTTP 200 | 頁面本身不是資料 API | 頁面內 `data-api="/ETF/productContent"`，實際資料 API 為 rwd productContent |
| `https://www.twse.com.tw/zh/ETFortune/newsDetail/8a8216d69a3d6cf9019b8d7c0d7006a7` | TWSE e添富新上市 ETF 簡介 | HTML | 可讀，HTTP 200 | TWSE 頁可讀；不是持股 provider | 可確認上市代號、發行投信、成分股檔數 30-50 檔等資訊 |
| `https://www.twse.com.tw/zh/ETFReport/ETFWeekly?date=&response=html` | TWSE ETF 週成交資訊 | HTML | 可讀，HTTP 200，且有 `Access-Control-Allow-Origin: *` | 瀏覽器 fetch 較可能可行 | 只有交易統計，不含持股 |

### 是否包含可用持股資訊

- full holdings：已在第一金投信 `WebAPI.aspx/Get_hd` 找到可用官方股票持股明細。
- partial holdings：公開說明書、簡式公開說明書、DM 與 TWSE 商品頁只提供商品資訊或入口。
- top holdings only：官方產品頁中的「模擬投資組合」屬募集/示意資料，不應作為真實持股 provider。
- PCF basket：第一金 FundDetail 的「申購買回清單」tab 以 AJAX 載入 PCF / holdings 區塊。
- weights：`Get_hd` group `1` 的 `C` 欄為持股權重。
- shares only：同列 `D` 欄為股數；不是 shares-only，因為 `C` 已提供權重。
- date：`Get_hd` 回傳 `sdate`，可作為 `asOfDate`。

### EtfConstituent normalization

- stockSymbol：`Get_hd` group `1` 的 `A` 欄。
- stockName：`Get_hd` group `1` 的 `B` 欄。
- weightPercent：`Get_hd` group `1` 的 `C` 欄。
- asOfDate：`Get_hd` 的 `sdate`。
- source：可標示為「第一金投信 00994A 官方申購買回清單」。

### 風險 notes

- 第一金 FundDetail AJAX 是官方候選來源，但仍需 parser proof-of-concept 驗證欄位穩定性與錯誤處理。
- `Get_hd` shell 可讀，但未回 CORS header；外部前端若直接跨網域 POST，可能被 preflight 擋住。
- TWSE productContent 可確認 PCF 入口指向第一金 FundDetail，但不提供持股明細。
- 第三方網站看似已有持股快照，但不屬官方來源，本專案不得用它們當 provider input。
- 目前建議：CSV 匯入。

## 00994A 官方來源深度驗證

Step 31 針對第一金投信與 TWSE 官方來源做深度驗證。結論是：00994A 已找到第一金投信官方 FundDetail AJAX 端點，可取得股票代號、股票名稱、持股權重、股數與資料日期，資料結構足以進入 parser proof-of-concept；但該端點沒有回傳 CORS header，純前端 production provider 仍可能需要 serverless proxy。因此本步驟只更新 feasibility 與 capability notes，不加入 parser、fetch button 或儲存 provider 結果流程。

### 測試端點

| candidate source | method | request shape | response type | shell fetch | browser / CORS | holdings result |
| --- | --- | --- | --- | --- | --- | --- |
| `https://www.fsitc.com.tw/FundDetail.aspx?ID=182` | GET | query：`ID=182` | HTML | 可讀，HTTP 200，約 5 MB | 無 `Access-Control-Allow-Origin`；頁面同源 AJAX 可用 | HTML 內含 `var pStrFundID = '182'` 與 `Get_hd()` AJAX 程式碼 |
| `https://www.fsitc.com.tw/WebAPI.aspx/Get_hd` | POST | JSON body：`{"pStrFundID":"182","pStrDate":""}`；headers：`Content-Type: application/json; charset=utf-8`、`X-Requested-With: XMLHttpRequest`、`Referer: ...FundDetail.aspx?ID=182` | JSON wrapper，內層 `d` 為 JSON string | 可讀，HTTP 200 | response 無 `Access-Control-Allow-Origin`；OPTIONS preflight 回 200 但沒有 `Access-Control-Allow-*` | 可取得 42 筆股票列，含 `A` 股票代號、`B` 股票名稱、`C` 持股權重、`D` 股數 |
| `https://www.fsitc.com.tw/WebAPI.aspx/Get_BuySellA` | POST | JSON body：`{"pStrFundID":"182","pStrDate":""}` | JSON wrapper | 可讀，HTTP 200 | 無 CORS header | 申購買回摘要，例如基金淨資產價值、每單位淨值、基數約當市值等；不是股票明細 |
| `https://www.fsitc.com.tw/WebAPI.aspx/Get_BuySellB` | POST | 同上 | JSON wrapper | 可讀，HTTP 200 | 無 CORS header | 本次回傳空白 placeholder，不是持股來源 |
| `https://www.fsitc.com.tw/WebAPI.aspx/Get_BuySellC` | POST | 同上 | JSON wrapper | 可讀，HTTP 200 | 無 CORS header | 本次回傳空白 placeholder，不是持股來源 |
| `https://www.fsitc.com.tw/ETFList.aspx` | GET | none | HTML | 可讀，HTTP 200 | 無 CORS header | ETF list / navigation；不含完整持股 |
| `https://www.fsitc.com.tw/act/202512_994AETF/index.html` | GET | none | HTML | 可讀，HTTP 200 | 無 CORS header | campaign page，meta refresh 指向 FundDetail；只連到公開說明書、簡式公開說明書、DM、申購書 |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=1&id=182` | GET | query：`path=1&id=182` | PDF | 可讀，HTTP 200 | 無 CORS header | 公開說明書，不是每日完整持股 JSON |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=2&id=182` | GET | query：`path=2&id=182` | PDF | 可讀，HTTP 200 | 無 CORS header | 簡式公開說明書，不是每日完整持股 JSON |
| `https://www.fsitc.com.tw/ViewFile.aspx?path=3&id=182` | GET | query：`path=3&id=182` | PDF | 可讀，HTTP 200 | 無 CORS header | 官方文件下載，不是目前 parser 首選來源 |
| `https://www.twse.com.tw/rwd/zh/ETF/productContent?id=00994A&response=json` | GET | query：`id=00994A&response=json` | JSON | 可讀，HTTP 200，`Access-Control-Allow-Origin: *` | 瀏覽器 fetch 較可能可行 | 可確認 ETF 商品規格與 PCF 入口：`https://www.fsitc.com.tw/FundDetail.aspx?ID=182#TabLinkdivEditTab9` |

### `Get_hd` 欄位驗證

`Get_hd` 回傳外層 JSON 形如 `{ "d": "[...]" }`，其中 `d` 是 JSON string。內層列使用 `group` 區分資料表：

- `group: "1"`：股票。欄位 `A` = 股票代號、`B` = 股票名稱、`C` = 持股權重、`D` = 股數。
- `group: "4"`：其他資產。
- `group: "5"`：資產權重。

本次 shell 測試結果：

- request：`POST https://www.fsitc.com.tw/WebAPI.aspx/Get_hd`
- body：`{"pStrFundID":"182","pStrDate":""}`
- latest returned date：`2026-05-21`
- stock rows：42 筆。
- stock weight sum：約 95.60%，表示股票之外仍可能有現金或其他資產。
- top rows 範例：2330 台積電 16.01%、2383 台光電 6.50%、3037 欣興 4.95%、2345 智邦 4.69%、6669 緯穎 4.60%。

### Normalization 可行性

可以從官方 JSON 組成：

- `etfSymbol`：固定 `00994A`
- `stockSymbol`：`group === "1"` 的 `A`
- `stockName`：`group === "1"` 的 `B`
- `weightPercent`：`group === "1"` 的 `C`
- `asOfDate`：`sdate`
- `source`：`第一金投信 00994A 官方申購買回清單`

### CORS 與 production 風險

- `Get_hd` shell 可讀，但 response 沒有 `Access-Control-Allow-Origin`。
- 帶 `Origin` 的 POST 仍沒有 CORS header。
- `OPTIONS` preflight 回 HTTP 200，但沒有 `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers`。
- 因此官方資料來源可能需要 serverless proxy 才能自動化。MVP 仍建議使用 CSV 匯入。

### 支援決策

- support decision：`ready_for_parser_poc`
- 原因：官方來源已含完整股票明細與可用 `weightPercent`，但尚未做 parser proof-of-concept，且前端跨域自動化可能被 CORS 擋住。
- MVP current action：仍使用 CSV 匯入。
- 下一步：實作 00994A parser proof-of-concept；若要接 production provider，再評估 serverless proxy。

## 00994A Parser POC

Step 32 已加入純 parser proof-of-concept，用來驗證「第一金投信官方 `Get_hd` JSON -> `EtfConstituent[]`」的資料轉換。此步驟不會在瀏覽器 UI 呼叫官方端點，也不會提供 00994A 的儲存 provider 結果按鈕。

### Parser status

- parser function：`parseFirst00994AGetHdResponse`
- sample fixture：`src/data/sample00994AGetHdResponse.ts`
- smoke utility：`runSample00994AParserSmokeTest`
- official endpoint：`https://www.fsitc.com.tw/WebAPI.aspx/Get_hd`
- request method：`POST`
- request body example：`{"pStrFundID":"182","pStrDate":""}`

### Holdings row location

Parser 只依 Step 31 驗證到的官方 JSON 結構解析：

1. 外層 JSON：`{ "d": "[...]" }`
2. 內層 `d`：JSON string，解析後為 array。
3. 股票持股列：`row.group === "1"`。

目前不解析畫面 HTML，也不解析第三方網站資料。

### Normalized output fields

- `etfSymbol`：`00994A`
- `stockSymbol`：從 `A` 取得，會 trim、轉大寫並移除 `.TW` / `.TWO` 等尾碼。
- `stockName`：從 `B` 取得。
- `weightPercent`：從 `C` / 「持股權重」取得，支援 number、`"3.25"`、`"3.25%"`，無效或空值不會補假資料。
- `asOfDate`：優先使用 context 傳入日期，其次使用股票列或其他列的 `sdate`。
- `source`：預設 `第一金投信 00994A 官方持股資料`。

### Stock fields

- `A`：股票代號，可映射為 `stockSymbol`。
- `B`：股票名稱，可映射為 `stockName`。
- `C`：持股權重，可映射為 `weightPercent`。
- `D`：股數，只作為診斷資訊；目前不寫入 `EtfConstituent`。
- `sdate`：資料日期，可映射為 `asOfDate`。

### Invalid row handling

- 若外層 JSON 或內層 `d` JSON string 無法解析，回傳 `errors`。
- 若找不到任何資料列或找不到 `group=1` 股票列，回傳 `errors`。
- 若單列缺少有效股票代號、名稱或 `C` 欄持股權重，該列會被略過並加入 `warnings`。
- 若 JSON 有股票明細但沒有任何有效權重，回傳 `errors`。
- Parser 不會用股數推估或偽造權重。

### 為什麼仍不是 production frontend provider

- 官方 `Get_hd` 端點 shell 可讀，但沒有回傳 CORS header。
- 前端瀏覽器直接跨網域呼叫 `Get_hd` 仍可能被 CORS / preflight 阻擋。
- 目前沒有 serverless proxy，也沒有把 00994A 接到 UI auto-fetch / save flow。
- MVP fallback 仍是 CSV 匯入。

### 下一步

若要往自動化前進，建議先評估極薄 serverless proxy，讓 proxy 負責呼叫官方 `Get_hd`，前端只接收已正規化或可解析的官方 JSON；在 proxy / parser 實機穩定前，不應把 00994A 顯示成 production-ready provider。

## 總結

| ETF | 決策 | 原因 | 下一步 |
| --- | --- | --- | --- |
| 00981A | `needs_serverless_proxy` | 官方 PCF AJAX 已確認含完整股票明細與 `NavRate` 權重，且 parser POC 已可正規化；但瀏覽器 CORS 可能阻擋 | 先用 CSV；下一步評估 serverless proxy |
| 00994A | `ready_for_parser_poc` | 第一金官方 FundDetail AJAX 已確認含完整股票明細與持股權重，且 parser POC 已可正規化；但瀏覽器 CORS 可能阻擋 | 先用 CSV；production provider 需評估 proxy |

兩檔目前都不建議直接實作 production frontend provider。00981A 與 00994A 都已有 parser POC；若只有 shell 可讀、瀏覽器不可讀，再評估 serverless proxy。

## Serverless Proxy 評估

Step 33 已加入極薄 Vercel serverless proxy：`api/etf-holdings.ts`。

Endpoint examples：

- `/api/etf-holdings?symbol=0050`
- `/api/etf-holdings?symbol=00981A`
- `/api/etf-holdings?symbol=00994A`

設計限制：

- 只接受 `0050`、`00981A`、`00994A` 三個白名單 symbol。
- 只用 `GET` 對前端開放；serverless function 內部可依官方 issuer endpoint 需要發出 `POST`。
- 不接受 user-provided URL，因此不是任意 proxy。
- 不需要 secrets 或 `.env`。
- 不存 user data、不登入、不使用 database、不排程、不做背景更新。
- cache header 使用短期 CDN cache：`s-maxage=1800, stale-while-revalidate=1800`。

目前 proxy 回傳 normalized constituents，而不是 raw official JSON。Parser helpers 沿用現有 POC exports：

- `0050`：`parseYuanta0050PcfResponse`
- `00981A`：`parseUniPresident00981APcfResponse`
- `00994A`：`parseFirst00994AGetHdResponse`

Supported source mapping：

| Symbol | Official source | Request | Parser | Status |
| --- | --- | --- | --- | --- |
| `0050` | `https://etfapi.yuantaetfs.com/ectranslation/api/bridge?...ticker=0050&ndate=` | GET | `parseYuanta0050PcfResponse` | Implemented |
| `00981A` | `https://www.ezmoney.com.tw/ETF/Transaction/GetPCF` | POST `{"fundCode":"49YTW","date":"<Taipei Minguo date>","specificDate":true}` | `parseUniPresident00981APcfResponse` | Implemented with endpoint error reporting |
| `00994A` | `https://www.fsitc.com.tw/WebAPI.aspx/Get_hd` | POST `{"pStrFundID":"182","pStrDate":""}` | `parseFirst00994AGetHdResponse` | Implemented |

Local-first note：proxy 只接收 ETF symbol，例如 `symbol=00994A`。使用者 portfolio、交易、價格、手動 / CSV 匯入的 ETF constituents 仍留在 browser localStorage。Step 33 沒有加入 production auto-fetch UI，也沒有加入 one-click update all ETFs。

## 00981A Vercel Proxy Troubleshooting

Step 35 將焦點調整為：

1. `0050`
2. `00981A`

`00994A` 已非目前使用者優先標的，保留為低優先度 / CSV fallback；既有 proxy 與 parser 不移除，但不列入主要自動化焦點。

### Tested request variants

Official endpoint remains:

`POST https://www.ezmoney.com.tw/ETF/Transaction/GetPCF`

Official page remains:

`https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=49YTW`

Tested variants:

| Variant | Body | Headers | Shell / Node result | Vercel expectation |
| --- | --- | --- | --- | --- |
| `json-current-date-cookie-redirect` | `{"fundCode":"49YTW","date":"<ROC date>","specificDate":true}` | JSON, Accept, X-Requested-With, Referer, Origin, User-Agent | Initial Node fetch loops on same-URL `307`; manual redirect shows `__nxquid` cookie; repeating POST with cookie returns HTTP `200` JSON | Primary variant after Step 35 |
| `json-empty-date-cookie-redirect` | `{"fundCode":"49YTW","date":"","specificDate":false}` | same | Tested as fallback request shape | Fallback only |
| `json-no-date-cookie-redirect` | `{"fundCode":"49YTW"}` | same | Tested as fallback request shape | Fallback only |
| `form-current-date-cookie-redirect` | form-urlencoded `fundCode`, `date`, `specificDate` | form Content-Type plus AJAX headers | Tested as fallback; official docs still point to JSON | Fallback only |

### Finding

The issuer endpoint does not simply return JSON to Node/Vercel fetch. It first returns a same-URL `307 Temporary Redirect` with a `Set-Cookie` header similar to `__nxquid=...`. Automatic redirect handling can exceed redirect limits because the redirect target is the same URL. A manual retry with the received cookie succeeds from local Node for the documented JSON request.

Step 35 updates the proxy to handle this cookie redirect narrowly for 00981A and to return structured diagnostics if all official request variants fail. Diagnostics include request URL, method, variant name, response status, response content-type, short response preview, redirect location, whether a cookie was received, fetch error name/message, fetch cause, and whether the failure happened before any response.

### Recommendation

If Vercel succeeds after the cookie redirect fix, 00981A can move toward a diagnostic-only UI test before any save/update flow. If Vercel still fails, keep 00981A on CSV fallback and consider an alternate proxy runtime only if 00981A remains important enough to justify it. Do not block 0050 work on 00981A.
