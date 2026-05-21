import { useMemo, useState } from "react";
import ExposureBarChart from "../components/ExposureBarChart";
import PortfolioModeSwitch from "../components/PortfolioModeSwitch";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import { useAppSettings } from "../hooks/useAppSettings";
import { getLatestConstituentsByEtf } from "../lib/constituentVersions";
import { formatCurrency, formatPercent } from "../lib/format";
import {
  calculateIndustryExposure,
  calculateLookthroughExposure,
  calculateUnmappedEtfHoldings,
  findConcentrationWarnings,
} from "../lib/lookthrough";
import {
  calculateAllEtfOverlapPairs,
  getEtfSymbolsFromConstituents,
  getOverlapLevel,
} from "../lib/overlap";
import { calculatePositionsFromTransactions } from "../lib/positions";
import {
  getPriceCoverageSummary,
  getLatestPriceMap,
} from "../lib/prices";
import {
  refreshAvailableClosingPrices,
  type PriceRefreshSummary,
} from "../lib/priceRefresh";
import { getPortfolioHoldingsForAnalysis } from "../lib/portfolioSource";
import type {
  PriceRecordInput,
  UpsertManyPriceRecordsResult,
} from "../hooks/usePriceRecords";
import type { EtfConstituent, PortfolioHolding } from "../types/portfolio";
import type { PriceRecord } from "../types/prices";
import type { TransactionRecord } from "../types/transactions";

type DashboardProps = {
  holdings: PortfolioHolding[];
  constituents: EtfConstituent[];
  transactions: TransactionRecord[];
  priceRecords: PriceRecord[];
  upsertManyPriceRecords: (
    records: PriceRecordInput[],
    options: { replaceSameDateSymbol: boolean },
  ) => UpsertManyPriceRecordsResult;
  onNavigateToPrices?: () => void;
};

const LAST_PRICE_REFRESH_STORAGE_KEY = "etf-lookthrough-last-price-refresh";

