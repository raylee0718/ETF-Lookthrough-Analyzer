import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import type {
  PriceRecordInput,
  UpsertManyPriceRecordsResult,
} from "../hooks/usePriceRecords";
import { formatCurrency, formatPercent, formatShares } from "../lib/format";
import {
  parseDailyPriceImportText,
  type PriceImportRow,
} from "../lib/importPrices";
import {
  fetchTpexClosingPrices,
  fetchTwseClosingPrices,
  fetchedPricesToPriceRecords,
} from "../lib/priceProviders";
import {
  getLatestPriceMap,
  getPriceCoverageSummary,
} from "../lib/prices";
import type { PriceRecord } from "../types/prices";
import type { CalculatedPosition } from "../types/transactions";

const today = new Date().toISOString().slice(0, 10);

const dailyPriceImportSample = [
  "日期,代號,名稱,收盤價,來源,備註",
  "2026-05-20,0050,元大台灣50,190.5,手動整理,範例",
].join("\n");

const emptyForm: PriceRecordInput = {
  symbol: "",
  name: "",
  price: 0,
  date: today,
  sourceType: "manual",
  source: "",
  note: "",
};

type PricesPageProps = {
  priceRecords: PriceRecord[];
  positions: CalculatedPosition[];
  addPriceRecord: (input: PriceRecordInput) => void;
  updatePriceRecord: (id: string, input: PriceRecordInput) => void;
  deletePriceRecord: (id: string) => void;
  upsertLatestPrice: (input: PriceRecordInput) => void;
  upsertManyPriceRecords: (
    records: PriceRecordInput[],
    options: { replaceSameDateSymbol: boolean },
  ) => UpsertManyPriceRecordsResult;
  resetPriceRecords: () => void;
};

type FormErrors = Partial<Record<keyof PriceRecordInput, string>>;

type ProviderRefreshResult = {
  provider: string;
  fetchedAt: string;
  fetchedCount: number;
  importedCount: number;
  replacedCount: number;
  skippedDuplicateCount: number;
  warnings: string[];
  errors: string[];
};

