# ETF Lookthrough Analyzer

中文名稱：ETF 穿透持股分析器

## 專案目的

ETF Lookthrough Analyzer 是一個 local-first 的個人投資分析工具，用來協助你整理自己的 ETF / 股票投資組合，並把 ETF 持股穿透成底層股票曝險。

這個工具目前支援：

- 輸入個人持股
- 匯入 ETF 成分股資料
- 計算穿透持股曝險
- 分析 ETF 之間的持股重疊
- 管理交易紀錄
- 使用手動價格表估算交易模式下的持股市值
- 匯出 / 匯入 JSON 備份
- 匯出 CSV 報表

## 專案範圍

本專案只做個人投資組合的 ETF 穿透分析。

本專案不是主動式 ETF 經理人影響研究工具，也不是價格反應研究工具。舊的 Python active ETF research project 已經與本 React 專案分離，請不要合併兩者。

本專案不包含：

- ETF 經理人調倉影響研究
- 新增 / 移除持股研究
- 加碼 / 減碼持股分析
- 同日 / 隔日 / 兩日股價報酬相關性研究
- 主動式 ETF 價格反應研究
- 後端、登入、資料庫、爬蟲或自動券商串接

## 技術棧

- Vite
- React
- TypeScript
- Tailwind CSS
- Recharts
- Browser localStorage

## 目前功能

- Dashboard：投資組合總覽、穿透曝險摘要、ETF 重疊摘要、資料狀態提醒
- Manual holdings：手動維護 ETF / 股票持股
- ETF constituent import：貼上或匯入 ETF 成分股資料
- Lookthrough analysis：把 ETF 持股穿透成底層股票曝險
- ETF overlap analysis：分析 ETF 之間的持股重疊
- Transaction records：管理買進 / 賣出交易紀錄
- Manual price table：手動維護價格資料
- Manual vs transaction portfolio mode：可選擇用手動持股或交易紀錄推算持股
- JSON backup/import：匯出與匯入完整本機資料備份
- CSV export：匯出持股、成分股、交易、價格、穿透分析與重疊分析資料
- Transaction CSV import：交易 CSV / 表格貼上匯入、預覽、驗證與疑似重複提醒
- ETF data freshness/status：顯示每檔 ETF 目前使用的最新成分股資料日期與來源

## 建議使用流程

1. 手動新增持股，或輸入 / 匯入交易紀錄。
2. 如果使用交易紀錄模式，手動新增價格資料。
3. 匯入 ETF 成分股資料，並填寫資料日期與來源。
4. 在投資組合模式中選擇「手動持股」或「交易紀錄」。
5. 查看 Dashboard 的總覽與資料提醒。
6. 查看穿透持股曝險。
7. 查看 ETF 重疊分析。
8. 定期匯出 JSON 備份。

## 資料儲存

所有資料都儲存在瀏覽器的 localStorage，沒有後端或雲端同步。

如果清除瀏覽器資料、更換瀏覽器、或 localStorage 被清空，資料可能會消失。請定期到備份頁匯出 JSON 備份。

## localStorage keys

- `etf-lookthrough-portfolio-holdings`：手動持股資料
- `etf-lookthrough-etf-constituents`：ETF 成分股資料
- `etf-lookthrough-transactions`：交易紀錄
- `etf-lookthrough-price-records`：手動價格資料
- `etf-lookthrough-app-settings`：App 設定，例如投資組合資料來源模式

