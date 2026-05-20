export type PriceProviderMarket = "twse" | "tpex";

export type FetchedPrice = {
  symbol: string;
  name?: string;
  price: number;
  date: string;
  market: PriceProviderMarket;
  raw?: unknown;
};

export type PriceProviderResult = {
  provider: string;
  fetchedAt: string;
  prices: FetchedPrice[];
  warnings: string[];
  errors: string[];
};
