import type { PortfolioHolding } from "../types/portfolio";
import type {
  CalculatedPosition,
  PositionCalculationWarning,
  TransactionRecord,
} from "../types/transactions";

type MutablePosition = CalculatedPosition;

export function calculatePositionsFromTransactions(
  transactions: TransactionRecord[],
): {
  positions: CalculatedPosition[];
  warnings: PositionCalculationWarning[];
} {
  const positionsBySymbol = new Map<string, MutablePosition>();
  const warnings: PositionCalculationWarning[] = [];
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    return dateCompare !== 0 ? dateCompare : a.id.localeCompare(b.id);
  });

  sortedTransactions.forEach((transaction) => {
    const symbol = transaction.symbol.toUpperCase();
    const fee = transaction.fee ?? 0;
    const tax = transaction.tax ?? 0;
    const existingPosition = positionsBySymbol.get(symbol) ?? {
      symbol,
      name: transaction.name,
      category: transaction.category,
      shares: 0,
      averageCost: 0,
      totalCost: 0,
      realizedPnL: 0,
      lastTransactionDate: transaction.date,
    };

    existingPosition.name = transaction.name;
    existingPosition.category = transaction.category;
    existingPosition.lastTransactionDate = transaction.date;

    if (transaction.type === "buy") {
      existingPosition.shares += transaction.shares;
      existingPosition.totalCost += transaction.shares * transaction.price + fee;
      existingPosition.averageCost =
        existingPosition.shares > 0
          ? existingPosition.totalCost / existingPosition.shares
          : 0;
      positionsBySymbol.set(symbol, existingPosition);
      return;
    }

    const sharesToSell = Math.min(transaction.shares, existingPosition.shares);

    if (transaction.shares > existingPosition.shares) {
      warnings.push({
        symbol,
        message: "賣出股數超過目前持有股數，請檢查交易紀錄。",
      });
    }

    const sellProceeds = sharesToSell * transaction.price - fee - tax;
    const costBasis = sharesToSell * existingPosition.averageCost;
    existingPosition.realizedPnL += sellProceeds - costBasis;
    existingPosition.shares = Math.max(0, existingPosition.shares - sharesToSell);
    existingPosition.totalCost = Math.max(
      0,
      existingPosition.totalCost - costBasis,
    );

    if (existingPosition.shares === 0) {
      existingPosition.averageCost = 0;
      existingPosition.totalCost = 0;
    } else {
      existingPosition.averageCost =
        existingPosition.totalCost / existingPosition.shares;
    }

    positionsBySymbol.set(symbol, existingPosition);
  });

  const positions = Array.from(positionsBySymbol.values())
    .filter((position) => position.shares > 0 || position.realizedPnL !== 0)
    .sort((a, b) => b.totalCost - a.totalCost);

  return { positions, warnings };
}

export function convertPositionsToPortfolioHoldings(
  positions: CalculatedPosition[],
): PortfolioHolding[] {
  return positions
    .filter((position) => position.shares > 0)
    .map((position) => ({
      id: `position-${position.symbol}`,
      symbol: position.symbol,
      name: position.name,
      category: position.category,
      marketValue: position.totalCost,
      note: "由交易紀錄估算，目前尚未接入最新市價。",
    }));
}
