import type {
  EtfConstituent,
  LookthroughExposure,
  PortfolioHolding,
  UnderlyingMarket,
} from "../types/portfolio";

export type MarketExposureSummary = {
  market: UnderlyingMarket;
  label: string;
  exposureValue: number;
  portfolioWeight: number;
};

const marketLabels: Record<UnderlyingMarket, string> = {
  TW: "台股成分",
  US: "美股成分",
  OTHER: "其他市場",
  UNKNOWN: "未分類",
};

export const getUnderlyingMarketLabel = (market?: UnderlyingMarket) =>
  marketLabels[market ?? "UNKNOWN"];

export const normalizeUnderlyingMarketValue = (
  value?: string,
): UnderlyingMarket | undefined => {
  const normalizedValue = value?.trim().toUpperCase();

  if (!normalizedValue) {
    return undefined;
  }

  if (
    ["TW", "TAIWAN", "台股", "台灣", "臺股", "臺灣"].includes(
      normalizedValue,
    )
  ) {
    return "TW";
  }

  if (
    ["US", "USA", "UNITED STATES", "美股", "美國"].includes(normalizedValue)
  ) {
    return "US";
  }

  if (["OTHER", "其他", "其他市場"].includes(normalizedValue)) {
    return "OTHER";
  }

  if (["UNKNOWN", "未分類", "未知"].includes(normalizedValue)) {
    return "UNKNOWN";
  }

  return undefined;
};

const isTaiwanNumericSymbol = (symbol: string) => /^\d{4}$/.test(symbol);
const isTaiwanSuffixedSymbol = (symbol: string) => /\.(TW|TWO)$/.test(symbol);
const isUsTickerSymbol = (symbol: string) =>
  /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/.test(symbol);

export const inferUnderlyingMarketFromSymbol = (
  symbol: string,
  context?: { explicitMarket?: UnderlyingMarket; etfSymbol?: string },
): UnderlyingMarket => {
  if (context?.explicitMarket) {
    return context.explicitMarket;
  }

  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedEtfSymbol = context?.etfSymbol?.trim().toUpperCase();

  if (!normalizedSymbol) {
    return "UNKNOWN";
  }

  if (isTaiwanSuffixedSymbol(normalizedSymbol)) {
    return "TW";
  }

  if (isTaiwanNumericSymbol(normalizedSymbol)) {
    return "TW";
  }

  if (normalizedEtfSymbol === "00646") {
    return "US";
  }

  if (isUsTickerSymbol(normalizedSymbol)) {
    return "US";
  }

  return "UNKNOWN";
};

export const inferConstituentMarket = (
  constituent: Pick<
    EtfConstituent,
    "etfSymbol" | "stockSymbol" | "underlyingMarket"
  >,
): UnderlyingMarket =>
  inferUnderlyingMarketFromSymbol(constituent.stockSymbol, {
    explicitMarket: constituent.underlyingMarket,
    etfSymbol: constituent.etfSymbol,
  });

export const inferHoldingMarket = (
  holding: Pick<PortfolioHolding, "symbol" | "category">,
): UnderlyingMarket => {
  const normalizedSymbol = holding.symbol.trim().toUpperCase();
  const normalizedCategory = holding.category.trim().toUpperCase();

  if (normalizedSymbol === "00646") {
    return "US";
  }

  if (normalizedCategory.includes("美股") || normalizedCategory.includes("海外")) {
    return "US";
  }

  if (normalizedCategory.includes("台股") || normalizedCategory.includes("臺股")) {
    return "TW";
  }

  return inferUnderlyingMarketFromSymbol(normalizedSymbol);
};

const marketOrder: UnderlyingMarket[] = ["TW", "US", "OTHER", "UNKNOWN"];

export const summarizeExposureByMarket = (
  lookthroughExposures: LookthroughExposure[],
): MarketExposureSummary[] =>
  marketOrder.map((market) => {
    const exposuresForMarket = lookthroughExposures.filter(
      (exposure) => (exposure.underlyingMarket ?? "UNKNOWN") === market,
    );

    return {
      market,
      label: getUnderlyingMarketLabel(market),
      exposureValue: exposuresForMarket.reduce(
        (sum, exposure) => sum + exposure.exposureValue,
        0,
      ),
      portfolioWeight: exposuresForMarket.reduce(
        (sum, exposure) => sum + exposure.portfolioWeight,
        0,
      ),
    };
  });
