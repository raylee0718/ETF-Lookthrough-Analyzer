import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import type { HoldingInput } from "../hooks/usePortfolioHoldings";
import type { PriceRecordInput } from "../hooks/usePriceRecords";
import { formatCurrency, formatPercent, formatShares } from "../lib/format";
import { fetchMarketPricesForSymbols } from "../lib/marketPriceClient";
import { calculatePositionsFromTransactions } from "../lib/positions";
import {
  calculatePositionsWithMarketValue,
  getLatestPriceMap,
  normalizePriceLookupSymbol,
} from "../lib/prices";
import type { MarketPricesResponse } from "../types/marketPrices";
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
  resetTransactions: () => void;
  priceRecords: PriceRecord[];
  upsertLatestPrice: (input: PriceRecordInput) => void;
  onNavigateToTransactions: () => void;
};

type ManualFormErrors = Partial<Record<keyof HoldingInput, string>>;

const getToday = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

export default function HoldingsPage({
  holdings,
  addHolding,
  updateHolding,
  deleteHolding,
  resetHoldings,
  transactions,
  resetTransactions,
  priceRecords,
  upsertLatestPrice,
  onNavigateToTransactions,
}: HoldingsPageProps) {
  const [manualForm, setManualForm] = useState<HoldingInput>(emptyManualForm);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualErrors, setManualErrors] = useState<ManualFormErrors>({});
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [priceUpdateLoading, setPriceUpdateLoading] = useState(false);
  const [priceUpdateResult, setPriceUpdateResult] =
    useState<MarketPricesResponse | null>(null);
  const [priceUpdateMessage, setPriceUpdateMessage] = useState("");

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
  const activePositions = pricedPositions.filter((position) => position.shares > 0);
  const missingPriceCount = activePositions.filter(
    (position) => position.priceStatus === "missing",
  ).length;
  const totalMarketValue = useMemo(
    () =>
      pricedPositions
        .filter(
          (position) =>
            position.shares > 0 && position.priceStatus === "priced",
        )
        .reduce((sum, position) => sum + position.marketValue, 0),
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

  const resetManualForm = () => {
    setManualForm(emptyManualForm);
    setEditingManualId(null);
    setManualErrors({});
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

  const handleUpdateCurrentPrices = async () => {
    const symbols = activePositions.map((position) => position.symbol);

    if (symbols.length === 0) {
      setPriceUpdateMessage("目前沒有可更新價格的持股。");
      setPriceUpdateResult(null);
      return;
    }

    setPriceUpdateLoading(true);
    setPriceUpdateMessage("");
    setPriceUpdateResult(null);

    try {
      const result = await fetchMarketPricesForSymbols({ symbols });
      const positionNameMap = new Map(
        activePositions.map((position) => [
          normalizePriceLookupSymbol(position.symbol),
          position.name,
        ]),
      );
      const validPrices = result.prices.filter(
        (price) =>
          price.status === "ok" &&
          Number.isFinite(price.price) &&
          (price.price ?? 0) > 0 &&
          Boolean(price.priceDate),
      );

      validPrices.forEach((price) => {
        upsertLatestPrice({
          symbol: price.symbol,
          name: price.name ?? positionNameMap.get(price.symbol) ?? price.symbol,
          price: price.price ?? 0,
          date: price.priceDate ?? getToday(),
          sourceType: "provider",
          source: price.source ?? "官方收盤價",
          fetchedAt: result.fetchedAt,
          note: "最近可用收盤價，非即時報價",
        });
      });

      if (validPrices.length > 0) {
        setPriceDrafts((current) => {
          const nextDrafts = { ...current };
          validPrices.forEach((price) => {
            delete nextDrafts[price.symbol];
            activePositions
              .filter(
                (position) =>
                  normalizePriceLookupSymbol(position.symbol) === price.symbol,
              )
              .forEach((position) => {
                delete nextDrafts[position.symbol];
              });
          });
          return nextDrafts;
        });
      }

      const failedCount = result.prices.length - validPrices.length;
      const failedSymbols = result.prices
        .filter((price) => price.status !== "ok")
        .map((price) => price.symbol);
      setPriceUpdateResult(result);
      setPriceUpdateMessage(
        failedCount > 0
          ? `已更新 ${validPrices.length} 檔，待更新：${failedSymbols.join("、")}。`
          : `已更新 ${validPrices.length} 檔目前價格。`,
      );
    } catch (error) {
      setPriceUpdateMessage(
        error instanceof Error ? error.message : "價格更新失敗，請稍後再試。",
      );
    } finally {
      setPriceUpdateLoading(false);
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
              目前價格可手動更新，也可抓最近收盤價。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
              onClick={onNavigateToTransactions}
              type="button"
            >
              新增交易
            </button>
            <button
              className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
              disabled={priceUpdateLoading || activePositions.length === 0}
              onClick={() => void handleUpdateCurrentPrices()}
              type="button"
            >
              {priceUpdateLoading ? "更新中..." : "更新目前價格"}
            </button>
            <button
              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 sm:w-auto"
              onClick={handleClearAll}
              type="button"
            >
              清空全部持股
            </button>
          </div>
        </header>

        <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-slate-950">價格為最近可用收盤價，非即時報價。</p>
              <p className="mt-1 text-slate-500">
                只會更新目前持有標的的價格；手動輸入仍可覆蓋或補充。
              </p>
            </div>
            {priceUpdateMessage ? (
              <p className="rounded-lg bg-stone-100 px-3 py-2 text-slate-700">
                {priceUpdateMessage}
              </p>
            ) : null}
          </div>
          {priceUpdateResult ? (
            <div className="mt-4 grid gap-2">
              <p className="text-slate-500">
                抓取時間：{new Date(priceUpdateResult.fetchedAt).toLocaleString("zh-TW")}
              </p>
              {priceUpdateResult.prices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {priceUpdateResult.prices.map((price) => (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        price.status === "ok"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                      key={price.symbol}
                    >
                      {price.symbol}：
                      {price.status === "ok" && price.price
                        ? `${price.price}（${price.priceDate}）`
                        : "待更新"}
                    </span>
                  ))}
                </div>
              ) : null}
              {priceUpdateResult.warnings.length > 0 ? (
                <p className="text-amber-700">
                  {priceUpdateResult.warnings.join(" ")}
                </p>
              ) : null}
              {priceUpdateResult.errors.length > 0 ? (
                <p className="text-red-700">
                  {priceUpdateResult.errors.join(" ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

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
            value={
              activePositions.length > 0 && totalMarketValue === 0
                ? "待更新"
                : formatCurrency(totalMarketValue)
            }
          />
        </section>

        {missingPriceCount > 0 ? (
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            {missingPriceCount === activePositions.length ? (
              <p>目前持股尚未輸入價格，市值、損益與比例待更新。</p>
            ) : (
              <p>部分標的缺少價格，比例僅依已更新價格的標的計算。</p>
            )}
          </section>
        ) : null}

        {warnings.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            {warnings.map((warning, index) => (
              <p key={`${warning.symbol}-${index}`}>
                {warning.symbol}: {warning.message}
              </p>
            ))}
          </section>
        ) : null}

        <SectionCard
          description="目前價格可直接輸入，按 Enter 或離開欄位後儲存。"
          title="目前持股"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] whitespace-nowrap text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                    <th className="sticky left-0 z-[1] bg-white pb-3 pr-4 font-semibold text-slate-700">代號</th>
                  <th className="pb-3 font-medium">名稱</th>
                  <th className="pb-3 text-right font-medium">目前股數</th>
                  <th className="pb-3 text-right font-medium">平均成本</th>
                  <th className="pb-3 text-right font-medium">投入成本</th>
                  <th className="pb-3 text-right font-medium">目前價格</th>
                  <th className="pb-3 text-right font-semibold text-slate-700">目前市值</th>
                  <th className="pb-3 text-right font-medium">未實現損益</th>
                  <th className="pb-3 text-right font-medium">未實現報酬率</th>
                  <th className="pb-3 text-right font-medium">總損益</th>
                  <th className="pb-3 text-right font-semibold text-slate-700">投組佔比</th>
                </tr>
              </thead>
              <tbody>
                {activePositions.length === 0 ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={11}>
                      尚未有目前持股。請到「交易紀錄」新增買進資料。
                    </td>
                  </tr>
                ) : (
                  activePositions.map((position) => {
                    const latestPrice = latestPriceMap.get(
                      position.symbol.toUpperCase(),
                    );
                    const hasCurrentPrice = position.priceStatus === "priced";
                    const priceValue =
                      priceDrafts[position.symbol] ??
                      String(position.marketPrice ?? "");
                    const portfolioWeight =
                      hasCurrentPrice && totalMarketValue > 0
                        ? (position.marketValue / totalMarketValue) * 100
                        : null;

                    return (
                      <tr
                        className="border-b border-stone-100 last:border-0"
                        key={position.symbol}
                      >
                    <td className="sticky left-0 z-[1] bg-white py-4 pr-4 font-semibold text-slate-950">
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
                            {latestPrice?.date ?? "待更新"}
                          </p>
                        </td>
                    <td className="py-4 text-right font-semibold text-slate-950">
                      {hasCurrentPrice ? formatCurrency(position.marketValue) : "—"}
                    </td>
                        <td className="py-4 text-right text-slate-600">
                          {hasCurrentPrice
                            ? formatCurrency(position.unrealizedPnL)
                            : "—"}
                        </td>
                        <td className="py-4 text-right text-slate-600">
                          {hasCurrentPrice
                            ? formatPercent(position.unrealizedReturnPercent)
                            : "—"}
                        </td>
                        <td className="py-4 text-right text-slate-600">
                          {hasCurrentPrice ? formatCurrency(position.totalPnL) : "—"}
                        </td>
                    <td className="py-4 text-right font-semibold text-slate-950">
                      {portfolioWeight === null
                        ? "—"
                        : formatPercent(portfolioWeight)}
                        </td>
                      </tr>
                    );
                  })
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
          <div className="mt-4 grid gap-6">
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
