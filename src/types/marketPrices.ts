export type MarketPriceStatus = "ok" | "failed";

export type MarketPriceResult = {
  symbol: string;
  name?: string;
  price?: number;
  priceDate?: string;
  source?: string;
  status: MarketPriceStatus;
  warning?: string;
  error?: string;
};

export type MarketPricesResponse = {
  status: "ok" | "partial" | "failed";
  fetchedAt: string;
  requestedSymbols: string[];
  source: string;
  cacheControl?: string;
  prices: MarketPriceResult[];
  warnings: string[];
  errors: string[];
};