export default function PricesPage({
  priceRecords,
  positions,
  addPriceRecord,
  updatePriceRecord,
  deletePriceRecord,
  upsertLatestPrice,
  upsertManyPriceRecords,
  resetPriceRecords,
}: PricesPageProps) {
  const [formValue, setFormValue] = useState<PriceRecordInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [quickPrices, setQuickPrices] = useState<Record<string, string>>({});
  const [quickDates, setQuickDates] = useState<Record<string, string>>({});
  const [priceImportText, setPriceImportText] = useState("");
  const [priceImportRows, setPriceImportRows] = useState<PriceImportRow[]>([]);
  const [priceImportError, setPriceImportError] = useState("");
  const [priceImportResult, setPriceImportResult] = useState("");
  const [replaceSameDateSymbol, setReplaceSameDateSymbol] = useState(true);
  const [providerLoading, setProviderLoading] = useState<
    "twse" | "tpex" | null
  >(null);
  const [providerRefreshResult, setProviderRefreshResult] =
    useState<ProviderRefreshResult | null>(null);

  const latestPriceMap = useMemo(
    () => getLatestPriceMap(priceRecords),
    [priceRecords],
  );
  const latestPrices = useMemo(
    () =>
      Array.from(latestPriceMap.values()).sort((a, b) =>
        a.symbol.localeCompare(b.symbol),
      ),
    [latestPriceMap],
  );
  const priceCoverageSummary = useMemo(
    () => getPriceCoverageSummary(positions, priceRecords),
    [positions, priceRecords],
  );

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formValue.symbol.trim()) {
      nextErrors.symbol = "請輸入代號";
    }

    if (!Number.isFinite(formValue.price) || formValue.price <= 0) {
      nextErrors.price = "價格必須大於 0";
    }

    if (!formValue.date) {
      nextErrors.date = "請選擇日期";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingId) {
      updatePriceRecord(editingId, formValue);
    } else {
      addPriceRecord(formValue);
    }

    setFormValue(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleEdit = (record: PriceRecord) => {
    setEditingId(record.id);
    setFormValue({
      symbol: record.symbol,
      name: record.name ?? "",
      price: record.price,
      date: record.date,
      sourceType: record.sourceType ?? "manual",
      source: record.source ?? "",
      fetchedAt: record.fetchedAt,
      note: record.note ?? "",
    });
    setErrors({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormValue(emptyForm);
    setErrors({});
  };

  const handleDelete = (record: PriceRecord) => {
    const confirmed = window.confirm(`確定要刪除 ${record.symbol} 的價格資料嗎？`);

    if (confirmed) {
      deletePriceRecord(record.id);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm("確定要清空所有價格資料嗎？");

    if (confirmed) {
      resetPriceRecords();
      handleCancelEdit();
    }
  };

  const handleQuickUpdate = (position: CalculatedPosition) => {
    const price = Number(quickPrices[position.symbol]);
    const date = quickDates[position.symbol] || today;

    if (!Number.isFinite(price) || price <= 0) {
      window.alert("請輸入大於 0 的價格。");
      return;
    }

    upsertLatestPrice({
      symbol: position.symbol,
      name: position.name,
      price,
      date,
      sourceType: "manual",
      source: "手動輸入",
      note: "由快速更新建立",
    });

    setQuickPrices((current) => ({ ...current, [position.symbol]: "" }));
    setQuickDates((current) => ({ ...current, [position.symbol]: date }));
  };

  const handleParsePriceImportText = (text = priceImportText) => {
    const result = parseDailyPriceImportText(text, priceRecords);

    setPriceImportRows(result.rows);
    setPriceImportError(result.error ?? "");
    setPriceImportResult("");
  };

  const handleImportPriceFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    setPriceImportText(text);
    handleParsePriceImportText(text);
  };

  const handleClearPriceImportPreview = () => {
    setPriceImportRows([]);
    setPriceImportError("");
    setPriceImportResult("");
  };

  const handleImportValidPriceRows = () => {
    const validRows = priceImportRows.filter((row) => row.isValid);
    const rowsToImport = validRows.filter(
      (row) => replaceSameDateSymbol || !row.isDuplicate,
    );
    const skippedInvalidCount = priceImportRows.filter(
      (row) => !row.isValid,
    ).length;

    if (rowsToImport.length === 0) {
      setPriceImportResult("沒有可匯入的有效價格。");
      return;
    }

    const result = upsertManyPriceRecords(
      rowsToImport.map((row) => row.input),
      { replaceSameDateSymbol },
    );

    setPriceImportResult(
      `匯入 ${result.importedCount} 筆，覆蓋 ${result.replacedCount} 筆，略過重複 ${result.skippedDuplicateCount} 筆，略過錯誤 ${skippedInvalidCount} 筆。`,
    );
    setPriceImportRows([]);
  };

  const handleProviderRefresh = async (market: "twse" | "tpex") => {
    setProviderLoading(market);
    setProviderRefreshResult(null);

    const providerResult =
      market === "twse"
        ? await fetchTwseClosingPrices()
        : await fetchTpexClosingPrices();
    const records = fetchedPricesToPriceRecords(providerResult.prices);
    const upsertResult =
      records.length > 0
        ? upsertManyPriceRecords(records, { replaceSameDateSymbol: true })
        : {
            importedCount: 0,
            replacedCount: 0,
            skippedDuplicateCount: 0,
          };

    setProviderRefreshResult({
      provider: providerResult.provider,
      fetchedAt: providerResult.fetchedAt,
      fetchedCount: providerResult.prices.length,
      importedCount: upsertResult.importedCount,
      replacedCount: upsertResult.replacedCount,
      skippedDuplicateCount: upsertResult.skippedDuplicateCount,
      warnings: providerResult.warnings,
      errors: providerResult.errors,
    });
    setProviderLoading(null);
  };

  const priceImportSummary = useMemo(
    () => ({
      validCount: priceImportRows.filter((row) => row.isValid).length,
      invalidCount: priceImportRows.filter((row) => !row.isValid).length,
      duplicateCount: priceImportRows.filter((row) => row.isDuplicate).length,
    }),
    [priceImportRows],
  );

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              價格表
            </h1>
          </div>
          <button
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 sm:w-auto"
            onClick={handleReset}
            type="button"
          >
            清空價格資料
          </button>
        </header>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <h2 className="text-base font-semibold">價格表說明</h2>
          <p className="mt-2 text-sm leading-6">
            這裡可手動輸入或匯入每日收盤價，讓目前持股轉換為市值。
          </p>
          <p className="mt-2 text-sm leading-6">
            價格表會用來計算目前市值。缺少價格時，相關市值與比例會先顯示為待更新。
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="價格資料筆數"
            value={`${priceRecords.length} 筆`}
            helperText="完整歷史價格紀錄"
          />
          <StatCard
            label="已有最新價格"
            value={`${latestPrices.length} 檔`}
            helperText="依最新日期取一筆"
          />
          <StatCard
            label="交易持股標的"
            value={`${positions.filter((position) => position.shares > 0).length} 檔`}
            helperText="可用快速更新補價"
          />
        </section>

        <SectionCard
          title="自動收盤價更新"
          description="這會在你按下更新時，嘗試從官方公開資料抓取台股收盤價，並寫入價格表。這不是背景自動排程。"
        >
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                disabled={providerLoading !== null}
                onClick={() => void handleProviderRefresh("twse")}
                type="button"
              >
                {providerLoading === "twse" ? "更新中..." : "更新上市收盤價"}
              </button>
              <button
                className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-slate-400"
                disabled={providerLoading !== null}
                onClick={() => void handleProviderRefresh("tpex")}
                type="button"
              >
                {providerLoading === "tpex" ? "更新中..." : "更新上櫃收盤價"}
              </button>
            </div>

            {providerRefreshResult ? (
              <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <p>來源：{providerRefreshResult.provider}</p>
                  <p>抓取：{providerRefreshResult.fetchedCount} 筆</p>
                  <p>新增：{providerRefreshResult.importedCount} 筆</p>
                  <p>更新：{providerRefreshResult.replacedCount} 筆</p>
                  <p>略過：{providerRefreshResult.skippedDuplicateCount} 筆</p>
                </div>
                <p>抓取時間：{providerRefreshResult.fetchedAt}</p>
                {providerRefreshResult.warnings.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    {providerRefreshResult.warnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                ) : null}
                {providerRefreshResult.errors.length > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
                    {providerRefreshResult.errors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="價格資料覆蓋率"
          description="缺少價格的標的會先顯示為待更新。"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="目前交易部位數"
              value={`${priceCoverageSummary.totalPositionCount} 檔`}
              helperText="股數大於 0 的交易部位"
            />
            <StatCard
              label="已有價格數"
              value={`${priceCoverageSummary.pricedPositionCount} 檔`}
              helperText="已有最新價格紀錄"
            />
            <StatCard
              label="缺少價格數"
              value={`${priceCoverageSummary.missingPriceCount} 檔`}
              helperText="待補目前價格"
            />
            <StatCard
              label="覆蓋率"
              value={formatPercent(priceCoverageSummary.coveragePercent)}
              helperText="已有價格 / 目前交易部位"
            />
          </div>
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-medium text-slate-950">缺少價格的代號</p>
            <p className="mt-2">
              {priceCoverageSummary.missingSymbols.length > 0
                ? priceCoverageSummary.missingSymbols.join("、")
                : "目前沒有缺少價格的交易部位。"}
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="每日價格匯入"
          description="貼上 CSV 或 Excel 表格資料，一次更新多筆每日收盤價。標題列為必填。"
        >
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                貼上 CSV / 表格資料
                <textarea
                  className="min-h-44 rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setPriceImportText(event.target.value)}
                  placeholder={dailyPriceImportSample}
                  value={priceImportText}
                />
              </label>

              <div className="grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  選擇 .csv 檔案
                  <input
                    accept=".csv,text/csv"
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      void handleImportPriceFile(event.target.files?.[0])
                    }
                    type="file"
                  />
                </label>

                <div className="grid gap-2">
                  <p className="text-sm font-medium text-slate-700">範例格式</p>
                  <pre className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-3 text-xs leading-5 text-slate-700">
                    {dailyPriceImportSample}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  onClick={() => handleParsePriceImportText()}
                  type="button"
                >
                  解析價格資料
                </button>
                <button
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                  onClick={handleClearPriceImportPreview}
                  type="button"
                >
                  清除預覽
                </button>
                <button
                  className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  disabled={priceImportRows.length === 0}
                  onClick={handleImportValidPriceRows}
                  type="button"
                >
                  匯入有效價格
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  checked={replaceSameDateSymbol}
                  className="h-4 w-4 rounded border-stone-300 text-blue-700 focus:ring-blue-500"
                  onChange={(event) => setReplaceSameDateSymbol(event.target.checked)}
                  type="checkbox"
                />
                覆蓋同日期同代號價格
              </label>
            </div>

            {priceImportError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {priceImportError}
              </div>
            ) : null}

            {priceImportRows.length > 0 ? (
              <div className="grid gap-3">
                <div className="grid gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-3">
                  <p>有效：{priceImportSummary.validCount} 筆</p>
                  <p>錯誤：{priceImportSummary.invalidCount} 筆</p>
                  <p>同日同代號：{priceImportSummary.duplicateCount} 筆</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-slate-500">
                        <th className="pb-3 font-medium">列號</th>
                        <th className="pb-3 font-medium">狀態</th>
                        <th className="pb-3 font-medium">日期</th>
                        <th className="pb-3 font-medium">代號</th>
                        <th className="pb-3 font-medium">名稱</th>
                        <th className="pb-3 text-right font-medium">收盤價</th>
                        <th className="pb-3 font-medium">來源</th>
                        <th className="pb-3 font-medium">備註</th>
                        <th className="pb-3 font-medium">錯誤訊息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceImportRows.map((row) => {
                        const statusLabel = !row.isValid
                          ? "錯誤"
                          : row.isDuplicate
                            ? replaceSameDateSymbol
                              ? "將覆蓋"
                              : "將略過"
                            : "有效";
                        const statusClass = !row.isValid
                          ? "bg-red-50 text-red-700 ring-red-200"
                          : row.isDuplicate
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-emerald-50 text-emerald-700 ring-emerald-200";

                        return (
                          <tr
                            className="border-b border-stone-100 align-top last:border-0"
                            key={`${row.rowNumber}-${row.input.symbol}-${row.input.date}`}
                          >
                            <td className="py-4 text-slate-600">{row.rowNumber}</td>
                            <td className="py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                              {row.isDuplicate ? (
                                <p className="mt-2 max-w-44 text-xs leading-5 text-amber-700">
                                  同一日期已有此代號價格，匯入後將更新或略過
                                </p>
                              ) : null}
                            </td>
                            <td className="py-4 text-slate-600">{row.input.date}</td>
                            <td className="py-4 font-semibold text-slate-950">
                              {row.input.symbol}
                            </td>
                            <td className="py-4 text-slate-700">
                              {row.input.name ?? "-"}
                            </td>
                            <td className="py-4 text-right font-medium text-slate-950">
                              {row.input.price > 0
                                ? formatCurrency(row.input.price)
                                : "-"}
                            </td>
                            <td className="py-4 text-slate-600">
                              {row.input.source ?? "-"}
                            </td>
                            <td className="max-w-48 truncate py-4 text-slate-500">
                              {row.input.note ?? "-"}
                            </td>
                            <td className="max-w-72 py-4 text-red-700">
                              {row.errors.length > 0 ? row.errors.join("、") : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {priceImportResult ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {priceImportResult}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionCard
            title={editingId ? "編輯價格" : "新增價格"}
            description="同一代號可以保留多個日期的價格，系統會自動使用最新日期。"
          >
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  代號
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({
                        ...current,
                        symbol: event.target.value,
                      }))
                    }
                    placeholder="例如 0050"
                    value={formValue.symbol}
                  />
                  {errors.symbol ? (
                    <span className="text-xs text-red-600">{errors.symbol}</span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  名稱
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="選填"
                    value={formValue.name ?? ""}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  價格
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setFormValue((current) => ({
                        ...current,
                        price: Number(event.target.value),
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={formValue.price || ""}
                  />
                  {errors.price ? (
                    <span className="text-xs text-red-600">{errors.price}</span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  日期
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    type="date"
                    value={formValue.date}
                  />
                  {errors.date ? (
                    <span className="text-xs text-red-600">{errors.date}</span>
                  ) : null}
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                來源
                <input
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setFormValue((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                  placeholder="例如 手動輸入、券商、公開資訊"
                  value={formValue.source ?? ""}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                備註
                <textarea
                  className="min-h-20 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setFormValue((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="選填"
                  value={formValue.note ?? ""}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  type="submit"
                >
                  {editingId ? "儲存修改" : "新增價格"}
                </button>
                {editingId ? (
                  <button
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                    onClick={handleCancelEdit}
                    type="button"
                  >
                    取消編輯
                  </button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="快速更新目前持股價格"
            description="列出交易紀錄推算後仍持有的標的。"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500">
                    <th className="pb-3 font-medium">代號</th>
                    <th className="pb-3 font-medium">名稱</th>
                    <th className="pb-3 text-right font-medium">股數</th>
                    <th className="pb-3 text-right font-medium">目前價格</th>
                    <th className="pb-3 font-medium">價格日期</th>
                    <th className="pb-3 font-medium">新價格</th>
                    <th className="pb-3 font-medium">新日期</th>
                    <th className="pb-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {positions
                    .filter((position) => position.shares > 0)
                    .map((position) => {
                      const latestPrice = latestPriceMap.get(
                        position.symbol.toUpperCase(),
                      );

                      return (
                        <tr
                          className="border-b border-stone-100 last:border-0"
                          key={position.symbol}
                        >
                          <td className="py-4 font-semibold text-slate-950">
                            {position.symbol}
                          </td>
                          <td className="py-4 text-slate-700">{position.name}</td>
                          <td className="py-4 text-right text-slate-600">
                            {formatShares(position.shares)}
                          </td>
                          <td className="py-4 text-right text-slate-600">
                            {latestPrice
                              ? formatCurrency(latestPrice.price)
                              : "缺少價格"}
                          </td>
                          <td className="py-4 text-slate-600">
                            {latestPrice?.date ?? "-"}
                          </td>
                          <td className="py-4">
                            <input
                              className="w-28 rounded-lg border border-stone-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              min="0"
                              onChange={(event) =>
                                setQuickPrices((current) => ({
                                  ...current,
                                  [position.symbol]: event.target.value,
                                }))
                              }
                              step="0.01"
                              type="number"
                              value={quickPrices[position.symbol] ?? ""}
                            />
                          </td>
                          <td className="py-4">
                            <input
                              className="w-36 rounded-lg border border-stone-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              onChange={(event) =>
                                setQuickDates((current) => ({
                                  ...current,
                                  [position.symbol]: event.target.value,
                                }))
                              }
                              type="date"
                              value={quickDates[position.symbol] ?? today}
                            />
                          </td>
                          <td className="py-4 text-right">
                            <button
                              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                              onClick={() => handleQuickUpdate(position)}
                              type="button"
                            >
                              更新價格
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="最新價格摘要">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">代號</th>
                  <th className="pb-3 font-medium">名稱</th>
                  <th className="pb-3 text-right font-medium">最新價格</th>
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">來源</th>
                </tr>
              </thead>
              <tbody>
                {latestPrices.map((record) => (
                  <tr
                    className="border-b border-stone-100 last:border-0"
                    key={record.symbol}
                  >
                    <td className="py-4 font-semibold text-slate-950">
                      {record.symbol}
                    </td>
                    <td className="py-4 text-slate-700">{record.name ?? "-"}</td>
                    <td className="py-4 text-right font-medium text-slate-950">
                      {formatCurrency(record.price)}
                    </td>
                    <td className="py-4 text-slate-600">{record.date}</td>
                    <td className="py-4 text-slate-600">
                      {record.source ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="價格紀錄" description="依日期由新到舊排序。">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">代號</th>
                  <th className="pb-3 font-medium">名稱</th>
                  <th className="pb-3 text-right font-medium">價格</th>
                  <th className="pb-3 font-medium">來源</th>
                  <th className="pb-3 font-medium">備註</th>
                  <th className="pb-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {priceRecords.map((record) => (
                  <tr
                    className="border-b border-stone-100 last:border-0"
                    key={record.id}
                  >
                    <td className="py-4 text-slate-600">{record.date}</td>
                    <td className="py-4 font-semibold text-slate-950">
                      {record.symbol}
                    </td>
                    <td className="py-4 text-slate-700">{record.name ?? "-"}</td>
                    <td className="py-4 text-right font-medium text-slate-950">
                      {formatCurrency(record.price)}
                    </td>
                    <td className="py-4 text-slate-600">{record.source ?? "-"}</td>
                    <td className="max-w-48 truncate py-4 text-slate-500">
                      {record.note ?? "-"}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                          onClick={() => handleEdit(record)}
                          type="button"
                        >
                          編輯
                        </button>
                        <button
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          onClick={() => handleDelete(record)}
                          type="button"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