## 指令

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
```

## 已知限制

- 沒有後端
- 沒有登入
- 沒有自動抓取股價
- ETF 成分股資料需要手動匯入
- 如果瀏覽器儲存空間被清除，資料可能消失
- 尚未實作 localStorage schema migration
- 尚未建立自動化測試
- 部分舊 UI 原始碼中的繁體中文字串仍有 mojibake，需要後續清理

## 建議未來改善

- PWA polish，讓本機使用體驗更接近 App
- 改善手機版表格閱讀與操作
- 未來可評估自動股價抓取，但不要加入研究型價格反應分析
- 提供更清楚的匯入模板
- 補上輕量測試
- 部署到靜態網站環境
## 部署與手機測試

本專案是 local-first 的 Vite + React + TypeScript 靜態前端應用，可部署到 Vercel、Netlify、GitHub Pages 或其他靜態網站主機。

### 本機開發

```powershell
npm install
npm run dev
```

啟動後，用瀏覽器開啟終端機顯示的本機網址。若要用手機測試，請讓手機與電腦在同一個網路，並依 Vite 顯示的 Network URL 開啟。

### Production build 與預覽

```powershell
npm run build
npm run preview
```

部署設定：

- Framework: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

### 靜態主機部署

- Vercel: 匯入此專案，Framework 選 Vite，Build command 使用 `npm run build`，Output directory 使用 `dist`。
- Netlify: 匯入此專案，Build command 使用 `npm run build`，Publish directory 使用 `dist`。
- GitHub Pages: 先執行 `npm run build`，再將 `dist` 內容發布到 Pages 使用的 branch 或透過 GitHub Actions 部署。

### Local-first 資料提醒

資料儲存在瀏覽器 localStorage 中。不同瀏覽器、不同裝置不會自動同步資料；清除瀏覽器資料、換瀏覽器、換手機或重新部署前，請先到備份頁下載完整 JSON 備份。

## 每日分析目前狀態

App 目前已可在持股、交易紀錄、價格或 ETF 成分股資料更新後，重新計算 Dashboard 與穿透持股分析。

每日自動分析的關鍵前提是價格資料更新。現階段價格仍以手動輸入為主，Step 18 已先整理價格來源架構，保留手動輸入、CSV 匯入與未來自動來源三種資料來源類型。

在目前 local-first 設計中，自動更新適合發生在使用者開啟 App 時，而不是背景伺服器排程。完整背景每日自動化需要後端或排程基礎設施，超出目前範圍。

## ETF 持股自動化狀態

目前 App 支援手動與 CSV 匯入 ETF 成分股資料，這仍是可靠備援。Step 22 已加入 ETF 持股 provider architecture 與每檔 ETF 的 provider config localStorage 設定，但並不是每檔 ETF 都已可自動抓取。

ETF 持股自動化比價格自動化更困難，因為發行商網站與資料格式差異很大，可能是 CSV、Excel、PDF、JSON 或網頁表格，揭露頻率也可能是每日或每月。若要做完整背景每日自動化，通常需要 backend 與 scheduled jobs；目前目標是使用者開啟網站後手動觸發、在瀏覽器可穩定取得時更新資料，否則使用 CSV 匯入。

Step 28 開始盤點 00981A 與 00994A 的官方來源可行性；目前兩檔仍屬官方來源盤點中，尚未啟用自動 provider。第三方網站資料不得作為官方 provider input，CSV 匯入仍是可靠備援。盤點結果記錄於 `docs/ACTIVE_TAIWAN_ETF_PROVIDER_FEASIBILITY.md`。

Step 29 針對 00981A 統一投信官方 PCF 做深度驗證，已找到官方 AJAX JSON 與 Excel 匯出候選來源，且資料含 `NavRate` 持股權重欄位；但官方端點沒有回傳 CORS header，瀏覽器端自動抓取可能受阻。因此 00981A 目前仍不是自動 provider，若要自動化應先評估 parser proof-of-concept 或 serverless proxy，MVP 仍建議 CSV 匯入。

Step 30 已加入 00981A 官方 PCF JSON parser POC，可把 `asset[AssetCode=ST].Details` 轉成 `EtfConstituent[]`，並以 `NavRate` 作為 `weightPercent`。這只是 parser proof，不會從 UI 呼叫官方端點，也沒有加入 00981A auto-fetch 或儲存 provider 結果；CORS 問題解決前仍以 CSV 匯入為 fallback。

Step 31 針對 00994A 第一金投信官方來源做深度驗證，已找到 FundDetail 頁使用的官方 AJAX `WebAPI.aspx/Get_hd`，可回傳股票代號、股票名稱、持股權重、股數與資料日期。00994A 目前是 `ready_for_parser_poc`，尚未加入 parser/provider 或 UI auto-fetch；官方端點未回 CORS header，CSV 匯入仍是 MVP fallback。

Step 32 已加入 00994A 官方 `Get_hd` JSON parser POC，可把 `group === "1"` 的股票列轉成 `EtfConstituent[]`，並以 `C` 欄作為 `weightPercent`。這只是 parser proof，不會從 UI 呼叫官方端點，也沒有加入 00994A auto-fetch 或儲存 provider 結果；CORS 問題解決前仍以 CSV 匯入為 fallback。

新增的 provider config 會儲存在 `etf-lookthrough-etf-provider-configs`。

## 0050 provider 試作

0050 元大台灣50 是第一個台灣 ETF provider prototype。目前只試作 0050，不代表所有元大 ETF 或台灣 ETF 都已支援。

Step 24 後，App 會優先嘗試官方 PCF/Daily JSON 來源，來源由元大官方 PCF 頁的 Nuxt chunk 發現：

- PCF page：`https://www.yuantaetfs.com/tradeInfo/pcf/0050`
- PCF/Daily bridge：`https://etfapi.yuantaetfs.com/ectranslation/api/bridge?...FuncId=PCF%2FDaily...ticker=0050`
- ratio page fallback：`https://www.yuantaetfs.com/product/detail/0050/ratio`

