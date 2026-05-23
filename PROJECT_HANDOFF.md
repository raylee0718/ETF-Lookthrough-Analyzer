# ETF Lookthrough Analyzer 專案交接摘要

## 1. Project Identity

- Project name: `ETF Lookthrough Analyzer`
- Chinese name: `ETF 穿透持股分析器`
- Current clean project path: `C:\Users\uuuu1\OneDrive\桌面\ETF-Lookthrough-Analyzer`
- GitHub repository: `https://github.com/raylee0718/ETF-Lookthrough-Analyzer.git`
- Deployment: 專案文件已提到 Vercel 部署與部署檢查流程，但目前文件中沒有填入正式 production URL；不要自行猜測網址。

本專案是乾淨的 React 專案，獨立於舊的 Python active ETF research project。此專案不得變成主動型 ETF 經理人交易影響研究工具。

## 2. Project Goal

ETF Lookthrough Analyzer 是 local-first 的個人投資工具，用來分析自己的 ETF 與個股投資組合在穿透 ETF 後，實際暴露到哪些台股標的與產業。

它目前協助檢查：

- 投資組合總市值與部位來源。
- ETF 穿透後的底層股票曝險。
- 產業曝險。
- ETF 之間的成分股重疊。
- 集中度風險。
- ETF 成分股資料狀態與新舊程度。
- 交易紀錄、價格紀錄、價格覆蓋率。
- JSON 備份、匯入與 CSV 匯出。

主要自動化目標是：

`持股 / 交易紀錄 + 最新價格 + 最新台灣 ETF 成分股 -> 更新後的穿透曝險`

此專案聚焦個人投資組合分析，不是 ETF 經理人交易影響、股價反應、調倉研究或學術型量化研究。

## 3. Current Scope Clarification

- 目前 ETF 成分股自動化只聚焦台灣掛牌、主要持有台股的 ETF。
- `0050 元大台灣50` 是第一個 provider prototype 目標。
- `00646` 與海外 ETF 成分股自動化目前明確不在範圍內；但 00646 會在穿透分析中被分類為美股 / 海外 ETF 曝險，不應被歸為台股成分。
- 全球 ETF 資料、匯率轉換、S&P 500 穿透分析目前延後處理。
- 手動輸入與 CSV 匯入必須保留，並且仍是最穩定的備援流程。

明確不在本專案範圍內：

- ETF manager rebalance impact research。
- added / removed holdings research。
- increased / decreased ETF holdings analysis。
- same-day / next-day / two-day stock return correlation。
- active ETF price reaction research。
- 海外 ETF lookthrough automation。
- 00646 / S&P 500 constituent automation。
- backend scheduled jobs。
- 網站關閉時仍自動背景每日分析。

## 4. Current Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Recharts
- Browser `localStorage`
- `vite-plugin-pwa` optional PWA / deployment setup
- Static hosting / Vercel deployment workflow, if deployed from repository

## 5. Completed Steps So Far

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
- Step 11: simplified ETF constituent data status / freshness：已完成。
- Step 12: README / documentation cleanup：已完成。
- Step 13: PWA / deployment preparation：已完成。
- Step 14: deployment readiness / mobile testing checklist：已完成。
- Step 15: Git initialization and GitHub push：已完成。
- Step 16: Vercel pre-deployment check：已完成。
- Step 17: post-deployment QA checklist：已完成。
- Step 18: price data source architecture：已完成。
- Step 19: daily price CSV import：已完成。
- Step 20: Taiwan closing price provider, user-triggered：已完成。
- Step 21: one-click price refresh and re-analysis dashboard flow：已完成。
- Step 22: Taiwan ETF holdings automation scope and provider architecture：已完成。
- Step 23: 0050 ETF holdings provider prototype：已完成。
- Step 39: underlying market classification for 台股 / 美股 / 其他 / 未分類：已完成。00646 自動 provider 仍未實作，只支援手動 / CSV 匯入美股成分。
- Step 41: lookthrough display threshold and small exposure grouping：已完成。只影響表格顯示，不改變計算總數。

Step 11 特別說明：

原本較廣的 ETF version comparison / added / removed / increased / decreased holdings 功能已移除，以避免和獨立的 active ETF research project 重疊。本專案只保留輕量的 ETF 成分股資料狀態、資料日期與 freshness 行為。

Step 23 特別說明：