const formatRefreshTime = (value: string) => {
  if (!value) {
    return "尚未更新";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const formatMarkets = (markets: PriceRefreshSummary["marketsUpdated"]) => {
  if (markets.length === 0) {
    return "無";
  }

  return markets
    .map((market) => (market === "twse" ? "上市" : "上櫃"))
    .join("、");
};

export default function Dashboard({
  holdings,
  constituents,
  transactions,
  priceRecords,
  upsertManyPriceRecords,
  onNavigateToPrices,
}: DashboardProps) {
  const { settings } = useAppSettings();
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [refreshSummary, setRefreshSummary] =
    useState<PriceRefreshSummary | null>(null);
  const [refreshErrorMessage, setRefreshErrorMessage] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState(() =>
    window.localStorage.getItem(LAST_PRICE_REFRESH_STORAGE_KEY) ?? "",
  );
  const portfolioSource = useMemo(
    () =>
      getPortfolioHoldingsForAnalysis({
        mode: settings.portfolioDataSourceMode,
        manualHoldings: holdings,
        transactions,
        priceRecords,
      }),
    [settings.portfolioDataSourceMode, holdings, transactions, priceRecords],
  );
  const holdingsForAnalysis = portfolioSource.holdingsForAnalysis;
  const latestConstituents = useMemo(
    () => getLatestConstituentsByEtf(constituents),
    [constituents],
  );
  const lookthroughExposures = useMemo(
    () => calculateLookthroughExposure(holdingsForAnalysis, latestConstituents),
    [holdingsForAnalysis, latestConstituents],
  );
  const industryExposures = useMemo(
    () => calculateIndustryExposure(lookthroughExposures),
    [lookthroughExposures],
  );
  const concentrationWarnings = useMemo(
    () => findConcentrationWarnings(lookthroughExposures),
    [lookthroughExposures],
  );
  const unmappedEtfHoldings = useMemo(
    () => calculateUnmappedEtfHoldings(holdingsForAnalysis, latestConstituents),
    [holdingsForAnalysis, latestConstituents],
  );
  const etfSymbolsWithConstituents = useMemo(
    () => getEtfSymbolsFromConstituents(latestConstituents),
    [latestConstituents],
  );
  const topOverlapPairs = useMemo(
    () => calculateAllEtfOverlapPairs(latestConstituents).slice(0, 3),
    [latestConstituents],
  );
  const transactionPositions = useMemo(
    () => calculatePositionsFromTransactions(transactions).positions,
    [transactions],
  );
  const latestPriceMap = useMemo(
    () => getLatestPriceMap(priceRecords),
    [priceRecords],
  );
  const priceCoverageSummary = useMemo(
    () => getPriceCoverageSummary(transactionPositions, priceRecords),
    [transactionPositions, priceRecords],
  );
  const isTransactionMode = settings.portfolioDataSourceMode === "transactions";

  const handleRefreshPrices = async () => {
    setIsRefreshingPrices(true);
    setRefreshErrorMessage("");

    try {
      const result = await refreshAvailableClosingPrices({
        priceRecords,
        upsertManyPriceRecords,
      });

      setRefreshSummary(result);
      setLastRefreshAt(result.fetchedAt);
      window.localStorage.setItem(
        LAST_PRICE_REFRESH_STORAGE_KEY,
        result.fetchedAt,
      );
    } catch {
      setRefreshErrorMessage(
        "更新失敗，請稍後再試，或改用每日價格 CSV 匯入。",
      );
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="py-3">
          <p className="text-sm font-medium text-blue-700">Step 8 資料來源切換</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            ETF Lookthrough 投資組合分析
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            你可以選擇用手動持股，或用交易紀錄搭配價格表估算市值，作為儀表板與穿透分析的資料來源。
          </p>
        </header>

        <PortfolioModeSwitch />

        <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-normal text-emerald-700">
                Price refresh
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                每日更新與重新分析
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                按下更新後，系統會嘗試抓取可用的收盤價資料，寫入價格表，並用最新價格重新計算交易紀錄模式下的市值與穿透曝險。
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">
                上次更新：{formatRefreshTime(lastRefreshAt)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {isTransactionMode
                  ? "目前為交易紀錄模式，儀表板已使用最新價格重新估算市值。"
                  : "目前為手動持股模式，價格更新主要影響交易紀錄模式。若要用最新價格估算市值，請切換到交易紀錄模式。"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isRefreshingPrices}
                onClick={handleRefreshPrices}
                type="button"
              >
                {isRefreshingPrices ? "更新中..." : "更新價格並重新分析"}
              </button>
              {onNavigateToPrices ? (
                <button
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
                  onClick={onNavigateToPrices}
                  type="button"
                >
                  前往價格表
                </button>
              ) : null}
            </div>
          </div>

          {refreshSummary ? (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <p>更新時間：{formatRefreshTime(refreshSummary.fetchedAt)}</p>
                <p>
                  匯入 / 更新價格筆數：
                  {refreshSummary.importedCount + refreshSummary.replacedCount}
                </p>
                <p>抓取價格筆數：{refreshSummary.fetchedCount}</p>
                <p>涵蓋市場：{formatMarkets(refreshSummary.marketsUpdated)}</p>
              </div>
              {refreshSummary.skippedCount > 0 ? (
                <p className="mt-2">略過：{refreshSummary.skippedCount} 筆</p>
              ) : null}
              {refreshSummary.warnings.length > 0 ? (
                <div className="mt-3">
                  <p className="font-semibold">提醒</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {refreshSummary.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {refreshSummary.errors.length > 0 ? (
                <div className="mt-3 text-red-700">
                  <p className="font-semibold">錯誤</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {refreshSummary.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {isTransactionMode ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-slate-950">價格覆蓋率</p>
              {priceCoverageSummary.totalPositionCount === 0 ? (
                <p className="mt-2">
                  目前沒有交易紀錄部位，因此價格覆蓋率無法計算。
                </p>
              ) : (
                <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <p>交易部位數：{priceCoverageSummary.totalPositionCount} 檔</p>
                    <p>已有價格數：{priceCoverageSummary.pricedPositionCount} 檔</p>
                    <p>缺少價格數：{priceCoverageSummary.missingPriceCount} 檔</p>
                    <p>
                      覆蓋率：
                      {formatPercent(priceCoverageSummary.coveragePercent)}
                    </p>
                  </div>
                  {priceCoverageSummary.missingPriceCount > 0 ? (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-950">
                      <p>
                        部分標的仍缺少價格，可能是上櫃、海外 ETF、資料來源尚未支援，或代號格式不一致。
                      </p>
                      <p className="mt-1">
                        缺少價格代號：
                        {priceCoverageSummary.missingSymbols.join("、")}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {refreshErrorMessage ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {refreshErrorMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <h2 className="text-base font-semibold">{portfolioSource.modeLabel}</h2>
          <div className="mt-2 grid gap-2 text-sm leading-6">
            {portfolioSource.dataQualityNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
            <p>穿透分析目前使用每檔 ETF 最新日期的成分股資料。</p>
            {settings.portfolioDataSourceMode === "transactions" &&
            transactions.length === 0 ? (
              <p>
                目前選擇交易紀錄模式，但尚未建立交易紀錄。請先到「交易紀錄」新增買進或賣出資料，或切回手動持股模式。
              </p>
            ) : null}
            {portfolioSource.missingPriceSymbols.length > 0 ? (
              <p>
                缺少價格：
                {portfolioSource.missingPriceSymbols.join("、")}
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="分析用總市值"
            value={formatCurrency(portfolioSource.totalMarketValue)}
            helperText={portfolioSource.modeLabel}
          />
          <StatCard
            label="分析用持股數"
            value={`${holdingsForAnalysis.length} 筆`}
            helperText="目前模式的持股資料"
          />
          <StatCard
            label="穿透後股票數"
            value={`${lookthroughExposures.length} 檔`}
            helperText="ETF 成分股與直接持股合併"
          />
          <StatCard
            label="ETF 成分股資料"
            value={`${constituents.length} 筆`}
            helperText="已儲存在本機"
          />
        </section>

        <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 text-sky-950">
          <h2 className="text-base font-semibold">交易與價格摘要</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="交易推算持股"
              value={`${transactionPositions.filter((position) => position.shares > 0).length} 檔`}
              helperText="交易紀錄模式可使用"
            />
            <StatCard
              label="已有最新價格"
              value={`${latestPriceMap.size} 檔`}
              helperText="每個代號取最新日期"
            />
            <StatCard
              label="缺少價格"
              value={`${portfolioSource.missingPriceSymbols.length} 檔`}
              helperText="交易紀錄模式影響市值精準度"
            />
          </div>
          {settings.portfolioDataSourceMode === "transactions" ? (
            <div className="mt-4 rounded-lg border border-sky-200 bg-white/70 p-4 text-sm leading-6 text-sky-950">
              <p>
                價格資料覆蓋率：{formatPercent(priceCoverageSummary.coveragePercent)}
                （已有 {priceCoverageSummary.pricedPositionCount} /{" "}
                {priceCoverageSummary.totalPositionCount} 檔）
              </p>
              {priceCoverageSummary.missingPriceCount > 0 ? (
                <p className="mt-2">
                  部分標的缺少價格，目前暫以投入成本估算市值。缺少價格：{" "}
                  {priceCoverageSummary.missingSymbols.join("、")}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        {unmappedEtfHoldings.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-base font-semibold">尚未匯入成分股的 ETF</h2>
            <p className="mt-2 text-sm leading-6">
              以下 ETF 尚未匯入成分股，因此暫時會被視為單一持股，穿透分析可能低估實際重疊。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {unmappedEtfHoldings.map((holding) => (
                <span
                  className="rounded-full bg-white px-3 py-1 text-sm font-medium ring-1 ring-amber-200"
                  key={holding.id}
                >
                  {holding.symbol} {holding.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Top 10 穿透後個股曝險"
            description="依目前選擇的資料來源計算。"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500">
                    <th className="pb-3 font-medium">股票</th>
                    <th className="pb-3 font-medium">產業</th>
                    <th className="pb-3 text-right font-medium">穿透後金額</th>
                    <th className="pb-3 text-right font-medium">投組占比</th>
                  </tr>
                </thead>
                <tbody>
                  {lookthroughExposures.slice(0, 10).map((exposure) => (
                    <tr
                      className="border-b border-stone-100 last:border-0"
                      key={exposure.stockSymbol}
                    >
                      <td className="py-4">
                        <div className="font-medium text-slate-950">
                          {exposure.stockSymbol}
                        </div>
                        <div className="mt-1 text-slate-500">{exposure.stockName}</div>
                      </td>
                      <td className="py-4 text-slate-600">
                        {exposure.industry ?? "未分類"}
                      </td>
                      <td className="py-4 text-right font-medium text-slate-950">
                        {formatCurrency(exposure.exposureValue)}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {formatPercent(exposure.portfolioWeight)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="產業曝險" description="依穿透後個股曝險彙總。">
            {industryExposures.length > 0 ? (
              <ExposureBarChart data={industryExposures} />
            ) : (
              <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-slate-500">
                尚無可計算的曝險資料。
              </p>
            )}
          </SectionCard>
        </div>

        <SectionCard title="ETF 重疊預覽" description="顯示加權重疊率最高的前三組 ETF。">
          {etfSymbolsWithConstituents.length < 2 ? (
            <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-slate-500">
              需要至少兩檔 ETF 的成分股資料，才能預覽 ETF 重疊程度。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500">
                    <th className="pb-3 font-medium">ETF A</th>
                    <th className="pb-3 font-medium">ETF B</th>
                    <th className="pb-3 text-right font-medium">共同持股數</th>
                    <th className="pb-3 text-right font-medium">加權重疊率</th>
                    <th className="pb-3 font-medium">重疊程度</th>
                  </tr>
                </thead>
                <tbody>
                  {topOverlapPairs.map((pair) => (
                    <tr
                      className="border-b border-stone-100 last:border-0"
                      key={`${pair.etfA}-${pair.etfB}`}
                    >
                      <td className="py-4 font-medium text-slate-950">{pair.etfA}</td>
                      <td className="py-4 font-medium text-slate-950">{pair.etfB}</td>
                      <td className="py-4 text-right text-slate-600">
                        {pair.sharedStockCount} 檔
                      </td>
                      <td className="py-4 text-right font-medium text-slate-950">
                        {formatPercent(pair.weightedOverlap)}
                      </td>
                      <td className="py-4 text-slate-600">
                        {getOverlapLevel(pair.weightedOverlap)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="集中度提醒">
          {concentrationWarnings.length > 0 ? (
            <div className="grid gap-3">
              {concentrationWarnings.map((warning) => (
                <div
                  className={`rounded-lg border p-4 ${
                    warning.level === "high"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  }`}
                  key={warning.stockSymbol}
                >
                  <p className="font-semibold">
                    {warning.message}: {warning.stockSymbol} {warning.stockName}
                  </p>
                  <p className="mt-1 text-sm">
                    投資組合佔比 {formatPercent(warning.portfolioWeight)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              目前沒有單一個股超過 10%，集中度相對分散。
            </p>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
