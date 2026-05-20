export type TransactionType = "buy" | "sell";

export type TransactionRecord = {
  id: string;
  date: string;
  symbol: string;
  name: string;
  category: string;
  type: TransactionType;
  shares: number;
  price: number;
  fee?: number;
  tax?: number;
  note?: string;
};

export type CalculatedPosition = {
  symbol: string;
  name: string;
  category: string;
  shares: number;
  averageCost: number;
  totalCost: number;
  realizedPnL: number;
  lastTransactionDate?: string;
};

export type PositionCalculationWarning = {
  symbol: string;
  message: string;
};