- 已新增 `0050` provider prototype。
- 嘗試來源是元大官方 0050 持股比重頁：
  `https://www.yuantaetfs.com/product/detail/0050/ratio`
- Shell fetch 可以讀取官方頁面 HTML。
- Browser fetch 可能被 CORS 擋住，因為回應未開放 `Access-Control-Allow-Origin`。
- 目前 parser 只能從 SSR HTML 中抽出 5 筆可見股票權重列。
- 因此 `0050` provider 目前標示為 `partial`，不是 full support。
- CSV 匯入仍是穩定備援流程。

## 6. Current Pages

- `Dashboard`: 顯示投資組合總覽、總市值、穿透曝險、產業曝險、集中度警示、未對應 ETF 警示、價格覆蓋率，以及一鍵價格更新與重新分析流程。
- `HoldingsPage`: 管理手動持股模式的 ETF 與個股部位，資料存入 localStorage。
- `EtfConstituentsPage`: 管理 ETF 成分股，支援手動新增、CSV 匯入、資料狀態檢查、provider config、0050 provider 測試與結果預覽儲存。
- `LookthroughPage`: 顯示 ETF 穿透後的底層股票曝險、產業曝險，以及台股 / 美股 / 其他 / 未分類的成分市場曝險。
- `OverlapPage`: 分析不同 ETF 之間的底層成分股重疊。
- `TransactionsPage`: 管理交易紀錄，支援手動輸入與 CSV 匯入，並用交易紀錄計算目前部位。
- `PricesPage`: 管理每日價格紀錄、手動價格、CSV 匯入價格、provider 匯入價格與價格覆蓋率。
- `BackupPage`: 匯出完整 JSON 備份、匯入 JSON 備份，以及匯出相關 CSV。

目前沒有 active 的 `EtfVersionComparePage`，不要把已刪除的 ETF 版本比較頁面當成現行功能。

## 7. Current Hooks

- `usePortfolioHoldings`: 管理手動投資組合持股與 localStorage。
- `useEtfConstituents`: 管理 ETF 成分股資料、依 ETF 取代成分股、CSV/manual 匯入後儲存。
- `useTransactions`: 管理交易紀錄與 localStorage。
- `usePriceRecords`: 管理價格紀錄、單筆新增/更新、批次 upsert、CSV/provider 匯入價格。
- `useAppSettings`: 管理 app 設定，包含 manual holdings mode 與 transaction mode。
- `useEtfProviderConfigs`: 管理 ETF holdings provider configs，localStorage key 為 `etf-lookthrough-etf-provider-configs`。
- `useLocalStorage`: 通用 localStorage helper，處理讀取、寫入與 JSON parse fallback。

## 8. Current Lib Utilities

- `lookthrough.ts`: 計算 ETF 穿透後的底層股票曝險、產業曝險、集中度警示與未對應 ETF。
- `overlap.ts`: 計算 ETF 之間的底層成分股重疊、共同持股與重疊權重。
- `positions.ts`: 將交易紀錄彙總成目前部位、股數、成本與 realized/unrealized 相關欄位。
- `prices.ts`: 處理最新價格查找、市值估算、價格覆蓋率、缺少價格代號與 position market value。
- `portfolioSource.ts`: 依 app 設定選擇 manual holdings 或 transaction positions 作為 Dashboard / lookthrough 計算來源。
- `backup.ts`: 建立 JSON 備份、預覽備份、還原備份、匯出 CSV。
- `importTransactions.ts`: 解析交易紀錄 CSV / Excel-like tabular data。
- `importPrices.ts`: 解析每日價格 CSV / Excel-like tabular data 並轉成 price records。
- `priceProviders.ts`: 定義台灣價格 provider 架構，包含 TWSE / TPEx 使用者觸發的收盤價 fetch 與 price record 轉換。
- `priceRefresh.ts`: Dashboard 一鍵價格更新流程，呼叫可用 provider、upsert price records、回傳匯入摘要與警示。
- `constituentVersions.ts`: 輕量計算 ETF 成分股資料狀態、最新日期與 freshness；不是版本比較研究。
- `etfHoldingsProviders.ts`: ETF holdings provider 通用架構與 placeholder capability notes。
- `marketClassification.ts`: 底層成分市場分類 helper，支援 `TW`、`US`、`OTHER`、`UNKNOWN`，並讓 00646 未匯入成分股時先以美股 ETF placeholder 呈現。
- `taiwanEtfProviders.ts`: 台灣 ETF provider prototype，目前包含 `0050` 元大官方 ratio page 嘗試、parser helper 與 provider config 測試流程。
- `format.ts`: 數字、百分比、貨幣等顯示格式。
- `formatters.ts`: 輔助格式化 helper。
- `portfolioStorage.ts`: 手動持股 localStorage key 與基礎儲存 helper。

