import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
import {
  loadGoogleGsiScript,
  authorizeGoogleDrive,
  findBackupFile,
  downloadBackupFile,
  uploadBackupFile,
} from "../lib/googleDriveSync";

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

  // Google Drive Sync States
  const [gdriveClientId, setGdriveClientId] = useState(() => {
    return window.localStorage.getItem("etf-lookthrough-gdrive-client-id") ?? "";
  });
  const [gdriveAccessToken, setGdriveAccessToken] = useState("");
  const [gdriveStatus, setGdriveStatus] = useState<"idle" | "connecting" | "connected" | "failed">("idle");
  const [gdriveFileMeta, setGdriveFileMeta] = useState<{ id: string; modifiedTime: string } | null>(null);
  const [gdriveSyncLoading, setGdriveSyncLoading] = useState(false);
  const [gdriveMessage, setGdriveMessage] = useState("");
  const [gdriveErrorMessage, setGdriveErrorMessage] = useState("");
  const [showGdriveTutorial, setShowGdriveTutorial] = useState(false);
  const [cloudPreview, setCloudPreview] = useState<BackupPreview | null>(null);
  const [cloudPendingBackup, setCloudPendingBackup] = useState<BackupFile | null>(null);

  // Load Google Identity Services Script on Mount
  useEffect(() => {
    loadGoogleGsiScript().catch((err) => {
      console.warn("Failed to load Google GSI library:", err);
    });
  }, []);

  const handleConnectGDrive = async () => {
    setGdriveMessage("");
    setGdriveErrorMessage("");
    setCloudPreview(null);
    setCloudPendingBackup(null);

    if (!gdriveClientId.trim()) {
      setGdriveErrorMessage("請輸入您的 Google Client ID。");
      return;
    }

    // Save Client ID
    window.localStorage.setItem("etf-lookthrough-gdrive-client-id", gdriveClientId.trim());
    setGdriveStatus("connecting");

    try {
      // 1. Authorize
      const token = await authorizeGoogleDrive(gdriveClientId);
      setGdriveAccessToken(token);
      setGdriveStatus("connected");

      // 2. Search for backup file
      setGdriveSyncLoading(true);
      const fileMeta = await findBackupFile(token);
      setGdriveFileMeta(fileMeta);

      if (fileMeta) {
        setGdriveMessage("成功連線並已找到雲端備份檔。");
      } else {
        setGdriveMessage("成功連線！您的雲端硬碟中目前尚無備份，您可以點擊「上傳資料」建立一個。");
      }
    } catch (err) {
      setGdriveStatus("failed");
      setGdriveErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setGdriveSyncLoading(false);
    }
  };

  const handleUploadToCloud = async () => {
    setGdriveMessage("");
    setGdriveErrorMessage("");

    if (!gdriveAccessToken) {
      setGdriveErrorMessage("尚未連線，請先連線您的 Google Drive。");
      return;
    }

    setGdriveSyncLoading(true);
    try {
      const backup = createBackupFile({
        manualHoldings: holdings,
        etfConstituents: constituents,
        transactions,
        priceRecords,
        appSettings: settings,
      });

      await uploadBackupFile(
        gdriveAccessToken,
        backup,
        gdriveFileMeta?.id || undefined
      );

      // Re-fetch file metadata to get latest modification time
      const nextFileMeta = await findBackupFile(gdriveAccessToken);
      setGdriveFileMeta(nextFileMeta);
      setGdriveMessage("備份資料已成功上傳至您的 Google Drive！");
    } catch (err) {
      setGdriveErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setGdriveSyncLoading(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    setGdriveMessage("");
    setGdriveErrorMessage("");
    setCloudPreview(null);
    setCloudPendingBackup(null);

    if (!gdriveAccessToken || !gdriveFileMeta) {
      setGdriveErrorMessage("雲端硬碟中找不到可下載的備份。");
      return;
    }

    setGdriveSyncLoading(true);
    try {
      const fileContent = await downloadBackupFile(gdriveAccessToken, gdriveFileMeta.id);
      const result = validateBackupFile(fileContent);

      if (!result.backup || !result.preview) {
        setGdriveErrorMessage(result.error ?? "下載的雲端備份檔格式不正確。");
        return;
      }

      setCloudPendingBackup(result.backup);
      setCloudPreview(result.preview);
      setGdriveMessage("成功下載備份！請在下方預覽備份內容並點擊「確認雲端還原」套用。");
    } catch (err) {
      setGdriveErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setGdriveSyncLoading(false);
    }
  };

  const handleRestoreCloudBackup = () => {
    if (!cloudPendingBackup) {
      return;
    }

    const confirmed = window.confirm(
      "確認還原雲端備份？這將會完全取代您目前的本機持股與交易紀錄！"
    );

    if (!confirmed) {
      return;
    }

    restoreBackupToLocalStorage(cloudPendingBackup);
    setImportSuccess("雲端備份還原成功！請重新整理網頁套用變更。");
    setCloudPreview(null);
    setCloudPendingBackup(null);
  };

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
      description: "依目前分析資料計算後匯出",
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
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
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

        {/* Google Drive 雲端備份與同步 */}
        <SectionCard
          title="個人雲端硬碟同步 (Google Drive)"
          description="將您的完整資料（包含交易、持股與成分股）儲存在您自己私人的 Google 雲端硬碟，維護極致隱私並實現跨裝置同步。"
        >
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3 md:items-end">
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Google Client ID
                <input
                  type="text"
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-mono"
                  placeholder="請貼上您申請的 Google Client ID"
                  value={gdriveClientId}
                  onChange={(e) => setGdriveClientId(e.target.value)}
                  disabled={gdriveStatus === "connecting" || gdriveStatus === "connected"}
                />
              </label>

              <div className="flex gap-2">
                {gdriveStatus !== "connected" ? (
                  <button
                    className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:bg-stone-300 disabled:cursor-not-allowed"
                    onClick={handleConnectGDrive}
                    disabled={!gdriveClientId.trim() || gdriveStatus === "connecting" || gdriveSyncLoading}
                    type="button"
                  >
                    {gdriveStatus === "connecting" ? "連線中..." : "連線 Google Drive"}
                  </button>
                ) : (
                  <button
                    className="flex-1 rounded-lg border border-stone-300 bg-stone-100 px-4 py-2.5 text-sm font-semibold text-slate-600 transition"
                    onClick={() => {
                      setGdriveAccessToken("");
                      setGdriveStatus("idle");
                      setGdriveFileMeta(null);
                      setGdriveMessage("");
                      setCloudPreview(null);
                    }}
                    type="button"
                  >
                    中斷連線
                  </button>
                )}
                <button
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                  onClick={() => setShowGdriveTutorial(!showGdriveTutorial)}
                  type="button"
                >
                  {showGdriveTutorial ? "收合教學" : "如何申請？"}
                </button>
              </div>
            </div>

            {/* 申請教學 */}
            {showGdriveTutorial ? (
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-slate-600 grid gap-2.5">
                <p className="font-semibold text-slate-950 text-sm">💡 2 分鐘快速免費申請 Client ID 指引</p>
                <ol className="list-decimal pl-4 grid gap-1.5">
                  <li>
                    前往 <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-700 underline font-medium">Google Cloud Console 認證頁面</a>。
                  </li>
                  <li>建立或選擇一個專案，點擊首頁的<strong>「OAuth 同意畫面」</strong>配置，選擇「External」並設定必填名稱與電子信箱。</li>
                  <li>
                    前往<strong>「憑證」</strong>頁面，點擊「建立憑證」並選擇 <strong>「OAuth 用戶端 ID (OAuth Client ID)」</strong>。
                  </li>
                  <li>
                    應用程式類型選擇 <strong>「Web 應用程式 (Web Application)」</strong>。
                  </li>
                  <li>
                    在「已授權的 JavaScript 來源 (Authorized JavaScript origins)」區塊中加入以下兩個 URL：
                    <ul className="list-disc pl-4 mt-1 font-mono text-[10px] bg-white p-1 rounded border border-stone-100">
                      <li>http://localhost:5173 <span className="text-slate-400 font-sans">（本地開發）</span></li>
                      <li>{window.location.origin} <span className="text-slate-400 font-sans">（您目前的 Vercel 或主機網址）</span></li>
                    </ul>
                  </li>
                  <li>點擊「建立」，複製生成的<strong>「用戶端 ID」</strong>，將其黏貼到上方的輸入框中，點擊連線即可！</li>
                </ol>
              </div>
            ) : null}

            {/* 提示訊息 */}
            {gdriveMessage ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 leading-6">
                {gdriveMessage}
              </div>
            ) : null}

            {gdriveErrorMessage ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 leading-6">
                {gdriveErrorMessage}
              </div>
            ) : null}

            {/* 同步按鈕控制台 (僅在已連線時顯示) */}
            {gdriveStatus === "connected" ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 grid gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-950 flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                      雲端連線狀態：已授權存取個人雲端硬碟
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      備份檔名：<span className="font-mono">etf_lookthrough_backup.json</span>（將儲存於您的雲端根目錄）
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      雲端最近備份日期：
                      <span className="font-semibold text-slate-800">
                        {gdriveFileMeta ? formatBackupDate(gdriveFileMeta.modifiedTime) : "無雲端檔案"}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:bg-stone-300 disabled:cursor-not-allowed"
                      onClick={handleUploadToCloud}
                      disabled={gdriveSyncLoading}
                      type="button"
                    >
                      {gdriveSyncLoading ? "處理中..." : gdriveFileMeta ? "上傳覆蓋雲端" : "建立雲端備份"}
                    </button>
                    {gdriveFileMeta ? (
                      <button
                        className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 disabled:bg-stone-100 disabled:text-slate-400"
                        onClick={handleRestoreFromCloud}
                        disabled={gdriveSyncLoading}
                        type="button"
                      >
                        {gdriveSyncLoading ? "處理中..." : "從雲端下載還原"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* 雲端備份還原預覽 */}
                {cloudPreview ? (
                  <div className="rounded-lg border border-stone-200 bg-white p-4 mt-2">
                    <h3 className="font-semibold text-slate-950 text-sm">雲端備份還原預覽</h3>
                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <p>備份時間：{formatBackupDate(cloudPreview.exportedAt)}</p>
                      <p>手動持股：{cloudPreview.manualHoldingsCount} 筆</p>
                      <p>ETF 成分股組數：{cloudPreview.etfConstituentSetCount} 組</p>
                      <p>交易紀錄：{cloudPreview.transactionsCount} 筆</p>
                      <p>價格資料：{cloudPreview.priceRecordsCount} 筆</p>
                      <p>使用設定：{cloudPreview.hasAppSettings ? "包含" : "不包含"}</p>
                    </div>
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-950 leading-5">
                      ⚠️ 確定雲端還原後，您目前的瀏覽器本地持股、交易與收盤價資料將被完全覆蓋！
                    </p>
                    <button
                      className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-red-800"
                      onClick={handleRestoreCloudBackup}
                      type="button"
                    >
                      確認雲端還原
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <details className="rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-sm sm:p-5">
          <summary className="cursor-pointer text-base font-semibold text-slate-950">
            CSV 匯出
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {csvExports.map((item) => (
              <div
                className="rounded-lg border border-stone-200 bg-white p-4"
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
        </details>
      </div>
    </main>
  );
}
