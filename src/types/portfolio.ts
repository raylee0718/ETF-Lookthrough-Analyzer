export type UnderlyingMarket = "TW" | "US" | "OTHER" | "UNKNOWN";

export type PortfolioHolding = {
  id: string;
  symbol: string;
  name: string;
  category: string;
  marketValue: number;
  note?: string;
};

export type EtfConstituent = {
  id: string;
  etfSymbol: string;
  stockSymbol: string;
  stockName: string;
  weightPercent: number;
  industry?: string;
  underlyingMarket?: UnderlyingMarket;
  asOfDate?: string;
  source?: string;
};

export type LookthroughExposure = {
  stockSymbol: string;
  stockName: string;
  exposureValue: number;
  portfolioWeight: number;
  industry?: string;
  underlyingMarket?: UnderlyingMarket;
  sources: {
    sourceSymbol: string;
    sourceName: string;
    exposureValue: number;
  }[];
};

export type IndustryExposure = {
  industry: string;
  exposureValue: number;
  portfolioWeight: number;
};
