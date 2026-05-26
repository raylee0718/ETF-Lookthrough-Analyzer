import { ChangeEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import { useAppSettings } from "../hooks/useAppSettings";
import {
  createBackupFile,
  downloadTextFile,
  etfConstituentsToCsv,
  industryExposuresToCsv,
  lookthroughExposuresToCsv,
  manualHoldingsToCsv,
  overlapPairsToCsv,
  priceRecordsToCsv,
  restoreBackupToLocalStorage,
  transactionsToCsv,
  validateBackupFile,
  type BackupFile,
  type BackupPreview,
} from "../lib/backup";
import {
  calculateIndustryExposure,
  calculateLookthroughExposure,
} from "../lib/lookthrough";
import { calculateAllEtfOverlapPairs } from "../lib/overlap";
import { getPortfolioHoldingsForAnalysis } from "../lib/portfolioSource";
import type { EtfConstituent, PortfolioHolding } from "../types/portfolio";
import type { PriceRecord } from "../types/prices";
import type { TransactionRecord } from "../types/transactions";

type BackupPageProps = {
  holdings: PortfolioHolding[];
  constituents: EtfConstituent[];
  transactions: TransactionRecord[];
  priceRecords: PriceRecord[];
};

const timestampForFilename = () =>
  new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export default function BackupPage({
  holdings,
  constituents,
  transactions,
  priceRecords,
}: BackupPageProps) {
  const { settings } = useAppSettings();
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const holdingsForAnalysis = useMemo(
    () =>
      getPortfolioHoldingsForAnalysis({
        mode: settings.portfolioDataSourceMode,
        manualHoldings: holdings,
        transactions,
        priceRecords,
      }).holdingsForAnalysis,
    [settings.portfolioDataSourceMode, holdings, transactions, priceRecords],
  );
  const lookthroughExposures = useMemo(
    () => calculateLookthroughExposure(holdingsForAnalysis, constituents),
    [holdingsForAnalysis, constituents],
  );
  const industryExposures = useMemo(
    () => calculateIndustryExposure(lookthroughExposures),
    [lookthroughExposures],
  );
  const overlapPairs = useMemo(
    () => calculateAllEtfOverlapPairs(constituents),
    [constituents],
  );

  const handleJsonExport = () => {
    const backup = createBackupFile({
      manualHoldings: holdings,
      etfConstituents: constituents,
      transactions,
      priceRecords,
      appSettings: settings,
    });

    downloadTextFile(
      `etf-lookthrough-backup-${timestampForFilename()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json;charset=utf-8",
    );
  };

  const handleJsonImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImportError("");
    setImportSuccess("");
    setImportPreview(null);
    setPendingBackup(null);

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsedValue = JSON.parse(String(reader.result ?? "")) as unknown;
        const result = validateBackupFile(parsedValue);

        if (!result.backup || !result.preview) {
          setImportError(result.error ?? "備份檔格式不正確。");
          return;
        }

        setPendingBackup(result.backup);
        setImportPreview(result.preview);
      } catch {
        setImportError("無法解析 JSON 檔案，請確認檔案內容。");
      }
    };

    reader.readAsText(file, "utf-8");
    event.target.value = "";
  };

  const handleRestoreBackup = () => {
    if (!pendingBackup) {
      return;
    }

    const confirmed = window.confirm(
      "確定要用此備份檔取代目前所有本機資料嗎？這會覆蓋持股、成分股、交易、價格與設定。",
    );

    if (!confirmed) {
      return;
    }

    restoreBackupToLocalStorage(pendingBackup);
    setImportSuccess("備份已匯入。請重新整理頁面以載入匯入後的資料。");
  };

  const csvExports = [
    {
      label: "手動持股 CSV",
      description: "匯出「我的持股」資料",
      filename: "manual-holdings",
      content: () => manualHoldingsToCsv(holdings),
    },
    {
      label: "ETF 成分股 CSV",
      description: "匯出已儲存的 ETF 成分股資料",
      filename: "etf-constituents",
      content: () => etfConstituentsToCsv(constituents),
    },
    {
      label: "交易紀錄 CSV",
      description: "匯出買進與賣出紀錄",
      filename: "transactions",
      content: () => transactionsToCsv(transactions),
    },
    {
      label: "價格資料 CSV",
      description: "匯出手動價格表",
      filename: "price-records",
      content: () => priceRecordsToCsv(priceRecords),
    },
    {
      label: "穿透曝險 CSV",
      description: "依目前資料來源模式計算後匯出",
      filename: "lookthrough-exposures",
      content: () => lookthroughExposuresToCsv(lookthroughExposures),
    },
    {
      label: "產業曝險 CSV",
      description: "依穿透曝險彙總後匯出",
      filename: "industry-exposures",
      content: () => industryExposuresToCsv(industryExposures),
    },
    {
      label: "ETF 重疊 CSV",
      description: "匯出所有 ETF 配對重疊分析",
      filename: "etf-overlap-pairs",
      content: () => overlapPairsToCsv(overlapPairs),
    },
  ];

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="py-3">
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            備份匯出
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            匯出完整 JSON 備份，或將分析結果與資料表下載成 CSV。匯入備份前會先預覽，不會自動覆蓋資料。
          </p>
        </header>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 sm:p-5">
          部署、換瀏覽器、換手機或清除瀏覽資料前，請先下載完整 JSON 備份。資料不會自動同步不同裝置。
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="手動持股"
            value={`${holdings.length} 筆`}
            helperText="JSON 備份會包含"
          />
          <StatCard
            label="ETF 成分股"
            value={`${constituents.length} 筆`}
            helperText="JSON 備份會包含"
          />
          <StatCard
            label="交易紀錄"
            value={`${transactions.length} 筆`}
            helperText="JSON 備份會包含"
          />
          <StatCard
            label="價格資料"
            value={`${priceRecords.length} 筆`}
            helperText="JSON 備份會包含"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="JSON 完整備份"
            description="包含所有本機資料與目前 App 設定。"
          >
            <div className="grid gap-4">
              <button
                className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-fit"
                onClick={handleJsonExport}
                type="button"
              >
                下載完整 JSON 備份
              </button>
              <p className="text-sm leading-6 text-slate-500">
                備份檔包含 `appName`, `version`, `exportedAt`,
                手動持股、ETF 成分股、交易紀錄、價格資料與 App 設定。
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="JSON 備份匯入"
            description="先選擇檔案並預覽筆數，確認後才會覆蓋目前資料。"
          >
            <div className="grid gap-4">
              <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 sm:w-fit">
                選擇 JSON 備份檔
                <input
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleJsonImport}
                  type="file"
                />
              </label>

              {importError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {importError}
                </div>
              ) : null}

              {importPreview ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <h3 className="font-semibold text-slate-950">匯入預覽</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <p>手動持股：{importPreview.manualHoldingsCount} 筆</p>
                    <p>ETF 成分股：{importPreview.etfConstituentsCount} 筆</p>
                    <p>交易紀錄：{importPreview.transactionsCount} 筆</p>
                    <p>價格資料：{importPreview.priceRecordsCount} 筆</p>
                    <p>
                      App 設定：
                      {importPreview.hasAppSettings ? "包含" : "不包含"}
                    </p>
                  </div>
                  <button
                    className="mt-4 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
                    onClick={handleRestoreBackup}
                    type="button"
                  >
                    確認匯入並覆蓋目前資料
                  </button>
                </div>
              ) : null}

              {importSuccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  <p>{importSuccess}</p>
                  <button
                    className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    onClick={() => window.location.reload()}
                    type="button"
                  >
                    重新整理頁面
                  </button>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="CSV 匯出"
          description="CSV 會包含 UTF-8 BOM，方便 Excel 正確開啟繁體中文。"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {csvExports.map((item) => (
              <div
                className="rounded-lg border border-stone-200 bg-stone-50 p-4"
                key={item.filename}
              >
                <h3 className="font-semibold text-slate-950">{item.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
                <button
                  className="mt-4 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                  onClick={() =>
                    downloadTextFile(
                      `${item.filename}-${timestampForFilename()}.csv`,
                      item.content(),
                      "text/csv;charset=utf-8",
                    )
                  }
                  type="button"
                >
                  下載 CSV
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
