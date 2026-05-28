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
  "2026-05-20,0050,元大台灣50,台股核心 ETF,買進,10,190,1,0,",
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
    const result = parseTransactionsImportText(text);

    setImportRows(result.rows);
    setImportError(result.error ?? "");
    setImportResult("");
  };

  const handleClearImportPreview = () => {
    setImportText("");
    setImportRows([]);
    setImportError("");
    setImportResult("");
  };

  const handleImportValidRows = () => {
    const validRows = importRows.filter((row) => row.isValid);
    const invalidRows = importRows.filter((row) => !row.isValid);

    if (validRows.length === 0) {
      setImportResult("沒有可匯入的有效交易。");
      return;
    }

    const confirmed = window.confirm(
      `即將新增 ${validRows.length} 筆交易紀錄，是否確認匯入？`,
    );

    if (!confirmed) return;

    validRows.forEach((row) => addTransaction(row.input));
    setImportRows(invalidRows);
    setImportResult(
      invalidRows.length > 0
        ? `已匯入 ${validRows.length} 筆，${invalidRows.length} 筆未匯入。`
        : `已匯入 ${validRows.length} 筆交易。`,
    );
  };

  const importSummary = useMemo(
    () => ({
      validCount: importRows.filter((row) => row.isValid).length,
      invalidCount: importRows.filter((row) => !row.isValid).length,
    }),
    [importRows],
  );
  const hasValidImportRows = importSummary.validCount > 0;

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-6">
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

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-950 sm:p-5">
          <h2 className="text-base font-semibold">交易整理</h2>
          <p className="mt-2 text-sm leading-6">
            記錄買進與賣出，系統會整理目前股數、平均成本與損益。
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
            description="輸入買進或賣出資料。"
          >
            <form className="grid gap-5" onSubmit={handleSubmit}>
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
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1120px] whitespace-nowrap text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="bg-white pb-3 pr-4 font-semibold text-slate-700 md:sticky md:left-0 md:z-[1]">代號</th>
                  <th className="pb-3 font-medium">名稱</th>
                  <th className="pb-3 font-medium">類別</th>
                  <th className="pb-3 text-right font-medium">目前股數</th>
                  <th className="pb-3 text-right font-medium">平均成本</th>
                  <th className="pb-3 text-right font-medium">投入成本</th>
                  <th className="pb-3 text-right font-medium">最新價格</th>
                  <th className="pb-3 text-right font-semibold text-slate-700">目前市值</th>
                  <th className="pb-3 text-right font-medium">未實現損益</th>
                  <th className="pb-3 text-right font-medium">未實現報酬率</th>
                  <th className="pb-3 text-right font-medium">已實現損益</th>
                  <th className="pb-3 text-right font-medium">總損益</th>
                  <th className="pb-3 font-medium">價格狀態</th>
                </tr>
              </thead>
              <tbody>
                {pricedPositions.map((position) => {
                  const hasCurrentPrice = position.priceStatus === "priced";
                  const isPnlPositive = position.unrealizedPnL > 0;
                  const isPnlNegative = position.unrealizedPnL < 0;
                  const pnlColorClass = isPnlPositive
                    ? "text-emerald-700 font-medium"
                    : isPnlNegative
                    ? "text-red-700 font-medium"
                    : "text-slate-600";

                  const isRealizedPositive = position.realizedPnL > 0;
                  const isRealizedNegative = position.realizedPnL < 0;
                  const realizedColorClass = isRealizedPositive
                    ? "text-emerald-700 font-medium"
                    : isRealizedNegative
                    ? "text-red-700 font-medium"
                    : "text-slate-600";

                  const isTotalPositive = position.totalPnL > 0;
                  const isTotalNegative = position.totalPnL < 0;
                  const totalColorClass = isTotalPositive
                    ? "text-emerald-700 font-medium"
                    : isTotalNegative
                    ? "text-red-700 font-medium"
                    : "text-slate-600";

                  return (
                    <tr
                      className="border-b border-stone-100 last:border-0"
                      key={position.symbol}
                    >
                      <td className="bg-white py-4 pr-4 font-semibold text-slate-950 md:sticky md:left-0 md:z-[1]">
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
                      <td className="py-4 text-right font-semibold text-slate-950">
                        {hasCurrentPrice
                          ? formatCurrency(position.marketValue)
                          : "—"}
                      </td>
                      <td className={`py-4 text-right ${pnlColorClass}`}>
                        {hasCurrentPrice
                          ? formatCurrency(position.unrealizedPnL)
                          : "—"}
                      </td>
                      <td className={`py-4 text-right ${pnlColorClass}`}>
                        {hasCurrentPrice
                          ? formatPercent(position.unrealizedReturnPercent)
                          : "—"}
                      </td>
                      <td className={`py-4 text-right ${realizedColorClass}`}>
                        {formatCurrency(position.realizedPnL)}
                      </td>
                      <td className={`py-4 text-right ${totalColorClass}`}>
                        {hasCurrentPrice
                          ? formatCurrency(position.totalPnL)
                          : "—"}
                      </td>
                      <td className="py-4 text-slate-600">
                        {hasCurrentPrice
                          ? `已定價 ${position.lastPriceDate ?? ""}`
                          : "待更新"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 行動裝置卡片清單 */}
          <div className="grid gap-4 md:hidden">
            {pricedPositions.map((position) => {
              const hasCurrentPrice = position.priceStatus === "priced";
              const isPnlPositive = position.unrealizedPnL > 0;
              const isPnlNegative = position.unrealizedPnL < 0;
              const pnlColorClass = isPnlPositive
                ? "text-emerald-700 font-semibold"
                : isPnlNegative
                ? "text-red-700 font-semibold"
                : "text-slate-600";

              const isRealizedPositive = position.realizedPnL > 0;
              const isRealizedNegative = position.realizedPnL < 0;
              const realizedPnLColorClass = isRealizedPositive
                ? "text-emerald-700 font-semibold"
                : isRealizedNegative
                ? "text-red-700 font-semibold"
                : "text-slate-600";

              const isTotalPositive = position.totalPnL > 0;
              const isTotalNegative = position.totalPnL < 0;
              const totalPnLColorClass = isTotalPositive
                ? "text-emerald-700 font-semibold"
                : isTotalNegative
                ? "text-red-700 font-semibold"
                : "text-slate-600";

              return (
                <div
                  key={position.symbol}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  {/* 卡片標頭：代號、名稱與類別 */}
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-lg font-bold text-slate-950">
                        {position.symbol}
                      </span>
                      <h3 className="text-sm text-slate-700 font-medium mt-0.5">
                        {position.name}
                      </h3>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 shrink-0">
                      {position.category}
                    </span>
                  </div>

                  {/* 內容：股數與成本市值網格 */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-3 text-xs border-b border-stone-100">
                    <div>
                      <p className="text-slate-400">目前股數</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">
                        {formatShares(position.shares)} 股
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">最新價格</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">
                        {position.marketPrice ? formatCurrency(position.marketPrice) : "待更新"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">投入成本</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">
                        {formatCurrency(position.totalCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">目前市值</p>
                      <p className="text-sm font-semibold text-slate-950 mt-0.5">
                        {hasCurrentPrice ? formatCurrency(position.marketValue) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">平均成本</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">
                        {formatCurrency(position.averageCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">價格狀態</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">
                        {hasCurrentPrice
                          ? `已定價 ${position.lastPriceDate ?? ""}`
                          : "待更新"}
                      </p>
                    </div>
                  </div>

                  {/* 損益網格 */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 text-xs">
                    <div>
                      <p className="text-slate-400">未實現損益 / 報酬</p>
                      <p className={`text-sm mt-0.5 ${pnlColorClass}`}>
                        {hasCurrentPrice
                          ? `${formatCurrency(position.unrealizedPnL)} (${formatPercent(position.unrealizedReturnPercent)})`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">已實現損益</p>
                      <p className={`text-sm mt-0.5 ${realizedPnLColorClass}`}>
                        {formatCurrency(position.realizedPnL)}
                      </p>
                    </div>
                    <div className="col-span-2 border-t border-stone-50 pt-2 mt-1">
                      <p className="text-slate-400">總損益</p>
                      <p className={`text-sm font-bold mt-0.5 ${totalPnLColorClass}`}>
                        {hasCurrentPrice ? formatCurrency(position.totalPnL) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </SectionCard>
        </div>

        <details className="rounded-lg border border-stone-200 bg-stone-50 p-4 shadow-sm sm:p-5">
          <summary className="cursor-pointer text-base font-semibold text-slate-950">
            批次匯入
          </summary>
          <div className="mt-5 grid gap-5">
            <SectionCard
              title="貼上交易紀錄"
              description="一次匯入多筆交易。預覽確認後才會新增資料。"
            >
              <div className="grid gap-5">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  貼上內容
                  <textarea
                    className="min-h-48 rounded-lg border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:min-h-40"
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder={transactionImportSample}
                    value={importText}
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                    onClick={() => handleParseImportText()}
                    type="button"
                  >
                    預覽匯入
                  </button>
                  <button
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                    onClick={handleClearImportPreview}
                    type="button"
                  >
                    清除
                  </button>
                  <button
                    className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                    disabled={!hasValidImportRows}
                    onClick={handleImportValidRows}
                    type="button"
                  >
                    確認匯入
                  </button>
                </div>
              </div>
            </SectionCard>

            {importError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {importError}
              </div>
            ) : null}

            {importRows.length > 0 ? (
              <div className="grid gap-3">
                <div className="grid gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 sm:grid-cols-2">
                  <p>有效：{importSummary.validCount} 筆</p>
                  <p>錯誤：{importSummary.invalidCount} 筆</p>
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
                        const statusLabel = row.isValid ? "有效" : "錯誤";
                        const statusClass = !row.isValid
                          ? "bg-red-50 text-red-700 ring-red-200"
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
        </details>

        <SectionCard title="交易明細" description="依日期由新到舊排序。">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px] whitespace-nowrap text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">買進/賣出</th>
                  <th className="bg-white pb-3 font-medium md:sticky md:left-0 md:z-[1]">代號</th>
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
                    <td className="bg-white py-4 font-semibold text-slate-950 md:sticky md:left-0 md:z-[1]">
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

          {/* 行動裝置卡片清單 */}
          <div className="grid gap-4 md:hidden">
            {transactions.length === 0 ? (
              <p className="py-6 text-center text-slate-500 bg-stone-50 rounded-lg">
                尚未建立交易紀錄。
              </p>
            ) : (
              transactions.map((transaction) => {
                const totalAmount = transaction.shares * transaction.price;

                return (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
                  >
                    {/* 卡片標頭：日期、買賣狀態、代號與名稱 */}
                    <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">
                            {transaction.date}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              transaction.type === "buy"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-red-50 text-red-700 ring-1 ring-red-200"
                            }`}
                          >
                            {getTypeLabel(transaction.type)}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-950 mt-1">
                          {transaction.symbol} <span className="font-medium text-slate-700 ml-1">{transaction.name}</span>
                        </h3>
                      </div>
                    </div>

                    {/* 卡片內容：股數、單價、總額、手續費、稅 */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-3 text-xs border-b border-stone-100">
                      <div>
                        <p className="text-slate-400">交易股數</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">
                          {formatShares(transaction.shares)} 股
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">成交單價</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">
                          {formatCurrency(transaction.price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">交易總金額</p>
                        <p className="text-sm font-semibold text-slate-950 mt-0.5">
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">手續費 / 交易稅</p>
                        <p className="text-sm font-medium text-slate-700 mt-0.5">
                          {formatCurrency(transaction.fee ?? 0)} / {formatCurrency(transaction.tax ?? 0)}
                        </p>
                      </div>
                      {transaction.note ? (
                        <div className="col-span-2">
                          <p className="text-slate-400">交易備註</p>
                          <p className="text-sm font-medium text-slate-600 mt-0.5 break-all">
                            {transaction.note}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {/* 卡片底部操作：按鈕組 */}
                    <div className="flex justify-end gap-3 pt-3">
                      <button
                        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-50 grow sm:grow-0 text-center"
                        onClick={() => handleEdit(transaction)}
                        type="button"
                      >
                        編輯
                      </button>
                      <button
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 grow sm:grow-0 text-center"
                        onClick={() => handleDelete(transaction)}
                        type="button"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
