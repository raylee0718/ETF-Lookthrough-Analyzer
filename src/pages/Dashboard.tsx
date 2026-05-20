import { useMemo } from "react";
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
  getLatestPriceMap,
} from "../lib/prices";
import { getPortfolioHoldingsForAnalysis } from "../lib/portfolioSource";
import type { EtfConstituent, PortfolioHolding } from "../types/portfolio";
import type { PriceRecord } from "../types/prices";
import type { TransactionRecord } from "../types/transactions";

type DashboardProps = {
  holdings: PortfolioHolding[];
  constituents: EtfConstituent[];
  transactions: TransactionRecord[];
  priceRecords: PriceRecord[];
};

export default function Dashboard({
  holdings,
  constituents,
  transactions,
  priceRecords,
}: DashboardProps) {
  const { settings } = useAppSettings();
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