目前調查結果：

- shell fetch 可以讀取 PCF page 與 PCF/Daily JSON。
- PCF/Daily JSON 含完整 `FundWeights.StockWeights`，包含股票代號、名稱、股數與 `weights`，可轉成 lookthrough 需要的 `weightPercent`。
- PCF page 的 SSR HTML 也包含完整 Nuxt state，但直接解析 HTML 仍較脆弱。
- ratio page 目前只在可見 SSR HTML 中解析到 5 筆股票權重，比較像摘要顯示，不適合覆蓋完整 0050 成分股。
- 這些官方來源目前沒有回傳 `Access-Control-Allow-Origin`，因此瀏覽器 fetch 可能被 CORS 擋住。

若瀏覽器端可成功讀取 PCF/Daily JSON，0050 provider 會在至少 20 筆且每筆都有有效權重時才允許儲存 provider 結果。若被 CORS 擋住或資料不完整，CSV 匯入仍是穩定備援。未來若要完全自動化 ETF 持股更新，可能需要非常薄的 serverless proxy，但目前專案仍維持 frontend-only、local-first，不加入 backend 或排程。

海外 ETF，例如 00646，尚未支援。

## 0050 provider 實機測試

Step 25 加入瀏覽器端 runtime diagnostics，用來確認 0050 provider 在實際使用環境中是 full、partial，還是被 CORS blocked。

測試 checklist：

- Local dev browser test：在本機開發環境按下 0050 provider 的「測試抓取」。
- Vercel deployed browser test：在 Vercel 部署站上按下同一個測試。
- Mobile browser test：用手機瀏覽器測試同一流程。
- 檢查結果狀態是否為 `full` / `partial` / `blocked by CORS`。
- 若結果為 full，儲存 provider 結果，確認 0050 成分股被更新，並回到 Dashboard / Lookthrough 驗證穿透分析有重新反映。
- 若結果為 blocked by CORS，先使用 CSV fallback；未來再評估是否建立極薄 serverless proxy。
- 若結果為 partial，不建議儲存為正式成分股，請繼續使用 CSV 匯入。

診斷面板會顯示測試時間、測試來源、執行環境、取得筆數、權重合計、資料日期、是否可安全儲存、錯誤訊息、建議下一步，以及可展開的 debug details。debug details 不會顯示完整 raw JSON。

