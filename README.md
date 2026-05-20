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