## 9. Current Types

- `src/types/portfolio.ts`
  - `PortfolioHolding`
  - `HoldingCategory`
  - `UnderlyingMarket`
  - `EtfConstituent`
  - `LookthroughExposure`
  - `IndustryExposure`
- `src/types/transactions.ts`
  - `TransactionRecord`
  - `TransactionType`
  - `CalculatedPosition`
- `src/types/prices.ts`
  - `PriceSourceType`
  - `PriceRecord`
  - `PositionWithMarketValue`
- `src/types/priceProvider.ts`
  - price provider market / status / fetch result / fetched price row 相關型別。
- `src/types/etfProvider.ts`
  - `EtfHoldingsProviderType`
  - `EtfHoldingsProviderStatus`
  - `EtfHoldingsFetchResult`
  - `EtfProviderConfig`
- `src/types/settings.ts`
  - `PortfolioDataSourceMode`
  - `AppSettings`
- Backup / import related types 多數 colocated 在 utility：
  - `BackupFile`, `BackupPreview` in `backup.ts`
  - transaction import row/result types in `importTransactions.ts`
  - price import row/result types in `importPrices.ts`

## 10. localStorage Keys

- `etf-lookthrough-portfolio-holdings`: 手動投資組合持股。
- `etf-lookthrough-etf-constituents`: ETF 成分股資料。
- `etf-lookthrough-transactions`: 交易紀錄。
- `etf-lookthrough-price-records`: 價格紀錄，包含 manual / csv / provider 來源。
- `etf-lookthrough-app-settings`: App 設定，包含 portfolio source mode。
- `etf-lookthrough-last-price-refresh`: Dashboard 上次價格更新 / 重新分析時間。
- `etf-lookthrough-etf-provider-configs`: ETF holdings provider configs。

## 11. Main Calculation Logic

Lookthrough exposure:

`portfolioSource.ts` 先依 `useAppSettings` 選擇資料來源。如果是 manual mode，使用 `HoldingsPage` 的手動部位；如果是 transaction mode，使用 `positions.ts` 由交易紀錄算出的目前部位，並在有價格時估算市值。接著 `lookthrough.ts` 將 ETF 持股依 ETF 成分股權重拆到個股曝險，個股則直接保留為底層曝險。

Step 39 起，每筆 `EtfConstituent` 與 `LookthroughExposure` 可帶 `underlyingMarket`。若資料未明確提供，`marketClassification.ts` 會依股票代號與 ETF context 推論：四碼台股代號與 `.TW` / `.TWO` 為台股成分，英文字母 ticker 為美股成分，00646 的底層預設為美股成分但台股格式仍優先判斷為台股。00646 若尚未匯入成分股，會以單一美股 ETF placeholder 進入穿透分析，不會被標為台股成分。

ETF 成分股 CSV / 貼上表格支援選填 `市場` / `成分市場` / `股票市場` / `market` / `underlyingMarket` 欄位，值可用 `台股`、`台灣`、`TW`、`Taiwan`、`美股`、`美國`、`US`、`USA`、`其他`、`OTHER`。00646 自動 provider 與 S&P 500 自動抓取仍未實作。

Step 40 起，「ETF 成分股」頁提供 00646 手動匯入提示與範例格式。使用者可貼上或 CSV 匯入 `股票代號,股票名稱,持股權重,市場`，市場填 `美股` / `US`；若省略市場欄位，00646 的美股 ticker 會預設顯示為 `美股成分`。預覽表會顯示「成分市場」。若 00646 匯入列出現四碼台股格式代號，頁面只提醒確認資料來源，不阻擋儲存。此步驟仍不處理 USD/TWD 匯率轉換，也沒有 00646 / S&P 500 自動 provider。

Step 41 起，「穿透分析」頁有 display-only 顯示門檻：預設最小顯示金額 `NT$1`、最小投組佔比 `0.01%`，並預設將低於門檻的 exposure 依 `underlyingMarket` 彙總為其他台股 / 美股 / 其他市場 / 未分類成分。這只改變底層股票曝險表格列出的細項，不改變 `lookthrough.ts` 的原始計算、總市值、市場曝險、產業曝險或集中度計算。

