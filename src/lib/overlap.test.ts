import { describe, it, expect } from "vitest";
import {
  getEtfSymbolsFromConstituents,
  calculatePairwiseEtfOverlap,
  calculateAllEtfOverlapPairs,
  getOverlapLevel,
} from "./overlap";
import type { EtfConstituent } from "../types/portfolio";

describe("ETF Overlap Calculation Utility", () => {
  it("should extract and sort unique ETF symbols", () => {
    const constituents: EtfConstituent[] = [
      { id: "1", etfSymbol: "0050", stockSymbol: "2330", stockName: "台積電", weightPercent: 50 },
      { id: "2", etfSymbol: "0056", stockSymbol: "3034", stockName: "聯詠", weightPercent: 4 },
      { id: "3", etfSymbol: "0050", stockSymbol: "2454", stockName: "聯發科", weightPercent: 10 },
    ];

    const symbols = getEtfSymbolsFromConstituents(constituents);
    expect(symbols).toEqual(["0050", "0056"]);
  });

  it("should calculate correct overlap for two partially overlapping ETFs", () => {
    const constituents: EtfConstituent[] = [
      // ETF A: 0050
      { id: "1", etfSymbol: "0050", stockSymbol: "2330", stockName: "台積電", weightPercent: 45 },
      { id: "2", etfSymbol: "0050", stockSymbol: "2454", stockName: "聯發科", weightPercent: 15 },
      // ETF B: 006208
      { id: "3", etfSymbol: "006208", stockSymbol: "2330", stockName: "台積電", weightPercent: 47 },
      { id: "4", etfSymbol: "006208", stockSymbol: "2317", stockName: "鴻海", weightPercent: 10 },
    ];

    const result = calculatePairwiseEtfOverlap("0050", "006208", constituents);

    expect(result.etfA).toBe("0050");
    expect(result.etfB).toBe("006208");
    expect(result.etfAStockCount).toBe(2);
    expect(result.etfBStockCount).toBe(2);

    // Shared stock is 2330 (台積電)
    expect(result.sharedStockCount).toBe(1);
    expect(result.sharedStocks[0].stockSymbol).toBe("2330");
    expect(result.sharedStocks[0].weightA).toBe(45);
    expect(result.sharedStocks[0].weightB).toBe(47);

    // Weighted overlap = Min(45, 47) = 45%
    expect(result.weightedOverlap).toBe(45);
    expect(result.overlapByCountA).toBe(50); // 1 / 2 * 100
    expect(result.overlapByCountB).toBe(50); // 1 / 2 * 100
  });

  it("should calculate correct overlap when there is no overlap", () => {
    const constituents: EtfConstituent[] = [
      { id: "1", etfSymbol: "0050", stockSymbol: "2330", stockName: "台積電", weightPercent: 50 },
      { id: "2", etfSymbol: "0056", stockSymbol: "3034", stockName: "聯詠", weightPercent: 4 },
    ];

    const result = calculatePairwiseEtfOverlap("0050", "0056", constituents);

    expect(result.sharedStockCount).toBe(0);
    expect(result.weightedOverlap).toBe(0);
  });

  it("should correctly calculate all pairs and sort them by weighted overlap descending", () => {
    const constituents: EtfConstituent[] = [
      // ETF A: 0050
      { id: "1", etfSymbol: "0050", stockSymbol: "2330", stockName: "台積電", weightPercent: 45 },
      // ETF B: 006208 (highly overlapping)
      { id: "2", etfSymbol: "006208", stockSymbol: "2330", stockName: "台積電", weightPercent: 47 },
      // ETF C: 0056 (no overlap)
      { id: "3", etfSymbol: "0056", stockSymbol: "3034", stockName: "聯詠", weightPercent: 4 },
    ];

    const pairs = calculateAllEtfOverlapPairs(constituents);

    // Three unique ETFs => 3 pairs: (0050, 0056), (0050, 006208), (0056, 006208)
    expect(pairs).toHaveLength(3);
    // Highest overlap should be first: (0050, 006208) with 45%
    expect(pairs[0].etfA).toBe("0050");
    expect(pairs[0].etfB).toBe("006208");
    expect(pairs[0].weightedOverlap).toBe(45);
  });

  it("should return correct overlap level labels", () => {
    expect(getOverlapLevel(50)).toBe("高度重疊");
    expect(getOverlapLevel(25)).toBe("中度重疊");
    expect(getOverlapLevel(10)).toBe("低度重疊");
  });
});
