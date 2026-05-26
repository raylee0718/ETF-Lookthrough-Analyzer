import { useMemo, useState } from "react";
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
import { groupSmallLookthroughExposures } from "../lib/lookthroughDisplay";
import {
  getUnderlyingMarketLabel,
  summarizeExposureByMarket,
} from "../lib/marketClassification";
import { getPortfolioHoldingsForAnalysis } from "../lib/portfolioSource";
import type { EtfConstituent, PortfolioHolding } from "../types/portfolio";
import type { PriceRecord } from "../types/prices";
import type { TransactionRecord } from "../types/transactions";

type LookthroughPageProps = {
  holdings: PortfolioHolding[];
  constituents: EtfConstituent[];
  transactions: TransactionRecord[];
  priceRecords: PriceRecord[];
};

export default function LookthroughPage({
  holdings,
  constituents,
  transactions,
  priceRecords,
}: LookthroughPageProps) {
  const [minDisplayExposureValue, setMinDisplayExposureValue] = useState("10");
  const [minDisplayPortfolioWeight, setMinDisplayPortfolioWeight] =
    useState("0.01");
  const [maxVisibleRows, setMaxVisibleRows] = useState("50");
  const [groupSmallExposures, setGroupSmallExposures] = useState(true);
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
  const marketExposures = useMemo(
    () => summarizeExposureByMarket(lookthroughExposures),
    [lookthroughExposures],
  );
  const displayThresholds = useMemo(
    () => ({
      minExposureValue: Number(minDisplayExposureValue),
      minPortfolioWeight: Number(minDisplayPortfolioWeight),
      maxVisibleRows: Number(maxVisibleRows),
      groupSmallExposures,
    }),
    [
      groupSmallExposures,
      maxVisibleRows,
      minDisplayExposureValue,
      minDisplayPortfolioWeight,
    ],
  );
  const displayLookthroughExposures = useMemo(
    () => groupSmallLookthroughExposures(lookthroughExposures, displayThresholds),
    [displayThresholds, lookthroughExposures],
  );
  const concentrationWarnings = useMemo(
    () => findConcentrationWarnings(lookthroughExposures),
    [lookthroughExposures],
  );
  const unmappedEtfHoldings = useMemo(
    () => calculateUnmappedEtfHoldings(holdingsForAnalysis, latestConstituents),
    [holdingsForAnalysis, latestConstituents],
  );

  const directStockHoldings = useMemo(
    () =>
      holdingsForAnalysis.filter(
        (holding) => !holding.category.toUpperCase().includes("ETF"),
      ),
    [holdingsForAnalysis],
  );
  const hasUnknownMarketExposure = lookthroughExposures.some(
    (exposure) => (exposure.underlyingMarket ?? "UNKNOWN") === "UNKNOWN",
  );
  const hasUnmapped00646 = unmappedEtfHoldings.some(
    (holding) => holding.symbol.toUpperCase() === "00646",
  );

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="py-3">
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            穿透分析
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            查看穿透後的台股 / 美股曝險與主要底層持股。
          </p>
        </header>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <h2 className="text-base font-semibold">{portfolioSource.modeLabel}</h2>
          <div className="mt-2 grid gap-2 text-sm leading-6">
            {portfolioSource.dataQualityNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
            <p>使用每檔 ETF 已儲存的最新成分股資料。</p>
            {portfolioSource.missingPriceSymbols.length > 0 ? (
              <p>缺少價格：{portfolioSource.missingPriceSymbols.join("、")}</p>
            ) : null}
          </div>
        </section>

        {holdingsForAnalysis.length === 0 &&
        settings.portfolioDataSourceMode === "manual" ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            尚未建立持股資料。請先到「我的持股」新增 ETF 或個股。
          </section>
        ) : null}

        {holdingsForAnalysis.length === 0 &&
        transactions.length > 0 &&
        portfolioSource.missingPriceSymbols.length === 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            目前沒有可分析的持股。
          </section>
        ) : null}

        {holdingsForAnalysis.length === 0 &&
        transactions.length > 0 &&
        portfolioSource.missingPriceSymbols.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            目前持股缺少目前價格，已暫不納入穿透分析。請先回到「我的持股」輸入價格。
          </section>
        ) : null}

        {unmappedEtfHoldings.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <div className="grid gap-2 text-sm leading-6">
              <p>
                部分 ETF 尚未匯入成分股，因此會暫時被視為單一持股。若要看到真正的底層股票曝險，請到「ETF 成分股」匯入資料。
              </p>
              {hasUnmapped00646 ? (
                <p>
                  00646 屬於海外成分股 ETF，目前尚未匯入美股成分股，會暫時以單一美股 ETF 曝險呈現。
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {hasUnknownMarketExposure ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            部分成分股市場無法判斷，請檢查股票代號或在成分股資料中加入市場欄位。
          </section>
        ) : null}

        {directStockHoldings.length > 0 ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
            個股會直接計入穿透曝險，不需要成分股資料。
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="底層股票數"
            value={`${lookthroughExposures.length} 檔`}
            helperText="穿透後已聚合同股票代號"
          />
          <StatCard
            label="產業數"
            value={`${industryExposures.length} 個`}
            helperText="未填產業會歸為未分類"
          />
          <StatCard
            label="分析用總市值"
            value={formatCurrency(portfolioSource.totalMarketValue)}
            helperText={portfolioSource.modeLabel}
          />
        </section>

        <SectionCard
          title="市場曝險分類"
          description="依底層成分市場彙總。"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {marketExposures.map((marketExposure) => (
              <StatCard
                helperText={formatPercent(marketExposure.portfolioWeight)}
                key={marketExposure.market}
                label={marketExposure.label}
                value={formatCurrency(marketExposure.exposureValue)}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="底層股票曝險"
          description="依投資組合佔比由高到低排列。來源欄會顯示直接持股或各 ETF 造成的曝險金額。"
        >
          <div className="mb-4 grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">顯示門檻</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                低於門檻的成分會彙總為其他，不影響總計。
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4 md:items-end">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                最小顯示金額
                <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <span className="px-3 text-slate-500">NT$</span>
                  <input
                    className="min-w-0 flex-1 rounded-r-lg px-3 py-2.5 text-slate-950 outline-none"
                    min="0"
                    onChange={(event) =>
                      setMinDisplayExposureValue(event.target.value)
                    }
                    step="1"
                    type="number"
                    value={minDisplayExposureValue}
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                最小投組佔比
                <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    className="min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-slate-950 outline-none"
                    min="0"
                    onChange={(event) =>
                      setMinDisplayPortfolioWeight(event.target.value)
                    }
                    step="0.01"
                    type="number"
                    value={minDisplayPortfolioWeight}
                  />
                  <span className="px-3 text-slate-500">%</span>
                </div>
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                最多顯示筆數
                <input
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  min="1"
                  onChange={(event) => setMaxVisibleRows(event.target.value)}
                  step="1"
                  type="number"
                  value={maxVisibleRows}
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700">
                <input
                  checked={groupSmallExposures}
                  className="h-4 w-4 rounded border-stone-300 text-blue-700"
                  onChange={(event) =>
                    setGroupSmallExposures(event.target.checked)
                  }
                  type="checkbox"
                />
                將低於門檻的成分彙總為其他
              </label>
            </div>
            {lookthroughExposures.some(
              (exposure) => (exposure.underlyingMarket ?? "UNKNOWN") === "US",
            ) ? (
              <p className="rounded-lg border border-stone-200 bg-white p-3 text-sm leading-6 text-slate-600">
                00646 / S&P 500 類 ETF 成分較多，建議使用顯示門檻與「其他美股成分」彙總查看。
              </p>
            ) : null}
          </div>

          {concentrationWarnings.length > 0 ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-semibold">集中度提醒</p>
              <div className="mt-2 grid gap-1">
                {concentrationWarnings.map((warning) => (
                  <p key={warning.stockSymbol}>
                    {warning.stockSymbol} {warning.stockName} 佔投組{" "}
                    {formatPercent(warning.portfolioWeight)}：
                    {warning.message}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {unmappedEtfHoldings.length > 0 ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              <p className="font-semibold">尚未對應 ETF 成分股</p>
              <p className="mt-2">
                下列 ETF 目前沒有成分股資料，會暫時被當成單一標的計入穿透分析：
              </p>
              <div className="mt-2 grid gap-1">
                {unmappedEtfHoldings.map((holding) => (
                  <p key={holding.id}>
                    {holding.symbol} {holding.name}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">股票代號</th>
                  <th className="pb-3 font-medium">股票名稱</th>
                  <th className="pb-3 text-right font-medium">穿透後金額</th>
                  <th className="pb-3 text-right font-medium">投資組合佔比</th>
                  <th className="pb-3 font-medium">成分市場</th>
                  <th className="pb-3 font-medium">產業</th>
                  <th className="pb-3 font-medium">來源</th>
                </tr>
              </thead>
              <tbody>
                {displayLookthroughExposures.map((exposure) => (
                  <tr
                    className="border-b border-stone-100 align-top last:border-0"
                    key={exposure.stockSymbol}
                  >
                    <td className="py-4 font-semibold text-slate-950">
                      {exposure.stockSymbol}
                    </td>
                    <td className="py-4 text-slate-700">
                      {exposure.stockName}
                      {exposure.isGroupedSmallExposure &&
                      exposure.groupedCount ? (
                        <p className="mt-1 text-xs text-slate-500">
                          已彙總 {exposure.groupedCount} 檔低於門檻的
                          {getUnderlyingMarketLabel(exposure.underlyingMarket)}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-4 text-right font-medium text-slate-950">
                      {formatCurrency(exposure.exposureValue)}
                    </td>
                    <td className="py-4 text-right text-slate-600">
                      {formatPercent(exposure.portfolioWeight)}
                    </td>
                    <td className="py-4 text-slate-600">
                      {getUnderlyingMarketLabel(exposure.underlyingMarket)}
                    </td>
                    <td className="py-4 text-slate-600">
                      {exposure.industry ?? "未分類"}
                    </td>
                    <td className="py-4">
                      <div className="grid gap-1 text-slate-600">
                        {exposure.sources.map((source) => (
                          <span key={source.sourceSymbol}>
                            {exposure.isGroupedSmallExposure
                              ? source.sourceName
                              : `${source.sourceSymbol} ${source.sourceName}`}
                            :{" "}
                            {formatCurrency(source.exposureValue)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="產業曝險表">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">產業</th>
                  <th className="pb-3 text-right font-medium">穿透後金額</th>
                  <th className="pb-3 text-right font-medium">投資組合佔比</th>
                </tr>
              </thead>
              <tbody>
                {industryExposures.map((industry) => (
                  <tr
                    className="border-b border-stone-100 last:border-0"
                    key={industry.industry}
                  >
                    <td className="py-4 font-medium text-slate-950">
                      {industry.industry}
                    </td>
                    <td className="py-4 text-right font-medium text-slate-950">
                      {formatCurrency(industry.exposureValue)}
                    </td>
                    <td className="py-4 text-right text-slate-600">
                      {formatPercent(industry.portfolioWeight)}
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
