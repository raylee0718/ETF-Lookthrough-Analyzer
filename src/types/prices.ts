export type PriceRecord = {
  id: string;
  symbol: string;
  name?: string;
  price: number;
  date: string;
  source?: string;
  note?: string;
};

export type PositionWithMarketValue = {
  symbol: string;
  name: string;
  category: string;
  shares: number;
  averageCost: number;
  totalCost: number;
  marketPrice?: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedReturnPercent: number;
  realizedPnL: number;
  totalPnL: number;
  lastPriceDate?: string;
  priceStatus: "priced" | "missing";
};