ETF overlap:

`overlap.ts` 比較不同 ETF 的 constituent stock symbols，找出共同持股、共同權重與重疊程度，用來檢查不同 ETF 是否其實買到相似底層股票。

Transactions to positions:

`positions.ts` 將買進、賣出、股息等交易紀錄彙總成目前部位，包含股數、成本與平均成本等欄位。transaction mode 的投資組合來源由這些 positions 轉換而來。

Prices and market value:

`prices.ts` 依 symbol 找最新價格，用 `shares * latest price` 估算市值。若缺少價格，該部位會被列入 missing price summary，避免默默用錯誤市值。

Manual mode vs transaction mode:

- Manual mode: Dashboard / Lookthrough 使用手動持股與使用者輸入的 market value。
- Transaction mode: Dashboard / Lookthrough 使用交易紀錄算出的 positions，並透過最新價格估算市值。
- `PortfolioModeSwitch` 只切換資料來源，不會刪除另一種模式的資料。

Price coverage:

價格覆蓋率會統計 transaction positions 中有多少部位找到最新價格，並列出缺少價格代號。Dashboard 在 transaction mode 會顯示交易部位數、已有價格數、缺少價格數、覆蓋率與缺少價格代號。

Daily price CSV import:

`PricesPage` 使用 `importPrices.ts` 解析 CSV / Excel-like data，轉成 `PriceRecord` 後透過 `usePriceRecords` upsert。相同 date + symbol 的價格會被更新或取代。

Provider price refresh:

`priceRefresh.ts` 由 Dashboard 的一鍵更新按鈕觸發，呼叫可用價格 provider，例如 TWSE / TPEx，轉成 `PriceRecord` 後批次 upsert。React state 更新後，Dashboard 既有計算會自動重新執行，不建立第二套 dashboard calculation path。

ETF constituent data usage:

ETF 成分股資料存在 `useEtfConstituents` 管理的 localStorage。Lookthrough、Overlap、Dashboard warning 與 ETF data status 都依這份資料運作。CSV/manual 匯入仍是目前最可靠來源。

## 12. Current Automation Status

- App 已可在 holdings、transactions、prices 或 ETF constituents 更新後，自動透過 React state 重新計算 Dashboard 與 lookthrough exposure。
- Price automation 已部分完成，透過使用者在 Dashboard 觸發 provider refresh，不是背景排程。
- Daily price CSV import 提供半自動備援流程。
- ETF constituent automation 仍在早期階段。
- `0050` provider 目前只是 partial prototype。
- 純 frontend + localStorage 架構下，ETF 成分股全自動化不一定可靠，原因包含 CORS、issuer 網站格式差異、動態頁面、官方資料頻率不同。
- 網站關閉時自動背景每日分析不可能在目前 frontend-only localStorage 設計中完成；若未來需要，必須另行評估 backend / serverless / scheduled infrastructure，但這不是目前 Step 24 目標。

目前每日分析是使用者開啟網站後手動觸發更新，不是背景排程。

## 13. Next Planned Step: Step 24 — Stabilize The 0050 ETF Holdings Provider Source

Step 24 應該只做 `0050` provider source 穩定化，不擴大到其他 ETF。

Step 24 應該調查官方來源：

- Yuanta 0050 ratio page:
  `https://www.yuantaetfs.com/product/detail/0050/ratio`
- Yuanta 0050 PCF page:
  `https://www.yuantaetfs.com/tradeInfo/pcf/0050`
- 從官方頁面或 Nuxt chunks 中可發現的官方 downloadable file 或 stable endpoint。

Step 24 應該確認：

- PCF 是否包含完整 holdings / basket rows。
- PCF 是否有可用的 weightPercent，或是否能用可靠欄位推導。
- Browser CORS 是否擋住自動 fetching。
- 若官方來源不穩，CSV 匯入繼續作為 fallback。

Step 24 不應該：

- 擴大到其他 ETF。
- 使用非官方來源。
- 做 fragile arbitrary HTML scraping，除非明確標示 experimental。
- 加入 backend / serverless proxy。
- 實作 active ETF research。

## 14. Deployment And Data Warning

