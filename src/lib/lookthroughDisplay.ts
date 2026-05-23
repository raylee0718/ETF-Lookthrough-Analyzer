import type { LookthroughExposure, UnderlyingMarket } from "../types/portfolio";
import { getUnderlyingMarketLabel } from "./marketClassification";

export type LookthroughDisplayOptions = {
  minExposureValue: number;
  minPortfolioWeight: number;
  groupSmallExposures: boolean;
};

const marketOrder: UnderlyingMarket[] = ["TW", "US", "OTHER", "UNKNOWN"];

const groupedRowMeta: Record<
  UnderlyingMarket,
  { stockSymbol: string; stockName: string }
> = {
  TW: { stockSymbol: "__OTHER_TW__", stockName: "其他台股成分" },
  US: { stockSymbol: "__OTHER_US__", stockName: "其他美股成分" },
  OTHER: { stockSymbol: "__OTHER_OTHER__", stockName: "其他市場成分" },
  UNKNOWN: { stockSymbol: "__OTHER_UNKNOWN__", stockName: "其他未分類成分" },
};

const normalizeThreshold = (value: number) =>
  Number.isFinite(value) && value > 0 ? value : 0;

const getGroupedSourceName = (market: UnderlyingMarket, count: number) =>
  `已彙總 ${count} 檔低於門檻的${getUnderlyingMarketLabel(market)}`;

export const groupSmallLookthroughExposures = (
  exposures: LookthroughExposure[],
  options: LookthroughDisplayOptions,
): LookthroughExposure[] => {
  if (!options.groupSmallExposures) {
    return exposures;
  }

  const minExposureValue = normalizeThreshold(options.minExposureValue);
  const minPortfolioWeight = normalizeThreshold(options.minPortfolioWeight);
  const visibleExposures: LookthroughExposure[] = [];
  const groupedExposures = new Map<UnderlyingMarket, LookthroughExposure[]>();

  exposures.forEach((exposure) => {
    const meetsValueThreshold = exposure.exposureValue >= minExposureValue;
    const meetsWeightThreshold = exposure.portfolioWeight >= minPortfolioWeight;

    if (meetsValueThreshold && meetsWeightThreshold) {
      visibleExposures.push(exposure);
      return;
    }

    const market = exposure.underlyingMarket ?? "UNKNOWN";
    const currentGroup = groupedExposures.get(market) ?? [];
    currentGroup.push(exposure);
    groupedExposures.set(market, currentGroup);
  });

  const groupedRows = marketOrder.flatMap((market): LookthroughExposure[] => {
    const exposuresForMarket = groupedExposures.get(market) ?? [];

    if (exposuresForMarket.length === 0) {
      return [];
    }

    const exposureValue = exposuresForMarket.reduce(
      (sum, exposure) => sum + exposure.exposureValue,
      0,
    );
    const portfolioWeight = exposuresForMarket.reduce(
      (sum, exposure) => sum + exposure.portfolioWeight,
      0,
    );
    const meta = groupedRowMeta[market];

    return [
      {
        stockSymbol: meta.stockSymbol,
        stockName: meta.stockName,
        exposureValue,
        portfolioWeight,
        industry: "彙總",
        underlyingMarket: market,
        groupedCount: exposuresForMarket.length,
        isGroupedSmallExposure: true,
        sources: [
          {
            sourceSymbol: meta.stockSymbol,
            sourceName: getGroupedSourceName(market, exposuresForMarket.length),
            exposureValue,
          },
        ],
      },
    ];
  });

  return [...visibleExposures, ...groupedRows].sort(
    (first, second) => binnedSortValue(second) - binnedSortValue(first),
  );
};

const binnedSortValue = (exposure: LookthroughExposure) => exposure.exposureValue;