## MVP 聚焦模式

Step 26 後，主要導覽聚焦在原始 MVP 流程：

1. 設定我的持股
2. ETF 成分股
3. 穿透分析

目前主流程已收斂為 MVP 三步：設定持股、匯入 ETF 成分股、查看穿透分析。

這個模式的目標是先回答最核心的個人投資問題：我目前透過 ETF 與個股實際暴露在哪些台灣股票、各股票佔投資組合多少、有沒有集中度風險，以及 ETF 之間是否買到重複標的。

交易紀錄、價格表、價格自動化、備份匯出、Dashboard 與 ETF 重疊頁仍保留在程式碼中，也可從「進階工具」進入，但它們不是 MVP 主要流程的必要條件。MVP 不需要交易紀錄或價格自動化；使用者可以先用手動持股市值、CSV ETF 成分股匯入與穿透分析完成核心任務。

本專案仍應維持個人 ETF 穿透分析工具定位，不應擴張成 active ETF research platform。

## Serverless Proxy 評估

Step 33 新增 Vercel serverless function；Step 46 將 00646 加入同一個 proxy whitelist。支援 endpoint：

- `/api/etf-holdings?symbol=0050`
- `/api/etf-holdings?symbol=00646`
- `/api/etf-holdings?symbol=00981A`
- `/api/etf-holdings?symbol=00994A`

這個 proxy 的目的只是讓 Vercel server-side 去讀官方 issuer endpoint，避免瀏覽器 CORS 阻擋並統一 response shape；API 只接受白名單 ETF symbol，不接受任意 URL。

Proxy 目前會回傳 normalized constituents，response 包含 `symbol`、`status`、`source`、`sourceUrl`、`fetchedAt`、`asOfDate`、`constituents`、`warnings`、`errors`。已加入短期 cache header：`s-maxage=1800, stale-while-revalidate=1800`。

支援狀態：
- `0050`：元大官方 PCF/Daily JSON，使用既有 `parseYuanta0050PcfResponse`。
- `00646`：元大官方 PCF/Daily JSON，解析 `FundWeights.StockWeights[]` 為美股成分，排除期貨 / 現金 / 保證金；已加入 guarded UI 更新與 held ETF batch update。
- `00981A`：統一投信官方 `POST https://www.ezmoney.com.tw/ETF/Transaction/GetPCF`，使用既有 `parseUniPresident00981APcfResponse`。本機 Node fetch 對此 endpoint 曾出現 network-level failure；proxy 會以清楚的 `failed` response 回報。
- `00994A`：第一金投信官方 `POST https://www.fsitc.com.tw/WebAPI.aspx/Get_hd`，body 為 `{"pStrFundID":"182","pStrDate":""}`，使用既有 `parseFirst00994AGetHdResponse`。

目前自動化焦點調整為 `0050` + `00981A`。`00994A` 已非目前使用者優先標的，保留為低優先度 / CSV fallback，不作為下一步主線自動化對象。

Proxy 不做的事：
- 不儲存 user data。
- 不需要 login。
- 不使用 database。
- 不做 scheduled job 或 background automation。
- 不提供 arbitrary URL proxy。
- 不會自動改寫 ETF constituents，也沒有 production auto-fetch UI。

Local-first note：使用者 portfolio、交易、價格與 ETF constituents 仍保存在 browser localStorage。呼叫 proxy 時，離開瀏覽器的只有 ETF symbol request，例如 `symbol=00994A`。

Local / Vercel 測試：
- deployed：開啟 `/api/etf-holdings?symbol=00646`、`/api/etf-holdings?symbol=0050` 或 `/api/etf-holdings?symbol=00981A`。
- local：若有 Vercel CLI，可用 `vercel dev` 後測 `/api/etf-holdings?symbol=00994A`；一般 `npm run dev` 只啟動 Vite frontend，不會執行 Vercel function。
- Step 34 deployed API testing notes：`docs/VERCEL_API_TESTING.md`。

