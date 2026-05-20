# 部署與手機測試檢查表

此專案是 Vite React local-first 靜態前端 App。資料儲存在瀏覽器 localStorage，不需要後端、登入、資料庫、API、爬蟲或自動報價服務。

## A. 本機 build 測試

部署前請在專案根目錄執行：

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run preview
```

確認事項：

- `npm.cmd run build` 成功完成。
- build 產物輸出到 `dist/`。
- `npm.cmd run preview` 可正常開啟 production build。
- App 重新整理後仍可讀取同一瀏覽器中的 localStorage 資料。

## B. Vercel 部署設定

- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

部署後請用正式網址重新跑一次手機測試檢查表。

## C. Netlify 部署設定

- Build Command: `npm run build`
- Publish Directory: `dist`

部署後請確認 `manifest.webmanifest`、`sw.js`、icon 檔案與主要 JS/CSS 資源都能正常載入。

## D. GitHub Pages 注意事項

如果部署在 GitHub Pages 的 repository subpath，例如：

```text
https://使用者名稱.github.io/repository-name/
```

Vite 的 `base` 可能需要調整為：

```ts
base: "/repository-name/"
```

目前未實作 GitHub Pages 專用設定。只有在實際要部署到 repository subpath 時，才需要調整 `vite.config.ts`。

## E. 手機測試檢查表

請用手機開啟部署後的正式網址，逐項確認：

- 開啟部署後的網站。
- 新增一筆手動持股。
- 重新整理頁面，確認資料仍存在。
- 匯入 ETF 成分股資料。
- 執行穿透持股分析。
- 新增一筆交易紀錄。
- 新增一筆價格紀錄。
- 切換手動持股 / 交易紀錄模式。
- 匯出 JSON 備份。
- 重新匯入 JSON 備份。
- 匯出 CSV。
- 檢查寬表格可以水平捲動。
- 如果 PWA 已啟用，檢查手機瀏覽器是否可安裝，或是否出現安裝提示。

## F. Local-first 資料提醒

- 資料是依瀏覽器與裝置分開儲存在 localStorage。
- 桌機與手機不會自動同步資料。
- 要移動資料到另一台裝置，請先匯出完整 JSON 備份，再到新裝置匯入。
- 清除瀏覽器資料、換瀏覽器、換手機、使用無痕模式或重設網站資料，都可能刪除 App 資料。
- 部署、換裝置或清除資料前，請先下載完整 JSON 備份。

## 部署 readiness 結論

- Vite build 輸出目錄為 `dist/`。
- `package.json` 已提供 `dev`、`build`、`preview` scripts。
- 目前 App 不需要 `.env`。
- 目前 App 不需要 secret values。
- PWA 產物由 Vite build 產生，可放在靜態主機。
- localStorage 資料不依賴後端。
