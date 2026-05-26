import type { PortfolioHolding } from "../types/portfolio";
import type {
  PositionWithMarketValue,
  PriceRecord,
  PriceSourceType,
} from "../types/prices";
import type { CalculatedPosition } from "../types/transactions";

export function getPriceSourceLabel(sourceType?: PriceSourceType) {
  switch (sourceType) {
    case "csv":
      return "CSV 匯入";
    case "provider":
      return "自動來源";
    case "manual":
    default:
      return "手動輸入";
  }
}

export function getLatestPriceMap(priceRecords: PriceRecord[]) {
  const latestPriceMap = new Map<string, PriceRecord>();

  priceRecords.forEach((record) => {
    if (!Number.isFinite(record.price) || record.price <= 0) {
      return;
    }

    const symbol = record.symbol.toUpperCase();
    const existingRecord = latestPriceMap.get(symbol);

    if (!existingRecord || record.date > existingRecord.date) {
      latestPriceMap.set(symbol, record);
    }
  });

  return latestPriceMap;
}

export function getMissingPriceSymbols(
  positions: CalculatedPosition[],
  priceRecords: PriceRecord[],
) {
  const latestPriceMap = getLatestPriceMap(priceRecords);

  return positions
    .filter((position) => position.shares > 0)
    .filter((position) => !latestPriceMap.has(position.symbol.toUpperCase()))
    .map((position) => position.symbol);
}

export function getPriceCoverageSummary(
  positions: CalculatedPosition[],
  priceRecords: PriceRecord[],
) {
  const activePositions = positions.filter((position) => position.shares > 0);
  const missingSymbols = getMissingPriceSymbols(activePositions, priceRecords);
  const totalPositionCount = activePositions.length;
  const missingPriceCount = missingSymbols.length;
  const pricedPositionCount = totalPositionCount - missingPriceCount;

  return {
    totalPositionCount,
    pricedPositionCount,
    missingPriceCount,
    coveragePercent:
      totalPositionCount > 0 ? (pricedPositionCount / totalPositionCount) * 100 : 0,
    missingSymbols,
  };
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
          marketValue: 0,
          unrealizedPnL: 0,
          unrealizedReturnPercent: 0,
          totalPnL: 0,
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
    .filter((position) => position.shares > 0 && position.priceStatus === "priced")
    .map((position) => ({
      id: `priced-position-${position.symbol}`,
      symbol: position.symbol,
      name: position.name,
      category: position.category,
      marketValue: position.marketValue,
      note: "由交易紀錄與手動價格表估算",
    }));
}
