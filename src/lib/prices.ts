import type { PortfolioHolding } from "../types/portfolio";
import type {
  PositionWithMarketValue,
  PriceRecord,
} from "../types/prices";
import type { CalculatedPosition } from "../types/transactions";

export function getLatestPriceMap(priceRecords: PriceRecord[]) {
  const latestPriceMap = new Map<string, PriceRecord>();

  priceRecords.forEach((record) => {
    const symbol = record.symbol.toUpperCase();
    const existingRecord = latestPriceMap.get(symbol);

    if (!existingRecord || record.date > existingRecord.date) {
      latestPriceMap.set(symbol, record);
    }
  });

  return latestPriceMap;
}

export function calculatePositionsWithMarketValue(
  positions: CalculatedPosition[],
  priceRecords: PriceRecord[],
): PositionWithMarketValue[] {
  const latestPriceMap = getLatestPriceMap(priceRecords);

  return positions
    .map((position) => {
      const latestPrice = latestPriceMap.get(position.symbol.toUpperCase());

      if (!latestPrice) {
        return {
          ...position,
          marketValue: position.totalCost,
          unrealizedPnL: 0,
          unrealizedReturnPercent: 0,
          totalPnL: position.realizedPnL,
          priceStatus: "missing" as const,
        };
      }

      const marketValue = position.shares * latestPrice.price;
      const unrealizedPnL = marketValue - position.totalCost;

      return {
        ...position,
        marketPrice: latestPrice.price,
        marketValue,
        unrealizedPnL,
        unrealizedReturnPercent:
          position.totalCost > 0 ? (unrealizedPnL / position.totalCost) * 100 : 0,
        totalPnL: position.realizedPnL + unrealizedPnL,
        lastPriceDate: latestPrice.date,
        priceStatus: "priced" as const,
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);
}

export function convertPricedPositionsToPortfolioHoldings(
  positions: PositionWithMarketValue[],
): PortfolioHolding[] {
  return positions
    .filter((position) => position.shares > 0)
    .map((position) => ({
      id: `priced-position-${position.symbol}`,
      symbol: position.symbol,
      name: position.name,
      category: position.category,
      marketValue: position.marketValue,
      note:
        position.priceStatus === "priced"
          ? "由交易紀錄與手動價格表估算"
          : "缺少價格，暫以投入成本估算",
    }));
}
