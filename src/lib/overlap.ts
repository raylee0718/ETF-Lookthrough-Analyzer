import type { EtfConstituent } from "../types/portfolio";

export type SharedEtfStock = {
  stockSymbol: string;
  stockName: string;
  industry?: string;
  weightA: number;
  weightB: number;
  combinedWeight: number;
};

export type EtfOverlapResult = {
  etfA: string;
  etfB: string;
  sharedStocks: SharedEtfStock[];
  sharedStockCount: number;
  etfAStockCount: number;
  etfBStockCount: number;
  overlapByCountA: number;
  overlapByCountB: number;
  weightedOverlap: number;
};

export function getEtfSymbolsFromConstituents(
  constituents: EtfConstituent[],
) {
  return Array.from(
    new Set(
      constituents.map((constituent) => constituent.etfSymbol.toUpperCase()),
    ),
  ).sort();
}

const aggregateConstituentsByStock = (
  etfSymbol: string,
  constituents: EtfConstituent[],
) => {
  const holdingsByStock = new Map<
    string,
    Pick<SharedEtfStock, "stockSymbol" | "stockName" | "industry"> & {
      weight: number;
    }
  >();

  constituents
    .filter(
      (constituent) =>
        constituent.etfSymbol.toUpperCase() === etfSymbol.toUpperCase(),
    )
    .forEach((constituent) => {
      const stockSymbol = constituent.stockSymbol.toUpperCase();
      const existingHolding = holdingsByStock.get(stockSymbol);

      holdingsByStock.set(stockSymbol, {
        stockSymbol,
        stockName: existingHolding?.stockName ?? constituent.stockName,
        industry: existingHolding?.industry ?? constituent.industry,
        weight: (existingHolding?.weight ?? 0) + constituent.weightPercent,
      });
    });

  return holdingsByStock;
};

export function calculatePairwiseEtfOverlap(
  etfA: string,
  etfB: string,
  constituents: EtfConstituent[],
): EtfOverlapResult {
  const normalizedEtfA = etfA.toUpperCase();
  const normalizedEtfB = etfB.toUpperCase();
  const etfAHoldings = aggregateConstituentsByStock(
    normalizedEtfA,
    constituents,
  );
  const etfBHoldings = aggregateConstituentsByStock(
    normalizedEtfB,
    constituents,
  );
  const sharedStocks: SharedEtfStock[] = [];

  etfAHoldings.forEach((holdingA, stockSymbol) => {
    const holdingB = etfBHoldings.get(stockSymbol);

    if (!holdingB) {
      return;
    }

    sharedStocks.push({
      stockSymbol,
      stockName: holdingA.stockName || holdingB.stockName,
      industry: holdingA.industry ?? holdingB.industry,
      weightA: holdingA.weight,
      weightB: holdingB.weight,
      combinedWeight: holdingA.weight + holdingB.weight,
    });
  });

  sharedStocks.sort((a, b) => b.combinedWeight - a.combinedWeight);

  const sharedStockCount = sharedStocks.length;
  const etfAStockCount = etfAHoldings.size;
  const etfBStockCount = etfBHoldings.size;
  const weightedOverlap = sharedStocks.reduce(
    (sum, stock) => sum + Math.min(stock.weightA, stock.weightB),
    0,
  );

  return {
    etfA: normalizedEtfA,
    etfB: normalizedEtfB,
    sharedStocks,
    sharedStockCount,
    etfAStockCount,
    etfBStockCount,
    overlapByCountA:
      etfAStockCount > 0 ? (sharedStockCount / etfAStockCount) * 100 : 0,
    overlapByCountB:
      etfBStockCount > 0 ? (sharedStockCount / etfBStockCount) * 100 : 0,
    weightedOverlap,
  };
}

export function calculateAllEtfOverlapPairs(
  constituents: EtfConstituent[],
) {
  const etfSymbols = getEtfSymbolsFromConstituents(constituents);
  const overlapPairs: EtfOverlapResult[] = [];

  for (let firstIndex = 0; firstIndex < etfSymbols.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < etfSymbols.length;
      secondIndex += 1
    ) {
      overlapPairs.push(
        calculatePairwiseEtfOverlap(
          etfSymbols[firstIndex],
          etfSymbols[secondIndex],
          constituents,
        ),
      );
    }
  }

  return overlapPairs.sort((a, b) => b.weightedOverlap - a.weightedOverlap);
}

export function getOverlapLevel(weightedOverlap: number) {
  if (weightedOverlap >= 40) {
    return "高度重疊";
  }

  if (weightedOverlap >= 20) {
    return "中度重疊";
  }

  return "低度重疊";
}
