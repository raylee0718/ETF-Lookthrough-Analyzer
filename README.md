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

Step 33 新增 Vercel serverless function：`/api/etf-holdings?symbol=0050`、`/api/etf-holdings?symbol=00981A`、`/api/etf-holdings?symbol=00994A`。這個 proxy 的目的只是讓 Vercel server-side 去讀官方 issuer endpoint，避免瀏覽器 CORS 阻擋；API 只接受白名單 ETF symbol，不接受任意 URL。

Proxy 目前會回傳 normalized constituents，response 包含 `symbol`、`status`、`source`、`sourceUrl`、`fetchedAt`、`asOfDate`、`constituents`、`warnings`、`errors`。已加入短期 cache header：`s-maxage=1800, stale-while-revalidate=1800`。

支援狀態：
- `0050`：元大官方 PCF/Daily JSON，使用既有 `parseYuanta0050PcfResponse`。
- `00981A`：統一投信官方 `POST https://www.ezmoney.com.tw/ETF/Transaction/GetPCF`，使用既有 `parseUniPresident00981APcfResponse`。本機 Node fetch 對此 endpoint 曾出現 network-level failure；proxy 會以清楚的 `failed` response 回報。
- `00994A`：第一金投信官方 `POST https://www.fsitc.com.tw/WebAPI.aspx/Get_hd`，body 為 `{"pStrFundID":"182","pStrDate":""}`，使用既有 `parseFirst00994AGetHdResponse`。

Proxy 不做的事：
- 不儲存 user data。
- 不需要 login。
- 不使用 database。
- 不做 scheduled job 或 background automation。
- 不提供 arbitrary URL proxy。
- 不會自動改寫 ETF constituents，也沒有 production auto-fetch UI。

Local-first note：使用者 portfolio、交易、價格與 ETF constituents 仍保存在 browser localStorage。呼叫 proxy 時，離開瀏覽器的只有 ETF symbol request，例如 `symbol=00994A`。

Local / Vercel 測試：
- deployed：開啟 `/api/etf-holdings?symbol=00994A` 或 `/api/etf-holdings?symbol=0050`。
- local：若有 Vercel CLI，可用 `vercel dev` 後測 `/api/etf-holdings?symbol=00994A`；一般 `npm run dev` 只啟動 Vite frontend，不會執行 Vercel function。
