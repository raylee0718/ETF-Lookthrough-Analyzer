# ETF Lookthrough Analyzer 專案交接摘要

## 1. Project identity

- Project name: `ETF Lookthrough Analyzer`
- Chinese name: `ETF 穿透持股分析器`
- Current clean project path: `C:\Users\uuuu1\OneDrive\桌面\ETF-Lookthrough-Analyzer`
- GitHub repository: `https://github.com/raylee0718/ETF-Lookthrough-Analyzer.git`
- Deployment: 已部署到 Vercel。專案文件目前只有 `docs/POST_DEPLOYMENT_TESTING.md` 中的 `Vercel production URL：待填入`，沒有實際 production URL，因此不要猜測網址。

本專案是乾淨的 React 專案資料夾，已與舊的 Python active ETF research project 分開。未來維護時請繼續維持此邊界。

## 2. Project goal

ETF Lookthrough Analyzer 是 local-first 的個人投資工具，用來分析自己的 ETF / 股票投資組合在穿透 ETF 成分股後，實際曝險到哪些底層股票、產業與標的。

目前用途包含：

- 分析個人投資組合的底層股票曝險。
- 檢查單一股票集中度。
- 檢查不同 ETF 之間的成分股重疊。
- 管理 ETF 成分股資料與資料日期狀態。
- 管理交易紀錄、價格、手動持股與備份。
- 透過 JSON 備份 / 匯入與 CSV 匯出保護 localStorage 資料。

本專案不是學術或研究型的 ETF 經理人交易影響分析工具，也不應變成舊 Python active ETF research project。

明確不屬於本專案範圍：

- ETF manager rebalance impact research
- added / removed holdings research
- increased / decreased ETF holdings analysis
- same-day / next-day / two-day stock return correlation
- active ETF price reaction research
- backend scheduled jobs
- 網站關閉時仍自動執行的背景每日分析

## 3. Current tech stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Recharts
- Browser `localStorage`
- `vite-plugin-pwa` optional PWA / deployment setup
- Static hosting / Vercel deployment

## 4. Completed steps so far

- Step 1: project skeleton and mock dashboard：已完成。
- Step 2: manual portfolio holdings + localStorage：已完成。
- Step 3: ETF constituent import center + localStorage：已完成。
- Step 4: lookthrough exposure calculation：已完成。
- Step 5: ETF overlap analysis：已完成。
- Step 6: transaction records + position calculation：已完成。
- Step 7: manual price table + market value calculation：已完成。
- Step 8: manual holdings mode vs transaction mode switching：已完成。
- Step 9: JSON backup/import and CSV export：已完成。
- Step 10: transaction CSV import：已完成。
- Step 11: simplified ETF constituent data status / freshness：已完成，但只保留輕量資料狀態與 latest constituent date 行為。
- Step 12: README / documentation cleanup：已完成。
- Step 13: PWA / deployment preparation：已完成。
- Step 14: deployment readiness / mobile testing checklist：已完成。
- Step 15: Git initialization and GitHub push：已完成。
- Step 16: Vercel pre-deployment check：已完成，專案已推到 GitHub 並已部署到 Vercel；實際 production URL 尚未寫入文件。
- Step 17: post-deployment QA checklist：已完成，見 `docs/POST_DEPLOYMENT_TESTING.md`。
- Step 18: price data source architecture：已完成，支援 `manual`、`csv`、未來 `provider` 三種 price source type。
- Step 19: daily price CSV import：已完成，可貼上或匯入 CSV / Excel 表格每日收盤價。

Step 11 特別說明：

原本廣義的 ETF version comparison / added / removed / increased / decreased holdings 功能已移除，避免與獨立的 active ETF research project 重疊。本專案只應保留輕量的 ETF 成分股資料狀態、最新資料日期與避免重複計算的行為。

## 5. Current pages

- `Dashboard`: 顯示投資組合總覽、資料來源模式、穿透曝險摘要、產業曝險、ETF 重疊摘要、集中度提醒與交易 / 價格摘要。
- `HoldingsPage`: 管理手動持股，支援新增、編輯、刪除、重設並存入 localStorage。
- `EtfConstituentsPage`: 匯入、預覽、儲存與管理 ETF 成分股資料；顯示簡化資料狀態與最新資料日期。
- `LookthroughPage`: 使用目前選定的投資組合資料來源，計算 ETF 穿透後的底層股票與產業曝險。
- `OverlapPage`: 分析 ETF 之間的成分股數量重疊與加權重疊。
- `TransactionsPage`: 管理交易紀錄，支援交易 CSV 匯入、預覽、重複偵測與部位推算。
- `PricesPage`: 管理手動價格、快速更新交易部位價格、價格覆蓋率、每日價格 CSV 匯入，以及未來自動收盤價來源提示。
- `BackupPage`: 匯出完整 JSON 備份、匯入 JSON 備份、匯出各種 CSV。

