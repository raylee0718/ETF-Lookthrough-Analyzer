import { FormEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import type { TransactionInput } from "../hooks/useTransactions";
import {
  formatCurrency,
  formatPercent,
  formatShares,
} from "../lib/format";
import {
  parseTransactionsImportText,
  type TransactionImportRow,
} from "../lib/importTransactions";
import { calculatePositionsFromTransactions } from "../lib/positions";
import { calculatePositionsWithMarketValue } from "../lib/prices";
import type { PriceRecord } from "../types/prices";
import type { TransactionRecord } from "../types/transactions";

const categoryOptions = [
  "台股核心 ETF",
  "美股核心 ETF",
  "台股主動 ETF",
  "金融股",
  "防禦型股票",
  "個股",
  "其他",
];

const emptyForm: TransactionInput = {
  date: "",
  symbol: "",
  name: "",
  category: "",
  type: "buy",
  shares: 0,
  price: 0,
  fee: 0,
  tax: 0,
  note: "",
};

const transactionImportSample = [
  "日期,代號,名稱,類別,買賣,股數,成交價,手續費,交易稅,備註",
  "2026-05-20,0050,元大台灣50,台股核心 ETF,買進,10,190,1,0,範例",
].join("\n");

type TransactionsPageProps = {
  transactions: TransactionRecord[];
  priceRecords: PriceRecord[];
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  resetTransactions: () => void;
};

type FormErrors = Partial<Record<keyof TransactionInput, string>>;

const getTypeLabel = (type: TransactionRecord["type"]) =>
  type === "buy" ? "買進" : "賣出";

export default function TransactionsPage({
  transactions,
  priceRecords,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  resetTransactions,
}: TransactionsPageProps) {
  const [formValue, setFormValue] = useState<TransactionInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [importText, setImportText] = useState("");
  const [importRows, setImportRows] = useState<TransactionImportRow[]>([]);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const { positions, warnings } = useMemo(
    () => calculatePositionsFromTransactions(transactions),
    [transactions],
  );
  const pricedPositions = useMemo(
    () => calculatePositionsWithMarketValue(positions, priceRecords),
    [positions, priceRecords],
  );
  const totalMarketValue = useMemo(
    () => pricedPositions.reduce((sum, position) => sum + position.marketValue, 0),
    [pricedPositions],
  );

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formValue.date) nextErrors.date = "請選擇日期";
    if (!formValue.symbol.trim()) nextErrors.symbol = "請輸入代號";
    if (!formValue.name.trim()) nextErrors.name = "請輸入名稱";
    if (!formValue.category.trim()) nextErrors.category = "請選擇類別";
    if (!Number.isFinite(formValue.shares) || formValue.shares <= 0) {
      nextErrors.shares = "股數必須大於 0";
    }
    if (!Number.isFinite(formValue.price) || formValue.price <= 0) {
      nextErrors.price = "成交價必須大於 0";
    }
    if (formValue.fee !== undefined && formValue.fee < 0) {
      nextErrors.fee = "手續費不可小於 0";
    }
    if (formValue.tax !== undefined && formValue.tax < 0) {
      nextErrors.tax = "稅不可小於 0";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;

    if (editingId) {
      updateTransaction(editingId, formValue);
    } else {
      addTransaction(formValue);
    }

    setFormValue(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleEdit = (transaction: TransactionRecord) => {
    setEditingId(transaction.id);
    setFormValue({
      date: transaction.date,
      symbol: transaction.symbol,
      name: transaction.name,
      category: transaction.category,
      type: transaction.type,
      shares: transaction.shares,
      price: transaction.price,
      fee: transaction.fee ?? 0,
      tax: transaction.tax ?? 0,
      note: transaction.note ?? "",
    });
    setErrors({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormValue(emptyForm);
    setErrors({});
  };

  const handleDelete = (transaction: TransactionRecord) => {
    const confirmed = window.confirm(
      `確定要刪除 ${transaction.date} ${getTypeLabel(transaction.type)} ${transaction.symbol} 嗎？`,
    );

    if (confirmed) deleteTransaction(transaction.id);
  };

  const handleReset = () => {
    const confirmed = window.confirm("確定要清空所有交易紀錄嗎？");

    if (confirmed) {
      resetTransactions();
      handleCancelEdit();
    }
  };

  const handleParseImportText = (text = importText) => {
    const result = parseTransactionsImportText(text, transactions);

    setImportRows(result.rows);
    setImportError(result.error ?? "");
    setImportResult("");
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;

    const text = await file.text();
    setImportText(text);
    handleParseImportText(text);
  };

  const handleClearImportPreview = () => {
    setImportRows([]);
    setImportError("");
    setImportResult("");
  };

  const handleCopySample = async () => {
    await navigator.clipboard.writeText(transactionImportSample);
    setImportResult("已複製範例格式。");
  };

  const handleImportValidRows = () => {
    const validRows = importRows.filter((row) => row.isValid);
    const rowsToImport = validRows.filter(
      (row) => !skipDuplicates || !row.isDuplicate,
    );
    const skippedInvalidCount = importRows.filter((row) => !row.isValid).length;
    const skippedDuplicateCount = skipDuplicates
      ? validRows.filter((row) => row.isDuplicate).length
      : 0;

    if (rowsToImport.length === 0) {
      setImportResult("沒有可匯入的有效交易。");
      return;
    }

    const confirmed = window.confirm(
      `即將新增 ${rowsToImport.length} 筆交易紀錄，是否確認匯入？`,
    );

    if (!confirmed) return;

    rowsToImport.forEach((row) => addTransaction(row.input));
    setImportResult(
      `已匯入 ${rowsToImport.length} 筆；略過錯誤 ${skippedInvalidCount} 筆；略過疑似重複 ${skippedDuplicateCount} 筆。`,
    );
  };

  const importSummary = useMemo(
    () => ({
      validCount: importRows.filter((row) => row.isValid).length,
      invalidCount: importRows.filter((row) => !row.isValid).length,
      duplicateCount: importRows.filter((row) => row.isDuplicate).length,
    }),
    [importRows],
  );

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              交易紀錄
            </h1>
          </div>
          <button
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 sm:w-auto"
            onClick={handleReset}
            type="button"
          >
            清空交易紀錄
          </button>
        </header>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <h2 className="text-base font-semibold">交易整理</h2>
          <p className="mt-2 text-sm leading-6">
            記錄買進與賣出後，系統會整理目前股數、平均成本與損益。價格可在「我的持股」更新或手動輸入。
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="交易筆數"
            value={`${transactions.length} 筆`}
            helperText="已輸入交易"
          />
          <StatCard
            label="計算後持股"
            value={`${pricedPositions.filter((position) => position.shares > 0).length} 檔`}
            helperText="依交易紀錄計算"
          />
          <StatCard
            label="目前市值"
            value={
              pricedPositions.some(
                (position) =>
                  position.shares > 0 && position.priceStatus === "priced",
              )
                ? formatCurrency(totalMarketValue)
                : "待更新"
            }
            helperText="僅計入已有價格標的"
          />
        </section>

        {transactions.length === 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            尚未建立交易紀錄。你可以先新增一筆買進紀錄，例如 0050、00646 或個股。
          </section>
        ) : null}

        {warnings.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-base font-semibold">計算提醒</h2>
            <div className="mt-3 grid gap-2 text-sm leading-6">
              {warnings.map((warning, index) => (
                <p key={`${warning.symbol}-${index}`}>
                  {warning.symbol}: {warning.message}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6">
          <SectionCard
            title={editingId ? "編輯交易" : "新增交易"}
            description="新增買進或賣出後，系統會整理目前持股。"
          >
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  日期
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, date: event.target.value }))
                    }
                    type="date"
                    value={formValue.date}
                  />
                  {errors.date ? <span className="text-xs text-red-600">{errors.date}</span> : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  代號
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, symbol: event.target.value }))
                    }
                    placeholder="例如 0050"
                    value={formValue.symbol}
                  />
                  {errors.symbol ? <span className="text-xs text-red-600">{errors.symbol}</span> : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  名稱
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="例如 元大台灣50"
                    value={formValue.name}
                  />
                  {errors.name ? <span className="text-xs text-red-600">{errors.name}</span> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  類別
                  <select
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, category: event.target.value }))
                    }
                    value={formValue.category}
                  >
                    <option value="">請選擇類別</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {errors.category ? <span className="text-xs text-red-600">{errors.category}</span> : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  買賣
                  <select
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setFormValue((current) => ({
                        ...current,
                        type: event.target.value as TransactionRecord["type"],
                      }))
                    }
                    value={formValue.type}
                  >
                    <option value="buy">買進</option>
                    <option value="sell">賣出</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  股數
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, shares: Number(event.target.value) }))
                    }
                    step="0.001"
                    type="number"
                    value={formValue.shares || ""}
                  />
                  {errors.shares ? <span className="text-xs text-red-600">{errors.shares}</span> : null}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  成交價
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, price: Number(event.target.value) }))
                    }
                    step="0.01"
                    type="number"
                    value={formValue.price || ""}
                  />
                  {errors.price ? <span className="text-xs text-red-600">{errors.price}</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  手續費
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, fee: Number(event.target.value) }))
                    }
                    step="1"
                    type="number"
                    value={formValue.fee || ""}
                  />
                  {errors.fee ? <span className="text-xs text-red-600">{errors.fee}</span> : null}
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  稅
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setFormValue((current) => ({ ...current, tax: Number(event.target.value) }))
                    }
                    step="1"
                    type="number"
                    value={formValue.tax || ""}
                  />
                  {errors.tax ? <span className="text-xs text-red-600">{errors.tax}</span> : null}
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                備註
                <textarea
                  className="min-h-24 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setFormValue((current) => ({ ...current, note: event.target.value }))
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
                  {editingId ? "儲存修改" : "新增交易"}
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
            title="計算後持股"
            description="使用平均成本法整理部位；缺少價格時市值與未實現損益待更新。"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500">
                    <th className="pb-3 font-medium">代號</th>
                    <th className="pb-3 font-medium">名稱</th>
                    <th className="pb-3 font-medium">類別</th>
                    <th className="pb-3 text-right font-medium">目前股數</th>
                    <th className="pb-3 text-right font-medium">平均成本</th>
                    <th className="pb-3 text-right font-medium">投入成本</th>
                    <th className="pb-3 text-right font-medium">最新價格</th>
                    <th className="pb-3 text-right font-medium">目前市值</th>
                    <th className="pb-3 text-right font-medium">未實現損益</th>
                    <th className="pb-3 text-right font-medium">未實現報酬率</th>
                    <th className="pb-3 text-right font-medium">已實現損益</th>
                    <th className="pb-3 text-right font-medium">總損益</th>
                    <th className="pb-3 font-medium">價格狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {pricedPositions.map((position) => (
                    <tr
                      className="border-b border-stone-100 last:border-0"
                      key={position.symbol}
                    >
                      <td className="py-4 font-semibold text-slate-950">
                        {position.symbol}
                      </td>
                      <td className="py-4 text-slate-700">{position.name}</td>
                      <td className="py-4 text-slate-600">{position.category}</td>
                      <td className="py-4 text-right text-slate-600">
                        {formatShares(position.shares)}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {formatCurrency(position.averageCost)}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {formatCurrency(position.totalCost)}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {position.marketPrice
                          ? formatCurrency(position.marketPrice)
                          : "待更新"}
                      </td>
                      <td className="py-4 text-right font-medium text-slate-950">
                        {position.priceStatus === "priced"
                          ? formatCurrency(position.marketValue)
                          : "—"}
                      </td>
                      <td
                        className={`py-4 text-right font-medium ${
                          position.unrealizedPnL >= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {position.priceStatus === "priced"
                          ? formatCurrency(position.unrealizedPnL)
                          : "—"}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {position.priceStatus === "priced"
                          ? formatPercent(position.unrealizedReturnPercent)
                          : "—"}
                      </td>
                      <td
                        className={`py-4 text-right font-medium ${
                          position.realizedPnL >= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {formatCurrency(position.realizedPnL)}
                      </td>
                      <td
                        className={`py-4 text-right font-medium ${
                          position.totalPnL >= 0
                            ? "text-emerald-700"
                            : "text-red-700"
                        }`}
                      >
                        {position.priceStatus === "priced"
                          ? formatCurrency(position.totalPnL)
                          : "—"}
                      </td>
                      <td className="py-4 text-slate-600">
                        {position.priceStatus === "priced"
                          ? `已定價 ${position.lastPriceDate ?? ""}`
                          : "待更新"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="匯入交易紀錄"
          description="貼上 CSV 或從 Excel 複製的表格資料，先預覽與檢查後再追加到現有交易。"
        >
          <div className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                貼上 CSV / 表格資料
                <textarea
                  className="min-h-44 rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder={transactionImportSample}
                  value={importText}
                />
              </label>

              <div className="grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  上傳 .csv 檔案
                  <input
                    accept=".csv,text/csv"
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700"
                    onChange={(event) => void handleImportFile(event.target.files?.[0])}
                    type="file"
                  />
                </label>

                <div className="grid gap-2">
                  <p className="text-sm font-medium text-slate-700">範例格式</p>
                  <pre className="overflow-x-auto rounded-lg border border-stone-200 bg-white p-3 text-xs leading-5 text-slate-700">
                    {transactionImportSample}
                  </pre>
                  <button
                    className="w-fit rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                    onClick={() => void handleCopySample()}
                    type="button"
                  >
                    複製範例格式
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  onClick={() => handleParseImportText()}
                  type="button"
                >
                  解析資料
                </button>
                <button
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                  onClick={handleClearImportPreview}
                  type="button"
                >
                  清除預覽
                </button>
                <button
                  className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  disabled={importRows.length === 0}
                  onClick={handleImportValidRows}
                  type="button"
                >
                  匯入有效交易
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  checked={skipDuplicates}
                  className="h-4 w-4 rounded border-stone-300 text-blue-700 focus:ring-blue-500"
                  onChange={(event) => setSkipDuplicates(event.target.checked)}
                  type="checkbox"
                />
                略過疑似重複交易
              </label>
            </div>

            {importError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {importError}
              </div>
            ) : null}

            {importRows.length > 0 ? (
              <div className="grid gap-3">
                <div className="grid gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-3">
                  <p>有效：{importSummary.validCount} 筆</p>
                  <p>錯誤：{importSummary.invalidCount} 筆</p>
                  <p>疑似重複：{importSummary.duplicateCount} 筆</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-slate-500">
                        <th className="pb-3 font-medium">列號</th>
                        <th className="pb-3 font-medium">狀態</th>
                        <th className="pb-3 font-medium">日期</th>
                        <th className="pb-3 font-medium">買賣</th>
                        <th className="pb-3 font-medium">代號</th>
                        <th className="pb-3 font-medium">名稱</th>
                        <th className="pb-3 font-medium">類別</th>
                        <th className="pb-3 text-right font-medium">股數</th>
                        <th className="pb-3 text-right font-medium">成交價</th>
                        <th className="pb-3 text-right font-medium">手續費</th>
                        <th className="pb-3 text-right font-medium">交易稅</th>
                        <th className="pb-3 font-medium">備註</th>
                        <th className="pb-3 font-medium">錯誤訊息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row) => {
                        const statusLabel = !row.isValid
                          ? "錯誤"
                          : row.isDuplicate
                            ? "疑似重複"
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
                            </td>
                            <td className="py-4 text-slate-600">{row.input.date}</td>
                            <td className="py-4 text-slate-600">
                              {row.input.type === "buy" ? "買進" : "賣出"}
                            </td>
                            <td className="py-4 font-semibold text-slate-950">
                              {row.input.symbol}
                            </td>
                            <td className="py-4 text-slate-700">{row.input.name}</td>
                            <td className="py-4 text-slate-600">{row.input.category}</td>
                            <td className="py-4 text-right text-slate-600">
                              {row.input.shares || "-"}
                            </td>
                            <td className="py-4 text-right text-slate-600">
                              {row.input.price || "-"}
                            </td>
                            <td className="py-4 text-right text-slate-600">
                              {row.input.fee ?? 0}
                            </td>
                            <td className="py-4 text-right text-slate-600">
                              {row.input.tax ?? 0}
                            </td>
                            <td className="max-w-48 truncate py-4 text-slate-500">
                              {row.input.note ?? "-"}
                            </td>
                            <td className="max-w-72 py-4 text-red-700">
                              {row.errors.length > 0 ? row.errors.join("；") : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {importResult ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {importResult}
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="交易明細" description="依日期由新到舊排序。">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">買進/賣出</th>
                  <th className="pb-3 font-medium">代號</th>
                  <th className="pb-3 font-medium">名稱</th>
                  <th className="pb-3 text-right font-medium">股數</th>
                  <th className="pb-3 text-right font-medium">成交價</th>
                  <th className="pb-3 text-right font-medium">手續費</th>
                  <th className="pb-3 text-right font-medium">稅</th>
                  <th className="pb-3 font-medium">備註</th>
                  <th className="pb-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr
                    className="border-b border-stone-100 last:border-0"
                    key={transaction.id}
                  >
                    <td className="py-4 text-slate-600">{transaction.date}</td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          transaction.type === "buy"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-red-50 text-red-700 ring-1 ring-red-200"
                        }`}
                      >
                        {getTypeLabel(transaction.type)}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-slate-950">
                      {transaction.symbol}
                    </td>
                    <td className="py-4 text-slate-700">{transaction.name}</td>
                    <td className="py-4 text-right text-slate-600">
                      {formatShares(transaction.shares)}
                    </td>
                    <td className="py-4 text-right text-slate-600">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="py-4 text-right text-slate-600">
                      {formatCurrency(transaction.fee ?? 0)}
                    </td>
                    <td className="py-4 text-right text-slate-600">
                      {formatCurrency(transaction.tax ?? 0)}
                    </td>
                    <td className="max-w-48 truncate py-4 text-slate-500">
                      {transaction.note ?? "-"}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                          onClick={() => handleEdit(transaction)}
                          type="button"
                        >
                          編輯
                        </button>
                        <button
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          onClick={() => handleDelete(transaction)}
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
