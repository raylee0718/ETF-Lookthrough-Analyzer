import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import type { HoldingInput } from "../hooks/usePortfolioHoldings";
import type { PriceRecordInput } from "../hooks/usePriceRecords";
import type { TransactionInput } from "../hooks/useTransactions";
import { formatCurrency, formatPercent, formatShares } from "../lib/format";
import { calculatePositionsFromTransactions } from "../lib/positions";
import {
  calculatePositionsWithMarketValue,
  getLatestPriceMap,
} from "../lib/prices";
import type { PortfolioHolding } from "../types/portfolio";
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

const emptyTransactionForm: TransactionInput = {
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

const emptyManualForm: HoldingInput = {
  symbol: "",
  name: "",
  category: "",
  marketValue: 0,
  note: "",
};

type HoldingsPageProps = {
  holdings: PortfolioHolding[];
  addHolding: (input: HoldingInput) => void;
  updateHolding: (id: string, input: HoldingInput) => void;
  deleteHolding: (id: string) => void;
  resetHoldings: () => void;
  transactions: TransactionRecord[];
  addTransaction: (input: TransactionInput) => void;
  updateTransaction: (id: string, input: TransactionInput) => void;
  deleteTransaction: (id: string) => void;
  resetTransactions: () => void;
  priceRecords: PriceRecord[];
  upsertLatestPrice: (input: PriceRecordInput) => void;
};

type TransactionFormErrors = Partial<Record<keyof TransactionInput, string>>;
type ManualFormErrors = Partial<Record<keyof HoldingInput, string>>;

const getToday = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const getTransactionTypeLabel = (type: TransactionRecord["type"]) =>
  type === "buy" ? "買進" : "賣出";

export default function HoldingsPage({
  holdings,
  addHolding,
  updateHolding,
  deleteHolding,
  resetHoldings,
  transactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  resetTransactions,
  priceRecords,
  upsertLatestPrice,
}: HoldingsPageProps) {
  const [transactionForm, setTransactionForm] =
    useState<TransactionInput>(emptyTransactionForm);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(
    null,
  );
  const [transactionErrors, setTransactionErrors] =
    useState<TransactionFormErrors>({});
  const [manualForm, setManualForm] = useState<HoldingInput>(emptyManualForm);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualErrors, setManualErrors] = useState<ManualFormErrors>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const { positions, warnings } = useMemo(
    () => calculatePositionsFromTransactions(transactions),
    [transactions],
  );
  const pricedPositions = useMemo(
    () => calculatePositionsWithMarketValue(positions, priceRecords),
    [positions, priceRecords],
  );
  const latestPriceMap = useMemo(
    () => getLatestPriceMap(priceRecords),
    [priceRecords],
  );
  const totalMarketValue = useMemo(
    () => pricedPositions.reduce((sum, position) => sum + position.marketValue, 0),
    [pricedPositions],
  );
  const totalCostBasis = useMemo(
    () => pricedPositions.reduce((sum, position) => sum + position.totalCost, 0),
    [pricedPositions],
  );
  const manualTotalMarketValue = useMemo(
    () => holdings.reduce((sum, holding) => sum + holding.marketValue, 0),
    [holdings],
  );

  const activePositions = pricedPositions.filter((position) => position.shares > 0);

  const validateTransactionForm = () => {
    const nextErrors: TransactionFormErrors = {};

    if (!transactionForm.date) nextErrors.date = "請選擇日期";
    if (!transactionForm.symbol.trim()) nextErrors.symbol = "請輸入代號";
    if (!transactionForm.name.trim()) nextErrors.name = "請輸入名稱";
    if (!transactionForm.category.trim()) nextErrors.category = "請選擇分類";
    if (!Number.isFinite(transactionForm.shares) || transactionForm.shares <= 0) {
      nextErrors.shares = "股數必須大於 0";
    }
    if (!Number.isFinite(transactionForm.price) || transactionForm.price <= 0) {
      nextErrors.price = "成交價必須大於 0";
    }
    if (transactionForm.fee !== undefined && transactionForm.fee < 0) {
      nextErrors.fee = "手續費不可小於 0";
    }
    if (transactionForm.tax !== undefined && transactionForm.tax < 0) {
      nextErrors.tax = "稅不可小於 0";
    }

    setTransactionErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateManualForm = () => {
    const nextErrors: ManualFormErrors = {};

    if (!manualForm.symbol.trim()) nextErrors.symbol = "請輸入代號";
    if (!manualForm.name.trim()) nextErrors.name = "請輸入名稱";
    if (!manualForm.category.trim()) nextErrors.category = "請選擇分類";
    if (!Number.isFinite(manualForm.marketValue) || manualForm.marketValue <= 0) {
      nextErrors.marketValue = "市值必須大於 0";
    }

    setManualErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetTransactionForm = () => {
    setTransactionForm(emptyTransactionForm);
    setEditingTransactionId(null);
    setTransactionErrors({});
  };

  const resetManualForm = () => {
    setManualForm(emptyManualForm);
    setEditingManualId(null);
    setManualErrors({});
  };

  const handleTransactionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateTransactionForm()) return;

    if (editingTransactionId) {
      updateTransaction(editingTransactionId, transactionForm);
    } else {
      addTransaction(transactionForm);
    }

    resetTransactionForm();
  };

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateManualForm()) return;

    if (editingManualId) {
      updateHolding(editingManualId, manualForm);
    } else {
      addHolding(manualForm);
    }

    resetManualForm();
  };

  const handleEditTransaction = (transaction: TransactionRecord) => {
    setEditingTransactionId(transaction.id);
    setTransactionForm({
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
    setTransactionErrors({});
  };

  const handleDeleteTransaction = (transaction: TransactionRecord) => {
    const confirmed = window.confirm(
      `確定要刪除 ${transaction.date} ${getTransactionTypeLabel(
        transaction.type,
      )} ${transaction.symbol} 嗎？`,
    );

    if (confirmed) {
      deleteTransaction(transaction.id);
    }
  };

  const handleEditManualHolding = (holding: PortfolioHolding) => {
    setEditingManualId(holding.id);
    setManualForm({
      symbol: holding.symbol,
      name: holding.name,
      category: holding.category,
      marketValue: holding.marketValue,
      note: holding.note ?? "",
    });
    setManualErrors({});
  };

  const handleDeleteManualHolding = (holding: PortfolioHolding) => {
    const confirmed = window.confirm(`確定要刪除 ${holding.symbol} ${holding.name} 嗎？`);

    if (confirmed) {
      deleteHolding(holding.id);
    }
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      "確定要清空所有交易與手動持股嗎？此操作會刪除目前輸入的持股資料。",
    );

    if (confirmed) {
      resetTransactions();
      resetHoldings();
      resetTransactionForm();
      resetManualForm();
    }
  };

  const saveCurrentPrice = (symbol: string, name: string) => {
    const draftValue = priceDrafts[symbol];
    const price = Number(draftValue);

    if (!Number.isFinite(price) || price <= 0) {
      return;
    }

    upsertLatestPrice({
      symbol,
      name,
      price,
      date: getToday(),
      sourceType: "manual",
      source: "我的持股",
    });
  };

  const handlePriceKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    symbol: string,
    name: string,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveCurrentPrice(symbol, name);
      event.currentTarget.blur();
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              我的持股
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              記錄買賣交易，系統會自動整理目前持股。
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              目前價格可先手動更新，之後可接入收盤價。
            </p>
          </div>
          <button
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 sm:w-auto"
            onClick={handleClearAll}
            type="button"
          >
            清空全部持股
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            helperText="依交易紀錄整理"
            label="目前持股"
            value={`${activePositions.length} 檔`}
          />
          <StatCard
            helperText="剩餘部位成本"
            label="投入成本"
            value={formatCurrency(totalCostBasis)}
          />
          <StatCard
            helperText="股數 × 目前價格"
            label="目前市值"
            value={formatCurrency(totalMarketValue)}
          />
        </section>

        {warnings.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            {warnings.map((warning, index) => (
              <p key={`${warning.symbol}-${index}`}>
                {warning.symbol}: {warning.message}
              </p>
            ))}
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionCard
            description="買進或賣出後新增一筆即可。"
            title={editingTransactionId ? "編輯交易" : "新增交易"}
          >
            <form className="grid gap-4" onSubmit={handleTransactionSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                日期
                <input
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  type="date"
                  value={transactionForm.date}
                />
                {transactionErrors.date ? (
                  <span className="text-xs text-red-600">
                    {transactionErrors.date}
                  </span>
                ) : null}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  代號
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        symbol: event.target.value,
                      }))
                    }
                    placeholder="例如 0050"
                    value={transactionForm.symbol}
                  />
                  {transactionErrors.symbol ? (
                    <span className="text-xs text-red-600">
                      {transactionErrors.symbol}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  名稱
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="例如 元大台灣50"
                    value={transactionForm.name}
                  />
                  {transactionErrors.name ? (
                    <span className="text-xs text-red-600">
                      {transactionErrors.name}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                分類
                <select
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  value={transactionForm.category}
                >
                  <option value="">請選擇分類</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {transactionErrors.category ? (
                  <span className="text-xs text-red-600">
                    {transactionErrors.category}
                  </span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                買賣
                <select
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      type: event.target.value as TransactionRecord["type"],
                    }))
                  }
                  value={transactionForm.type}
                >
                  <option value="buy">買進</option>
                  <option value="sell">賣出</option>
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  股數
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        shares: Number(event.target.value),
                      }))
                    }
                    step="0.001"
                    type="number"
                    value={transactionForm.shares || ""}
                  />
                  {transactionErrors.shares ? (
                    <span className="text-xs text-red-600">
                      {transactionErrors.shares}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  成交價
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        price: Number(event.target.value),
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={transactionForm.price || ""}
                  />
                  {transactionErrors.price ? (
                    <span className="text-xs text-red-600">
                      {transactionErrors.price}
                    </span>
                  ) : null}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  手續費
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        fee: Number(event.target.value),
                      }))
                    }
                    step="1"
                    type="number"
                    value={transactionForm.fee || ""}
                  />
                  {transactionErrors.fee ? (
                    <span className="text-xs text-red-600">
                      {transactionErrors.fee}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  稅
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        tax: Number(event.target.value),
                      }))
                    }
                    step="1"
                    type="number"
                    value={transactionForm.tax || ""}
                  />
                  {transactionErrors.tax ? (
                    <span className="text-xs text-red-600">
                      {transactionErrors.tax}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                備註
                <textarea
                  className="min-h-20 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="選填"
                  value={transactionForm.note ?? ""}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  type="submit"
                >
                  {editingTransactionId ? "儲存修改" : "新增交易"}
                </button>
                {editingTransactionId ? (
                  <button
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                    onClick={resetTransactionForm}
                    type="button"
                  >
                    取消編輯
                  </button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard
            description="目前價格可直接輸入，按 Enter 或離開欄位後儲存。"
            title="目前持股"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500">
                    <th className="pb-3 font-medium">代號</th>
                    <th className="pb-3 font-medium">名稱</th>
                    <th className="pb-3 text-right font-medium">剩餘股數</th>
                    <th className="pb-3 text-right font-medium">平均成本</th>
                    <th className="pb-3 text-right font-medium">投入成本</th>
                    <th className="pb-3 text-right font-medium">目前價格</th>
                    <th className="pb-3 text-right font-medium">目前市值</th>
                    <th className="pb-3 text-right font-medium">投組佔比</th>
                  </tr>
                </thead>
                <tbody>
                  {activePositions.length === 0 ? (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan={8}>
                        尚未有目前持股。新增買進交易後會出現在這裡。
                      </td>
                    </tr>
                  ) : (
                    activePositions.map((position) => {
                      const latestPrice = latestPriceMap.get(
                        position.symbol.toUpperCase(),
                      );
                      const priceValue =
                        priceDrafts[position.symbol] ??
                        String(position.marketPrice ?? position.averageCost ?? "");
                      const portfolioWeight =
                        totalMarketValue > 0
                          ? (position.marketValue / totalMarketValue) * 100
                          : 0;

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
                            {formatCurrency(position.averageCost)}
                          </td>
                          <td className="py-4 text-right text-slate-600">
                            {formatCurrency(position.totalCost)}
                          </td>
                          <td className="py-3 text-right">
                            <input
                              aria-label={`${position.symbol} 目前價格`}
                              className="w-28 rounded-lg border border-stone-300 bg-white px-2 py-2 text-right text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              min="0"
                              onBlur={() =>
                                saveCurrentPrice(position.symbol, position.name)
                              }
                              onChange={(event) =>
                                setPriceDrafts((current) => ({
                                  ...current,
                                  [position.symbol]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) =>
                                handlePriceKeyDown(
                                  event,
                                  position.symbol,
                                  position.name,
                                )
                              }
                              step="0.01"
                              type="number"
                              value={priceValue}
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              {latestPrice?.date ?? "未儲存價格"}
                            </p>
                          </td>
                          <td className="py-4 text-right font-medium text-slate-950">
                            {formatCurrency(position.marketValue)}
                          </td>
                          <td className="py-4 text-right text-slate-600">
                            {formatPercent(portfolioWeight)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          description="最近的交易排在最上方。"
          title="交易紀錄"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">代號</th>
                  <th className="pb-3 font-medium">買賣</th>
                  <th className="pb-3 text-right font-medium">股數</th>
                  <th className="pb-3 text-right font-medium">成交價</th>
                  <th className="pb-3 text-right font-medium">費稅</th>
                  <th className="pb-3 font-medium">備註</th>
                  <th className="pb-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={8}>
                      尚未建立交易紀錄。
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr
                      className="border-b border-stone-100 last:border-0"
                      key={transaction.id}
                    >
                      <td className="py-4 text-slate-600">{transaction.date}</td>
                      <td className="py-4">
                        <p className="font-semibold text-slate-950">
                          {transaction.symbol}
                        </p>
                        <p className="text-xs text-slate-500">
                          {transaction.name}
                        </p>
                      </td>
                      <td className="py-4 text-slate-700">
                        {getTransactionTypeLabel(transaction.type)}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {formatShares(transaction.shares)}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {formatCurrency(transaction.price)}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {formatCurrency(
                          (transaction.fee ?? 0) + (transaction.tax ?? 0),
                        )}
                      </td>
                      <td className="max-w-48 truncate py-4 text-slate-500">
                        {transaction.note ?? "-"}
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                            onClick={() => handleEditTransaction(transaction)}
                            type="button"
                          >
                            編輯
                          </button>
                          <button
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                            onClick={() => handleDeleteTransaction(transaction)}
                            type="button"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <details className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <summary className="cursor-pointer text-base font-semibold text-slate-950">
            手動持股調整
          </summary>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            只有在沒有交易紀錄時，穿透分析才會使用這裡的手動持股。
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionCard
              description="需要臨時調整時可使用。"
              title={editingManualId ? "編輯手動持股" : "新增手動持股"}
            >
              <form className="grid gap-4" onSubmit={handleManualSubmit}>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  代號
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        symbol: event.target.value,
                      }))
                    }
                    placeholder="例如 0050"
                    value={manualForm.symbol}
                  />
                  {manualErrors.symbol ? (
                    <span className="text-xs text-red-600">
                      {manualErrors.symbol}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  名稱
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="例如 元大台灣50"
                    value={manualForm.name}
                  />
                  {manualErrors.name ? (
                    <span className="text-xs text-red-600">
                      {manualErrors.name}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  分類
                  <select
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    value={manualForm.category}
                  >
                    <option value="">請選擇分類</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  {manualErrors.category ? (
                    <span className="text-xs text-red-600">
                      {manualErrors.category}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  市值
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    min="0"
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        marketValue: Number(event.target.value),
                      }))
                    }
                    placeholder="例如 100000"
                    type="number"
                    value={manualForm.marketValue || ""}
                  />
                  {manualErrors.marketValue ? (
                    <span className="text-xs text-red-600">
                      {manualErrors.marketValue}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  備註
                  <textarea
                    className="min-h-20 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setManualForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="選填"
                    value={manualForm.note ?? ""}
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                    type="submit"
                  >
                    {editingManualId ? "儲存修改" : "新增手動持股"}
                  </button>
                  {editingManualId ? (
                    <button
                      className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                      onClick={resetManualForm}
                      type="button"
                    >
                      取消編輯
                    </button>
                  ) : null}
                </div>
              </form>
            </SectionCard>

            <SectionCard
              description="沒有交易紀錄時才會用於穿透分析。"
              title="手動持股"
            >
              <div className="mb-3 text-sm text-slate-600">
                合計：{formatCurrency(manualTotalMarketValue)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-slate-500">
                      <th className="pb-3 font-medium">代號</th>
                      <th className="pb-3 font-medium">名稱</th>
                      <th className="pb-3 font-medium">分類</th>
                      <th className="pb-3 text-right font-medium">市值</th>
                      <th className="pb-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.length === 0 ? (
                      <tr>
                        <td className="py-6 text-slate-500" colSpan={5}>
                          尚未建立手動持股。
                        </td>
                      </tr>
                    ) : (
                      holdings.map((holding) => (
                        <tr
                          className="border-b border-stone-100 last:border-0"
                          key={holding.id}
                        >
                          <td className="py-4 font-semibold text-slate-950">
                            {holding.symbol}
                          </td>
                          <td className="py-4 text-slate-700">{holding.name}</td>
                          <td className="py-4 text-slate-600">
                            {holding.category}
                          </td>
                          <td className="py-4 text-right font-medium text-slate-950">
                            {formatCurrency(holding.marketValue)}
                          </td>
                          <td className="py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                                onClick={() => handleEditManualHolding(holding)}
                                type="button"
                              >
                                編輯
                              </button>
                              <button
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                                onClick={() => handleDeleteManualHolding(holding)}
                                type="button"
                              >
                                刪除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </details>
      </div>
    </main>
  );
}
