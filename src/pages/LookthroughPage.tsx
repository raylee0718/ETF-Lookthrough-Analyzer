import { useMemo } from "react";
import PortfolioModeSwitch from "../components/PortfolioModeSwitch";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import { useAppSettings } from "../hooks/useAppSettings";
import { getLatestConstituentsByEtf } from "../lib/constituentVersions";
import { formatCurrency, formatPercent } from "../lib/format";
import {
  calculateIndustryExposure,
  calculateLookthroughExposure,
} from "../lib/lookthrough";
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

  const hasConstituents = latestConstituents.length > 0;

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="py-3">
          <p className="text-sm font-medium text-blue-700">Step 8 模式化穿透分析</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            穿透分析
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            查看目前資料來源下的穿透後股票曝險、來源拆解，以及產業彙總。
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
            {portfolioSource.missingPriceSymbols.length > 0 ? (
              <p>缺少價格：{portfolioSource.missingPriceSymbols.join("、")}</p>
            ) : null}
          </div>
        </section>

        {holdingsForAnalysis.length === 0 &&
        settings.portfolioDataSourceMode === "manual" ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            尚未建立手動持股資料，請先到「我的持股」新增持股。
          </section>
        ) : null}

        {holdingsForAnalysis.length === 0 &&
        settings.portfolioDataSourceMode === "transactions" ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            尚未建立交易紀錄，請先到「交易紀錄」新增買進或賣出資料。
          </section>
        ) : null}

        {holdingsForAnalysis.length > 0 && !hasConstituents ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            目前尚未匯入 ETF 成分股資料，ETF 會暫時被視為單一持股。
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="穿透後股票"
            value={`${lookthroughExposures.length} 檔`}
            helperText="已聚合同股票代號"
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
          title="完整穿透曝險表"
          description="來源欄會顯示直接持股或各 ETF 造成的曝險金額。"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">股票代號</th>
                  <th className="pb-3 font-medium">股票名稱</th>
                  <th className="pb-3 text-right font-medium">穿透後金額</th>
                  <th className="pb-3 text-right font-medium">投資組合佔比</th>
                  <th className="pb-3 font-medium">產業</th>
                  <th className="pb-3 font-medium">來源</th>
                </tr>
              </thead>
              <tbody>
                {lookthroughExposures.map((exposure) => (
                  <tr
                    className="border-b border-stone-100 align-top last:border-0"
                    key={exposure.stockSymbol}
                  >
                    <td className="py-4 font-semibold text-slate-950">
                      {exposure.stockSymbol}
                    </td>
                    <td className="py-4 text-slate-700">{exposure.stockName}</td>
                    <td className="py-4 text-right font-medium text-slate-950">
                      {formatCurrency(exposure.exposureValue)}
                    </td>
                    <td className="py-4 text-right text-slate-600">
                      {formatPercent(exposure.portfolioWeight)}
                    </td>
                    <td className="py-4 text-slate-600">
                      {exposure.industry ?? "未分類"}
                    </td>
                    <td className="py-4">
                      <div className="grid gap-1 text-slate-600">
                        {exposure.sources.map((source) => (
                          <span key={source.sourceSymbol}>
                            {source.sourceSymbol} {source.sourceName}:{" "}
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