- App 是 local-first。
- 資料存放在每個 browser / device 的 localStorage。
- 桌機和手機不會自動同步。
- 若要在不同裝置之間搬移資料，請使用 JSON backup / export / import。
- 清除瀏覽器資料、重設網站資料或更換瀏覽器可能會刪除 app data。
- 即使有 Vercel deployment，GitHub repository 仍可以保持 private。

## 15. Known Limitations / Technical Debt

- No backend。
- No login。
- No database。
- ETF 成分股自動抓取尚未達到完整可靠。
- 尚無海外 ETF 自動化支援。
- 尚無 `00646` 成分股自動化。
- 無 cross-device sync。
- localStorage schema migration 尚未完整設計。
- 寬表格在手機上的 UX 仍可改善。
- 重要 calculation utilities 需要更完整的測試。
- 必須持續和舊的 active ETF research project 保持清楚分離。
- `0050` provider 目前 partial，原因是官方 ratio page SSR 只解析出 5 筆可見列，且 browser fetch 可能受 CORS 阻擋。

## 16. Safe Next Steps After Step 24

1. 如果 `0050` PCF 提供可用完整權重，且 browser fetch 可行，將 `0050` provider 升級為 full support。
2. 如果官方來源被 CORS 阻擋，先維持 CSV fallback 為預設流程，之後再評估非常薄的 serverless proxy。
3. 如果 PCF 只有 shares 但沒有 weights，不要儲存不完整 constituents 給 lookthrough 使用；只有在能用可靠 value 欄位推導權重時才升級。
4. 為 parser utilities 加上輕量測試。
5. 只有在 `0050` 穩定後，才考慮下一檔台灣 ETF。
6. 暫時不要實作海外 ETF automation。

## 17. 下一次 Codex 建議指令

```text
Please work inside:
C:\Users\uuuu1\OneDrive\桌面\ETF-Lookthrough-Analyzer

Read PROJECT_HANDOFF.md first.

Implement Step 24 only: stabilize the 0050 ETF holdings provider source.

Important:
- Do not expand to other ETFs yet.
- Do not implement active ETF manager research features.
- Do not add added/removed/increased/decreased holdings analysis.
- Do not add stock return correlation analysis.
- Do not add backend, database, login, serverless proxy, scheduled jobs, or background automation.
- Do not remove manual or CSV ETF constituent import.

Step 24 goal:
- Investigate official 0050 sources:
  - https://www.yuantaetfs.com/product/detail/0050/ratio
  - https://www.yuantaetfs.com/tradeInfo/pcf/0050
  - official downloadable files or stable endpoints discoverable from official pages or Nuxt chunks.
- Determine whether PCF contains full holdings/basket rows.
- Determine whether usable weightPercent can be derived reliably.
- Determine whether browser CORS blocks automatic fetching.
- Keep CSV import as fallback.
- Avoid unofficial sources.
- Avoid fragile scraping unless clearly marked experimental.
- Build and test after changes.
```

## 18. Verification Notes

交接文件更新後應執行：

```powershell
npm.cmd run build
npx.cmd tsc --noEmit --noUnusedLocals --noUnusedParameters
```

若有檔案變更：

```powershell
git status
git add PROJECT_HANDOFF.md README.md docs/
git commit -m "Update handoff before 0050 provider stabilization"
git push
```

## 19. MVP 聚焦模式

Step 26 後，App 主要導覽改為 MVP 流程：

1. 設定我的持股 -> `HoldingsPage`
2. ETF 成分股 -> `EtfConstituentsPage`
3. 穿透分析 -> `LookthroughPage`

進階功能沒有刪除，仍保留在程式碼中，並可從 App shell 的「進階工具」展開：

- 儀表板 -> `Dashboard`
- ETF 重疊 -> `OverlapPage`
- 交易紀錄 -> `TransactionsPage`
- 價格表 -> `PricesPage`
- 備份匯出 -> `BackupPage`

MVP 的核心使用方式是：手動輸入目前 ETF / 股票持股市值，匯入或測試取得 ETF 成分股，再到穿透分析查看底層台股曝險、投組佔比、來源拆解、產業曝險、集中度提醒與未對應 ETF 提醒。

交易紀錄、價格自動化、備份、Dashboard 與 provider diagnostics 屬於進階能力，不是 MVP 必要條件。不要刪除這些功能，但也不要讓它們主導主要流程。本專案仍應維持 personal ETF lookthrough analyzer 定位，不應變成 active ETF research platform。
