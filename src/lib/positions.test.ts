import { describe, it, expect } from "vitest";
import { calculatePositionsFromTransactions, convertPositionsToPortfolioHoldings } from "./positions";
import type { TransactionRecord } from "../types/transactions";

describe("Positions Calculation Utility", () => {
  it("should calculate correctly for a single buy transaction", () => {
    const txs: TransactionRecord[] = [
      {
        id: "tx-1",
        date: "2026-05-01",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "buy",
        shares: 1000,
        price: 150,
        fee: 100,
        tax: 0,
      },
    ];

    const { positions, warnings } = calculatePositionsFromTransactions(txs);

    expect(warnings).toHaveLength(0);
    expect(positions).toHaveLength(1);
    const pos = positions[0];
    expect(pos.symbol).toBe("0050");
    expect(pos.shares).toBe(1000);
    expect(pos.totalCost).toBe(1000 * 150 + 100);
    expect(pos.averageCost).toBe((1000 * 150 + 100) / 1000);
    expect(pos.realizedPnL).toBe(0);
  });

  it("should calculate correctly for multiple buy transactions (average cost method)", () => {
    const txs: TransactionRecord[] = [
      {
        id: "tx-1",
        date: "2026-05-01",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "buy",
        shares: 1000,
        price: 150,
        fee: 100,
        tax: 0,
      },
      {
        id: "tx-2",
        date: "2026-05-02",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "buy",
        shares: 500,
        price: 160,
        fee: 50,
        tax: 0,
      },
    ];

    const { positions, warnings } = calculatePositionsFromTransactions(txs);

    expect(warnings).toHaveLength(0);
    expect(positions).toHaveLength(1);
    const pos = positions[0];
    expect(pos.shares).toBe(1500);
    expect(pos.totalCost).toBe((1000 * 150 + 100) + (500 * 160 + 50));
    expect(pos.averageCost).toBe(pos.totalCost / 1500);
  });

  it("should calculate correctly for a buy followed by a partial sell", () => {
    const txs: TransactionRecord[] = [
      {
        id: "tx-1",
        date: "2026-05-01",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "buy",
        shares: 1000,
        price: 150,
        fee: 100,
        tax: 0,
      },
      {
        id: "tx-2",
        date: "2026-05-02",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "sell",
        shares: 400,
        price: 180,
        fee: 50,
        tax: 30,
      },
    ];

    const { positions, warnings } = calculatePositionsFromTransactions(txs);

    expect(warnings).toHaveLength(0);
    expect(positions).toHaveLength(1);
    const pos = positions[0];
    expect(pos.shares).toBe(600);

    // averageCost doesn't change on selling
    const originalAvgCost = (1000 * 150 + 100) / 1000;
    expect(pos.averageCost).toBeCloseTo(originalAvgCost, 5);

    // realized PnL = sellProceeds - costBasis
    // sellProceeds = 400 * 180 - 50 - 30 = 71920
    // costBasis = 400 * originalAvgCost = 400 * 150.1 = 60040
    // realizedPnL = 71920 - 60040 = 11880
    expect(pos.realizedPnL).toBeCloseTo(11880, 5);
  });

  it("should handle a full exit of a position", () => {
    const txs: TransactionRecord[] = [
      {
        id: "tx-1",
        date: "2026-05-01",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "buy",
        shares: 1000,
        price: 150,
        fee: 100,
        tax: 0,
      },
      {
        id: "tx-2",
        date: "2026-05-02",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "sell",
        shares: 1000,
        price: 180,
        fee: 50,
        tax: 30,
      },
    ];

    const { positions, warnings } = calculatePositionsFromTransactions(txs);

    expect(warnings).toHaveLength(0);
    // Even if shares is 0, since realizedPnL is non-zero, it is kept in positions to show on the details page.
    expect(positions).toHaveLength(1);
    const pos = positions[0];
    expect(pos.shares).toBe(0);
    expect(pos.averageCost).toBe(0);
    expect(pos.totalCost).toBe(0);
    // realizedPnL = (1000 * 180 - 50 - 30) - (1000 * 150.1) = 179920 - 150100 = 29820
    expect(pos.realizedPnL).toBe(29820);
  });

  it("should trigger a warning when selling more shares than currently held", () => {
    const txs: TransactionRecord[] = [
      {
        id: "tx-1",
        date: "2026-05-01",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "buy",
        shares: 100,
        price: 150,
      },
      {
        id: "tx-2",
        date: "2026-05-02",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "sell",
        shares: 150,
        price: 160,
      },
    ];

    const { positions, warnings } = calculatePositionsFromTransactions(txs);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].symbol).toBe("0050");
    expect(warnings[0].message).toContain("賣出股數超過目前持有股數");
    expect(positions[0].shares).toBe(0);
  });

  it("should sort positions by total cost in descending order", () => {
    const txs: TransactionRecord[] = [
      {
        id: "tx-1",
        date: "2026-05-01",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        type: "buy",
        shares: 100,
        price: 150,
      },
      {
        id: "tx-2",
        date: "2026-05-01",
        symbol: "00646",
        name: "元大S&P500",
        category: "美股核心 ETF",
        type: "buy",
        shares: 1000,
        price: 45,
      },
    ];

    const { positions } = calculatePositionsFromTransactions(txs);
    expect(positions).toHaveLength(2);
    // 00646 total cost = 45000, 0050 total cost = 15000.
    // 00646 should come first due to higher cost
    expect(positions[0].symbol).toBe("00646");
    expect(positions[1].symbol).toBe("0050");
  });

  it("should correctly convert positions to portfolio holdings", () => {
    const activePositions = [
      {
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        shares: 1000,
        averageCost: 150,
        totalCost: 150000,
        realizedPnL: 0,
      },
    ];

    const holdings = convertPositionsToPortfolioHoldings(activePositions);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].id).toBe("position-0050");
    expect(holdings[0].symbol).toBe("0050");
    expect(holdings[0].marketValue).toBe(150000);
  });
});