## MVP 一鍵更新 ETF 成分股

Step 36 在「ETF 成分股」頁加入 MVP 一鍵更新流程，優先支援 `0050` 與 `00981A`。資料透過本專案 Vercel proxy 讀取官方來源，前端只取得正規化後的成分股資料。

使用流程：

- 點選「更新 0050 元大台灣50」或「更新 00981A 主動統一台股增長」。
- 先看預覽：狀態、資料日期、成分股筆數、權重合計、warnings / errors 與前 10 筆成分股。
- 只有在至少 20 筆、權重有效、且沒有 errors 時，才能按「儲存並取代此 ETF 成分股」。
- 儲存前會再次確認；確認後只會取代該 ETF 的 localStorage 成分股資料。
- `00981A` 目前可能回傳 `partial`，只要沒有 errors 且資料量與權重有效，允許使用者確認 warnings 後儲存。

`00994A` 已非目前使用者優先標的，保留為低優先度 / CSV fallback，不作為 MVP 一鍵更新主按鈕。CSV / 貼上表格匯入仍保留作為備援。

## Auto MVP：一鍵更新目前持有 ETF

Step 43 在「ETF 成分股」頁加入 batch update workflow。App 會根據「設定我的持股」偵測目前持有、且支援 proxy 自動更新的 ETF。

- 目前主要自動更新標的是 `0050` 與 `00981A`。
- 點選「更新目前持有且支援的 ETF」後，系統會呼叫既有 Vercel proxy 取得每檔 ETF 的 normalized constituents。
- 結果會先顯示批次預覽表：狀態、資料日期、成分股筆數、權重合計、warnings / errors 數量，以及是否可儲存。
- `00981A` 可能回傳 `partial`；只要沒有 errors、成分股數與權重有效，仍可儲存。
- 使用者必須按「儲存可用的更新結果」並確認後，才會取代 localStorage 中對應 ETF 的成分股資料。
- 儲存時只保存通過安全檢查的 ETF，失敗或 unsafe 的 ETF 會被略過。
- `00646` 已支援 guarded 自動更新；CSV / 貼上表格匯入仍維持 fallback。
- `00994A` 因使用者已售出，不列入主要 batch update 流程。
- 單檔更新按鈕仍保留，供 batch update 失敗時手動測試。

## 依持股建議更新

Step 38 讓「ETF 成分股」頁依照「設定我的持股」中的 ETF 顯示更新建議：

- 持股中若有 `0050` 或 `00981A`，會顯示主要更新卡片，可先透過 Vercel proxy 抓官方來源、預覽，再手動確認儲存。
- 持股中若有 `00646`，會顯示 guarded 自動更新卡片；其他海外 ETF 仍以 CSV / 手動匯入作為 fallback。
- 持股中若有其他尚未支援 ETF，會提示尚未建立自動來源，請使用 CSV 匯入。
- `0050` / `00981A` 若目前不在持股中，只會放在「其他可測試的支援 ETF」次要區域。
- `00994A` 因使用者已售出，維持低優先度 / CSV fallback，不作為主要更新建議。

此功能只改變提示與入口排序，不改變穿透分析計算邏輯，也不新增資料庫、登入、排程或任何使用者資料上傳。

## 台股 / 美股成分分類

Step 39 新增底層成分市場分類，讓穿透分析可以分開顯示台股與美股曝險。