目前沒有 active 的 `EtfVersionComparePage`，不要把已刪除或研究型版本比較頁面當成現有功能。

## 6. Current hooks

- `usePortfolioHoldings`: 管理手動持股 localStorage 狀態。
- `useEtfConstituents`: 管理 ETF 成分股 localStorage 狀態，支援依 ETF 取代匯入資料。
- `useTransactions`: 管理交易紀錄 localStorage 狀態。
- `usePriceRecords`: 管理價格紀錄 localStorage 狀態，支援單筆新增 / 更新 / 刪除、快速 upsert、批次每日價格 upsert。
- `useAppSettings`: 管理 App 設定，例如 manual / transaction portfolio mode。
- `useLocalStorage`: 泛用 localStorage helper，目前仍保留在專案中。

## 7. Current lib utilities

- `lookthrough.ts`: 計算 ETF 穿透後的底層股票曝險、產業曝險、未對應 ETF 與集中度提醒。
- `overlap.ts`: 計算 ETF 兩兩成分股重疊、加權重疊與重疊等級。
- `positions.ts`: 將交易紀錄轉換為目前部位、平均成本、已實現損益等。
- `prices.ts`: 取得最新價格、計算交易部位市值、轉換交易部位為分析用 holdings、價格來源標籤、價格缺口與覆蓋率。
- `portfolioSource.ts`: 根據 App 設定在手動持股模式與交易紀錄模式之間切換分析資料來源。
- `backup.ts`: 建立 JSON 備份、驗證備份、寫回 localStorage、匯出 CSV。
- `importTransactions.ts`: 解析交易 CSV / 貼上資料，產生預覽、驗證錯誤與重複判斷。
- `importPrices.ts`: 解析每日價格 CSV / 貼上資料，支援中文與英文欄位、quoted CSV、tab-separated Excel 資料、錯誤列預覽與重複判斷。
- `constituentVersions.ts`: 取得每檔 ETF 最新成分股資料與簡化資料狀態。用途是 freshness / latest record，不是研究型版本比較。
- `format.ts`: 格式化金額、百分比、數字、股數。
- `formatters.ts`: 早期格式化 helper，仍被部分頁面使用。
- `portfolioStorage.ts`: 定義手動持股 localStorage key。

## 8. Current types

- `src/types/portfolio.ts`
  - `PortfolioHolding`
  - `HoldingCategory`
  - `EtfConstituent`
  - `LookthroughExposure`
  - `IndustryExposure`
- `src/types/transactions.ts`
  - `TransactionRecord`
  - `TransactionType`
  - `CalculatedPosition`
- `src/types/prices.ts`
  - `PriceSourceType`: `manual` / `csv` / `provider`
  - `PriceRecord`
  - `PositionWithMarketValue`
- `src/types/settings.ts`
  - `PortfolioDataSourceMode`
  - `AppSettings`
- Backup / import related types are mostly colocated in utilities:
  - `BackupFile`, `BackupPreview` in `backup.ts`
  - transaction import row/result types in `importTransactions.ts`
  - price import row/result types in `importPrices.ts`

## 9. localStorage keys

- `etf-lookthrough-portfolio-holdings`: 手動持股資料。
- `etf-lookthrough-etf-constituents`: ETF 成分股資料。
- `etf-lookthrough-transactions`: 交易紀錄。
- `etf-lookthrough-price-records`: 價格紀錄，包含手動價格與 CSV 匯入價格。
- `etf-lookthrough-app-settings`: App 設定，例如 portfolio data source mode。

目前沒有其他主要 localStorage key。

## 10. Main calculation logic

### Lookthrough exposure

分析資料來源先由 `portfolioSource.ts` 決定。若是手動模式，直接使用手動持股市值；若是交易模式，先由交易紀錄推算部位，再用價格計算市值並轉成分析用 holdings。

`lookthrough.ts` 會依 ETF 成分股權重，把 ETF 持股市值拆成底層股票曝險。直接股票或無法對應成分股的標的會保留為直接曝險或未對應提醒。

### ETF overlap

`overlap.ts` 依 ETF 成分股清單計算兩檔 ETF 的共同股票數量、各自重疊比例與加權重疊。這是個人持股重疊檢查，不是 ETF 經理人交易研究。

### Transactions to positions

`positions.ts` 將買進 / 賣出交易依代號彙總為目前股數、平均成本、總成本、已實現損益等部位資料。

