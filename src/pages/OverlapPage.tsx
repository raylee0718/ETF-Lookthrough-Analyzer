import { useEffect, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import { getLatestConstituentsByEtf } from "../lib/constituentVersions";
import { formatNumber, formatPercent } from "../lib/format";
import {
  calculateAllEtfOverlapPairs,
  calculatePairwiseEtfOverlap,
  getEtfSymbolsFromConstituents,
  getOverlapLevel,
} from "../lib/overlap";
import type { EtfConstituent } from "../types/portfolio";

type OverlapPageProps = {
  constituents: EtfConstituent[];
};

export default function OverlapPage({ constituents }: OverlapPageProps) {
  const latestConstituents = useMemo(
    () => getLatestConstituentsByEtf(constituents),
    [constituents],
  );
  const etfSymbols = useMemo(
    () => getEtfSymbolsFromConstituents(latestConstituents),
    [latestConstituents],
  );
  const [selectedEtfA, setSelectedEtfA] = useState("");
  const [selectedEtfB, setSelectedEtfB] = useState("");

  useEffect(() => {
    if (!selectedEtfA && etfSymbols[0]) {
      setSelectedEtfA(etfSymbols[0]);
    }

    if (!selectedEtfB && etfSymbols[1]) {
      setSelectedEtfB(etfSymbols[1]);
    }
  }, [etfSymbols, selectedEtfA, selectedEtfB]);

  const selectedPairOverlap = useMemo(
    () =>
      selectedEtfA && selectedEtfB
        ? calculatePairwiseEtfOverlap(
            selectedEtfA,
            selectedEtfB,
            latestConstituents,
          )
        : null,
    [latestConstituents, selectedEtfA, selectedEtfB],
  );
  const allOverlapPairs = useMemo(
    () => calculateAllEtfOverlapPairs(latestConstituents),
    [latestConstituents],
  );

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="py-3">
          <p className="text-sm font-medium text-blue-700">Step 5 ETF 重疊分析</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
            ETF 重疊
          </h1>
        </header>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <h2 className="text-base font-semibold">重疊分析說明</h2>
          <p className="mt-2 text-sm leading-6">
            這裡會比較不同 ETF
            的成分股重疊程度，幫助你判斷表面分散的 ETF
            是否實際上持有相同股票。
          </p>
          <p className="mt-2 text-sm leading-6">
            加權重疊率以共同持股的較小權重加總計算。例如 A ETF 持有台積電
            50%，B ETF 持有台積電 20%，則台積電對加權重疊率貢獻 20%。
          </p>
        </section>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
          ETF 重疊分析目前使用每檔 ETF 最新日期的成分股資料。
        </section>

        {etfSymbols.length < 2 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            至少需要兩檔 ETF 的成分股資料，才能進行重疊分析。
          </section>
        ) : (
          <>
            <SectionCard title="ETF 配對選擇">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  ETF A
                  <select
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) => setSelectedEtfA(event.target.value)}
                    value={selectedEtfA}
                  >
                    {etfSymbols.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  ETF B
                  <select
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) => setSelectedEtfB(event.target.value)}
                    value={selectedEtfB}
                  >
                    {etfSymbols.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </SectionCard>

            {selectedPairOverlap ? (
              <>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <StatCard
                    label="共同持股數"
                    value={`${selectedPairOverlap.sharedStockCount} 檔`}
                    helperText="兩檔 ETF 都持有"
                  />
                  <StatCard
                    label={`${selectedPairOverlap.etfA} 成分股數`}
                    value={`${selectedPairOverlap.etfAStockCount} 檔`}
                    helperText={`${formatPercent(selectedPairOverlap.overlapByCountA)} 重複`}
                  />
                  <StatCard
                    label={`${selectedPairOverlap.etfB} 成分股數`}
                    value={`${selectedPairOverlap.etfBStockCount} 檔`}
                    helperText={`${formatPercent(selectedPairOverlap.overlapByCountB)} 重複`}
                  />
                  <StatCard
                    label="加權重疊率"
                    value={formatPercent(selectedPairOverlap.weightedOverlap)}
                    helperText="共同持股較小權重加總"
                  />
                  <StatCard
                    label="重疊程度"
                    value={getOverlapLevel(selectedPairOverlap.weightedOverlap)}
                    helperText="簡易判斷規則"
                  />
                </section>

                <SectionCard
                  title="共同成分股"
                  description="依兩檔 ETF 的合計權重由高到低排序。"
                >
                  {selectedPairOverlap.sharedStocks.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-slate-500">
                      這兩檔 ETF
                      目前沒有共同成分股，或資料尚未完整匯入。
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-stone-200 text-slate-500">
                            <th className="pb-3 font-medium">股票代號</th>
                            <th className="pb-3 font-medium">股票名稱</th>
                            <th className="pb-3 font-medium">產業</th>
                            <th className="pb-3 text-right font-medium">
                              ETF A 權重
                            </th>
                            <th className="pb-3 text-right font-medium">
                              ETF B 權重
                            </th>
                            <th className="pb-3 text-right font-medium">
                              合計權重
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPairOverlap.sharedStocks.map((stock) => (
                            <tr
                              className="border-b border-stone-100 last:border-0"
                              key={stock.stockSymbol}
                            >
                              <td className="py-4 font-semibold text-slate-950">
                                {stock.stockSymbol}
                              </td>
                              <td className="py-4 text-slate-700">
                                {stock.stockName}
                              </td>
                              <td className="py-4 text-slate-600">
                                {stock.industry ?? "未分類"}
                              </td>
                              <td className="py-4 text-right text-slate-600">
                                {formatPercent(stock.weightA)}
                              </td>
                              <td className="py-4 text-right text-slate-600">
                                {formatPercent(stock.weightB)}
                              </td>
                              <td className="py-4 text-right font-medium text-slate-950">
                                {formatPercent(stock.combinedWeight)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              </>
            ) : null}

            <SectionCard
              title="所有 ETF 配對"
              description="依加權重疊率由高到低排序。"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
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
                    {allOverlapPairs.map((pair) => (
                      <tr
                        className="border-b border-stone-100 last:border-0"
                        key={`${pair.etfA}-${pair.etfB}`}
                      >
                        <td className="py-4 font-medium text-slate-950">
                          {pair.etfA}
                        </td>
                        <td className="py-4 font-medium text-slate-950">
                          {pair.etfB}
                        </td>
                        <td className="py-4 text-right text-slate-600">
                          {formatNumber(pair.sharedStockCount)}
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
            </SectionCard>
          </>
        )}
      </div>
    </main>
  );
}