- 成分市場型別：`TW` 台股成分、`US` 美股成分、`OTHER` 其他市場、`UNKNOWN` 未分類。
- `0050` 與 `00981A` 的官方 proxy / CSV 成分會依股票代號自動判斷為台股成分。
- `00646` 被視為海外 / 美股成分 ETF；若尚未匯入成分股，穿透分析會暫時以單一美股 ETF 曝險呈現，不會列為台股成分。
- `00646` 已可透過官方元大資料更新股票成分，但仍不會抓取第三方 S&P 500 資料；CSV / 手動匯入仍可使用。
- CSV / 貼上表格支援選填市場欄位：`市場`、`成分市場`、`股票市場`、`market`、`underlyingMarket`。
- 支援的市場值：`台股`、`台灣`、`TW`、`Taiwan`、`美股`、`美國`、`US`、`USA`、`其他`、`OTHER`。

00646 手動匯入範例格式，非最新真實持股：

```csv
股票代號,股票名稱,持股權重,市場
AAPL,Apple Inc.,7.00%,美股
MSFT,Microsoft,6.50%,美股
NVDA,NVIDIA,6.00%,美股
AMZN,Amazon.com Inc.,3.50%,美股
META,Meta Platforms Inc.,2.80%,美股
```

LookthroughPage 會顯示「市場曝險分類」與主表中的「成分市場」欄位。若有 `UNKNOWN`，頁面會提示檢查股票代號或補上市場欄位。

## 00646 手動匯入

Step 40 強化 00646 的手動 / CSV 匯入流程，但仍未加入自動 provider，也不會自動抓 S&P 500 成分股。

- 「ETF 成分股」頁提供「00646 美股成分匯入提示」與可套用的範例格式。
- 使用者可貼上或匯入 US constituents，並把市場欄位填為 `美股` 或 `US`。
- 若市場欄位省略，ETF 代號為 `00646` 且股票代號為 `AAPL`、`MSFT`、`NVDA` 這類美股 ticker 時，預覽會自動顯示為 `美股成分`。
- 匯入時會清理常見 Bloomberg-like 美股代號，例如 `NVDA UQ` -> `NVDA`、`AAPL UQ` -> `AAPL`、`JPM UN` -> `JPM`、`CBOE UF` -> `CBOE`。
- class-share 斜線代號會轉為 dot 格式，例如 `BRK/B` -> `BRK.B`、`BF/B` -> `BF.B`。
- 若 00646 匯入後仍有空白或不常見字元，預覽會顯示提醒，但不會只因提醒而阻擋儲存。
- 預覽表會顯示「成分市場」，儲存前可先確認 00646 rows 是否正確歸類為美股。
- 若 00646 匯入資料出現四碼台股格式代號，頁面只會顯示提醒，不會阻擋匯入。
- 本專案目前不處理 USD/TWD 匯率轉換，也不提供 00646 / S&P 500 自動資料來源。

## 00646 官方來源調查

Step 44 完成 00646 官方來源 feasibility investigation，紀錄在 `docs/OVERSEAS_ETF_00646_PROVIDER_FEASIBILITY.md`。

- 官方候選來源為元大 00646 申購買回清單與元大 ETFAPI bridge PCF/Daily JSON。
- 實測官方 JSON 可取得完整 `FundWeights.StockWeights`，包含 503 筆股票列、股票代號、名稱、股數與直接權重 `weights`。
- 00646 股票列未來 normalize 後應固定標記為 `underlyingMarket: "US"` / 美股成分。
- JSON 同時包含期貨、現金、保證金與應收應付資料；下一步 parser POC 應先只轉換股票列，非股票曝險暫不實作。
- 00646 automatic provider 尚未實作，也尚未加入一鍵更新流程；CSV / 貼上表格匯入仍是目前 fallback。

Step 45 已建立 00646 parser proof-of-concept：

- `parseYuanta00646HoldingsResponse` 只解析官方 JSON 的 `FundWeights.StockWeights[]`。
- 有效股票列會轉成 `EtfConstituent[]`，並固定 `underlyingMarket: "US"`。
- Bloomberg-like tickers 會清理，例如 `NVDA UQ` -> `NVDA`、`JPM UN` -> `JPM`、`BRK/B UN` -> `BRK.B`。
- `FutureWeights`、`CashPosition`、`Margin` 會被忽略，不會塞進股票成分股。
- fixture / smoke utility 位於 `src/data/sample00646HoldingsResponse.ts`。
- 00646 自動更新 UI 已啟用，並可在目前持股包含 00646 時列入 one-click batch update。