### Prices and market value

`prices.ts` 會為每個代號取最新日期價格。交易模式下，若有價格，市值為 `shares × latest price`；若缺少價格，目前會以投入成本估算市值並標記 missing。

### Manual mode vs transaction mode

- Manual mode: 直接使用 `HoldingsPage` 的手動市值。
- Transaction mode: 使用 `TransactionsPage` 的交易紀錄推算部位，再用 `PricesPage` 的價格計算市值。
- `PortfolioModeSwitch` 讓使用者切換兩種模式。

### Price coverage

Step 18 後，`getPriceCoverageSummary` 會計算：

- 目前交易部位數
- 已有價格數
- 缺少價格數
- 覆蓋率
- 缺少價格的代號

Dashboard 與 PricesPage 會使用這些資訊提醒交易模式下的價格完整度。

### Daily price CSV import

Step 19 後，`PricesPage` 可貼上或選擇 CSV / Excel 表格每日價格資料。`importPrices.ts` 會解析資料、保留無效列並顯示錯誤、偵測同日期同代號價格。匯入時可選擇覆蓋或略過重複資料。

匯入價格會寫入 `usePriceRecords` 管理的 localStorage，並設定：

- `sourceType: "csv"`
- `source`: 使用輸入來源或預設 `CSV 匯入`
- `fetchedAt`: 匯入時的 timestamp

匯入後交易模式市值、價格覆蓋率、Dashboard 與 LookthroughPage 都會透過既有資料流重新計算。

## 11. Daily analysis status

- App 已可在 holdings、transactions、prices 或 ETF constituents 更新後，重新計算 Dashboard 與穿透曝險。
- Step 19 提供半自動每日流程：使用者可匯入每日價格 CSV，App 立即更新價格並重新計算交易模式市值與穿透曝險。
- Fully automatic stock price fetching 尚未實作。
- 網站關閉時的 fully automatic background daily analysis 在目前 frontend-only + localStorage 設計中不可行，除非引入 backend、database 或 scheduled infrastructure。
- 下一個合理方向是 price provider integration：在使用者開啟 App 時，自動向合法且穩定的台股收盤價資料來源更新價格。

## 12. Deployment and data warning

- App 是 local-first。
- 資料儲存在每個 browser / device 的 localStorage。
- 桌機與手機不會自動同步。
- 請使用 JSON backup/export/import 在裝置之間搬移資料。
- 清除瀏覽器資料、清除網站資料、換瀏覽器、使用無痕模式或換手機，可能會刪除 App 資料。
- 即使已部署到 Vercel，GitHub repo 仍可維持 private。
- Vercel 靜態部署不等於資料雲端同步；它只提供 App 檔案，使用者資料仍在本機瀏覽器。

## 13. Known limitations / technical debt

- No backend。
- No login。
- No database。
- 尚未實作 automatic stock price fetching。
- 尚未實作 automatic ETF constituent fetching。
- No cross-device sync。
- localStorage schema migration 尚未完整設計。
- 寬表格在手機上的 UX 還可以更好。
- 重要 calculation utilities 需要輕量單元測試。
- 需要持續小心與舊 active ETF research project 分離，不要把 ETF 經理人交易影響研究功能加回此 App。

## 14. Safe next steps

建議優先順序：

1. Price provider integration / automatic Taiwan closing price fetch when the app opens。
2. Better mobile table UI。
3. Lightweight unit tests for calculation utilities。
4. Import templates and data validation polish。
5. Optional PWA polish。
6. 只有當使用者真的需要網站關閉時仍執行的背景每日任務，才考慮 backend / scheduled automation。

### Recommended next Codex prompt

```text
Please work inside:
C:\Users\uuuu1\OneDrive\桌面\ETF-Lookthrough-Analyzer

Implement only the next safe step: price provider integration preparation for Taiwan closing prices when the user opens the app.

Important:
- Do not add backend, login, database, scraping, or scheduled jobs.
- Do not implement active ETF research features.
- Do not add ETF manager rebalance impact research, added/removed holdings research, increased/decreased ETF holdings analysis, or same-day/next-day/two-day return correlation.
- Preserve existing lookthrough, transaction, and portfolio mode calculation logic.
- Prefer an interface/adapter layer and UI toggle/placeholder before any real provider call.
```

## 15. Verification notes

交接文件更新後應執行：

```powershell
npm.cmd run build
npx.cmd tsc --noEmit --noUnusedLocals --noUnusedParameters
```

若只有 `PROJECT_HANDOFF.md` 改動，請只提交文件更新：

```powershell
git add PROJECT_HANDOFF.md
git commit -m "Update project handoff"
git push
```
