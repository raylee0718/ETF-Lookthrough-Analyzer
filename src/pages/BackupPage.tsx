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

const formatBackupDate = (value: string | undefined) => {
  if (!value) {
    return "未提供";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "未提供" : date.toLocaleString("zh-TW");
};

export default function BackupPage({
  holdings,
  constituents,
  transactions,
  priceRecords,
}: BackupPageProps) {
  const { settings } = useAppSettings();
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [backupJsonText, setBackupJsonText] = useState("");
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

  const previewBackupValue = (value: unknown) => {
    const result = validateBackupFile(value);

    if (!result.backup || !result.preview) {
      setImportPreview(null);
      setPendingBackup(null);
      setImportError(result.error ?? "備份檔格式不正確。");
      return;
    }

    setPendingBackup(result.backup);
    setImportPreview(result.preview);
    setImportError("");
    setImportSuccess("");
  };

  const previewBackupJson = (text: string) => {
    try {
      previewBackupValue(JSON.parse(text) as unknown);
    } catch {
      setImportPreview(null);
      setPendingBackup(null);
      setImportError("無法解析 JSON，請確認內容。");
      setImportSuccess("");
    }
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
      const text = String(reader.result ?? "");
      setBackupJsonText(text);
      previewBackupJson(text);
    };

    reader.readAsText(file, "utf-8");
    event.target.value = "";
  };

  const handleRestoreBackup = () => {
    if (!pendingBackup) {
      return;
    }

    const confirmed = window.confirm(
      "確認還原？目前資料會被此備份取代。",
    );

    if (!confirmed) {
      return;
    }

    restoreBackupToLocalStorage(pendingBackup);
    setImportSuccess("資料已還原，請重新整理頁面。");
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
            備份資料
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            資料只保存在此瀏覽器，建議定期備份。
          </p>
        </header>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 sm:p-5">
          還原資料會取代目前資料，確認前不會套用。
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
            title="備份資料"
            description="包含持股、交易、價格、ETF 成分股與使用設定。"
          >
            <div className="grid gap-4">
              <button
                className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-fit"
                onClick={handleJsonExport}
                type="button"
              >
                下載備份
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="還原資料"
            description="先預覽備份內容，確認後才會取代目前資料。"
          >
            <div className="grid gap-4">
              <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 sm:w-fit">
                選擇備份檔
                <input
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleJsonImport}
                  type="file"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                貼上備份 JSON
                <textarea
                  className="min-h-32 rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setBackupJsonText(event.target.value)}
                  value={backupJsonText}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-slate-400"
                  disabled={!backupJsonText.trim()}
                  onClick={() => previewBackupJson(backupJsonText)}
                  type="button"
                >
                  預覽備份
                </button>
                <button
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                  onClick={() => {
                    setBackupJsonText("");
                    setImportPreview(null);
                    setPendingBackup(null);
                    setImportError("");
                    setImportSuccess("");
                  }}
                  type="button"
                >
                  清除
                </button>
              </div>

              {importError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {importError}
                </div>
              ) : null}

              {importPreview ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <h3 className="font-semibold text-slate-950">還原預覽</h3>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <p>
                      備份時間：
                      {formatBackupDate(importPreview.exportedAt)}
                    </p>
                    <p>手動持股：{importPreview.manualHoldingsCount} 筆</p>
                    <p>ETF 成分股組數：{importPreview.etfConstituentSetCount} 組</p>
                    <p>ETF 成分股明細：{importPreview.etfConstituentRecordCount} 筆</p>
                    <p>交易紀錄：{importPreview.transactionsCount} 筆</p>
                    <p>價格資料：{importPreview.priceRecordsCount} 筆</p>
                    <p>
                      使用設定：
                      {importPreview.hasAppSettings ? "包含" : "不包含"}
                    </p>
                  </div>
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    確認還原後，目前資料會被取代。
                  </p>
                  <button
                    className="mt-4 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
                    onClick={handleRestoreBackup}
                    type="button"
                  >
                    確認還原
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
          description="下載個別資料表或分析結果。"
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