Step 46 已將 00646 加入 `/api/etf-holdings?symbol=00646` serverless proxy。Step 47 起，00646 已加入 guarded ETF 成分股更新按鈕與 held ETF batch update。API 會回傳 normalized US constituents，並排除 futures / cash / margin。

## 小額成分彙總

Step 41 / 42 在「穿透分析」頁加入顯示門檻，適合 00646 / S&P 500 這類可能有大量小額成分股的 ETF。

- 預設最小顯示金額為 `NT$10`。
- 預設最小投組佔比為 `0.01%`。
- 預設最多顯示 `50` 筆明細。
- 預設會將低於門檻的成分依市場彙總成「其他台股成分」、「其他美股成分」、「其他市場成分」或「其他未分類成分」。
- 超過最多顯示筆數的其餘 rows 也會依市場彙總。
- 彙總只影響「底層股票曝險」表格的顯示，不改變原始 lookthrough exposure、總市值、市場曝險、產業曝險或集中度計算。
- 若取消「將低於門檻的成分彙總為其他」，表格會顯示全部成分股明細。
- Step 42 QA checklist：`docs/LOOKTHROUGH_DISPLAY_THRESHOLD_QA.md`。

## 00646 自動更新

Step 47 起，`00646` 已加入 ETF 成分股頁的 guarded update workflow：

- 若目前持股包含 `00646`，會出現在「一鍵更新目前持有 ETF」批次更新中。
- 單檔更新區也可手動測試 `更新 00646 元大S&P500`。
- 資料來源為官方元大 PCF/Daily JSON，透過 `/api/etf-holdings?symbol=00646` proxy 取得。
- API 回傳股票成分約 503 筆，並固定標記為 `underlyingMarket: "US"` / 美股成分。
- 期貨 / 現金 / 保證金不會列入股票穿透成分，會以 warnings 顯示。
- 儲存前仍需預覽並確認；只有 `ok` 或 `partial`、無 errors、至少 20 筆且權重有效的結果可儲存。
- 穿透分析會用既有顯示門檻彙總小額美股成分，不改變核心計算總額。
- CSV / 貼上表格匯入仍保留為 fallback。

## ETF 更新新鮮度診斷

Step 48A 起，ETF proxy response 與 ETF 成分股頁會明確顯示資料新鮮度：

- `asOfDate` / 官方資料日期：發行人官方資料本身的日期，不一定等於今天；若官方尚未更新，可能仍停在前一交易日。
- `fetchedAt` / 本次抓取時間：本專案 serverless proxy 實際處理這次更新請求的時間。
- `source` 與 `sourceUrl`：官方來源標籤與來源 URL。
- `cacheControl` / `cacheNote`：說明此次 response 是否使用一般短期快取。
- `refreshRequested`：使用者是否勾選「強制重新抓取，避免快取」。

一般更新 request 仍使用短期 Vercel/CDN cache；若勾選強制重新抓取，client 會呼叫 `/api/etf-holdings?symbol=00646&refresh=1` 這類 URL，API response header 會改為 `Cache-Control: no-store`，並在 debug/freshness 欄位標記 `refreshRequested: true`。

本專案目前仍不執行背景每日更新、排程工作或自動寫入本機資料。使用者按下更新後才會抓取官方來源，預覽並確認後才會取代 localStorage 中的 ETF 成分股資料。CSV / 貼上表格匯入仍保留為 fallback。

## Auto MVP 狀態摘要

Step 49 起，「ETF 成分股」頁新增 Auto MVP 狀態摘要：

- 依目前持股列出 ETF 代號、名稱、自動更新狀態、本地資料日期、官方回傳日期、本次抓取時間、是否需要更新與成分市場。
- `0050`、`00981A`、`00646` 顯示為已支援；`00994A` 維持低優先；其他 ETF 顯示尚未支援。
- 本地資料日期來自已儲存的 ETF constituents；官方回傳日期來自最近一次 proxy preview / batch result。
- 若官方回傳日期新於本地資料，顯示有新資料可儲存；若相同，顯示目前官方回傳日期與本地資料相同；若官方日期較舊，提醒不建議覆蓋。
- `00981A` preview 會說明官方 PCF 日期可能落後於今天：`fetchedAt` 代表系統今天有抓取，`asOfDate` 才是官方 PCF 實際資料日期。
- sourceUrl、cacheControl、cacheNote、debug attempts、request variant 與完整 warnings/errors 會收在「技術細節」中，降低主要畫面噪音。

## Auto MVP 日常流程

Step 50 起，「ETF 成分股」頁把日常 Auto MVP 流程放在最前面：

1. 到「設定我的持股」維護目前 ETF / 股票持股。
2. 到「ETF 成分股」查看 Auto MVP 狀態，並按「更新目前持有且支援的 ETF」。
3. 預覽官方回傳日期、抓取時間、筆數、權重合計與 warnings，確認後儲存。
4. 到「穿透分析」查看台股 / 美股成分曝險。

目前支援的主要自動更新 ETF 是 `0050`、`00981A`、`00646`；`00994A` 維持低優先。單檔更新、provider diagnostics、技術細節與 CSV / 手動匯入 fallback 仍保留，但預設收在可展開區塊中，避免干擾每日使用。本專案仍不執行背景自動更新、排程、資料庫、登入或使用者資料上傳。

Step 51 簡化主要頁面文案，讓 App 更像日常工具而不是專案說明。詳細背景與開發脈絡仍保留在 README / handoff 文件，不放在主要操作頁面。

後續 Step 51 調整將交易紀錄提升為主要持股維護流程：「我的持股」頁可直接新增買進 / 賣出、手動更新目前價格，並由交易紀錄計算剩餘股數、平均成本、投入成本、目前市值與投組佔比。穿透分析會優先使用交易紀錄整理出的持股；沒有交易紀錄時，才使用手動持股作為 fallback。此步驟未加入自動價格抓取，也未改動 ETF 成分股 proxy / parser。

Step 52 針對交易持股流程做實用 QA 微調：多筆買進會以平均成本法整理剩餘部位，賣出會扣減剩餘股數，完全出清的標的不顯示在目前持股表；若賣出超過持股，頁面會顯示提醒。手動輸入目前價格後，市值與投組佔比會依 `股數 × 目前價格` 更新。若持股缺少目前價格，「我的持股」不會用投入成本假裝市值，市值、損益、報酬率與投組佔比會顯示為待更新；穿透分析會暫時排除缺價持股並顯示提醒。ETF 成分股更新建議仍會依剩餘股數辨識目前持有 ETF。

## 台股收盤價更新

「我的持股」頁可按「更新目前價格」更新目前持有標的的最近可用台灣收盤價。前端只送出目前仍持有的 symbol 清單到 `/api/market-prices`，不會送出交易明細；serverless API 會讀取 TWSE / TPEx 官方 OpenAPI 收盤價資料，並只回傳請求代號的 normalized price result。

此功能不是即時報價，也不會背景自動更新。若某個代號沒有取得有效收盤價，不會用空白、0 或投入成本覆蓋既有價格；該標的仍會顯示為待更新，並依缺價規則暫不納入市值與穿透分析。手動價格輸入仍保留，可用來補充或覆蓋價格資料。

## 持股頁版面整理

「我的持股」頁專注於投組摘要、收盤價更新與目前持股表；新增與管理交易改到「交易紀錄」頁，持股頁只保留「新增交易」入口。交易計算、價格更新與 ETF 成分股更新邏輯未變更。
