import { describe, it, expect } from "vitest";
import {
  calculateLookthroughExposure,
  calculateIndustryExposure,
  findConcentrationWarnings,
  calculateUnmappedEtfHoldings,
} from "./lookthrough";
import type { PortfolioHolding, EtfConstituent } from "../types/portfolio";

describe("Lookthrough Exposure Calculation Utility", () => {
  it("should calculate correctly for individual direct stock holdings", () => {
    const holdings: PortfolioHolding[] = [
      {
        id: "hold-1",
        symbol: "2330",
        name: "台積電",
        category: "個股",
        marketValue: 100000,
      },
    ];
    const constituents: EtfConstituent[] = [];

    const exposures = calculateLookthroughExposure(holdings, constituents);

    expect(exposures).toHaveLength(1);
    expect(exposures[0].stockSymbol).toBe("2330");
    expect(exposures[0].exposureValue).toBe(100000);
    expect(exposures[0].portfolioWeight).toBe(100);
    expect(exposures[0].sources).toHaveLength(1);
    expect(exposures[0].sources[0].sourceSymbol).toBe("2330");
  });

  it("should split ETF holdings proportionally based on constituents", () => {
    const holdings: PortfolioHolding[] = [
      {
        id: "hold-1",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        marketValue: 100000,
      },
    ];
    // ETF 0050 has two constituents: 2330 (50%) and 2454 (30%).
    const constituents: EtfConstituent[] = [
      {
        id: "c-1",
        etfSymbol: "0050",
        stockSymbol: "2330",
        stockName: "台積電",
        weightPercent: 50,
        industry: "半導體",
      },
      {
        id: "c-2",
        etfSymbol: "0050",
        stockSymbol: "2454",
        stockName: "聯發科",
        weightPercent: 30,
        industry: "半導體",
      },
    ];

    const exposures = calculateLookthroughExposure(holdings, constituents);

    // Should yield 2 exposures
    expect(exposures).toHaveLength(2);
    expect(exposures[0].stockSymbol).toBe("2330");
    expect(exposures[0].exposureValue).toBe(50000); // 50% of 100,000
    expect(exposures[0].portfolioWeight).toBe(50); // 50,000 / 100,000 * 100
    expect(exposures[1].stockSymbol).toBe("2454");
    expect(exposures[1].exposureValue).toBe(30000);
    expect(exposures[1].portfolioWeight).toBe(30);
  });

  it("should aggregate identical underlying stocks from different sources", () => {
    const holdings: PortfolioHolding[] = [
      {
        id: "hold-1",
        symbol: "2330",
        name: "台積電",
        category: "個股",
        marketValue: 50000,
      },
      {
        id: "hold-2",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        marketValue: 100000,
      },
    ];
    const constituents: EtfConstituent[] = [
      {
        id: "c-1",
        etfSymbol: "0050",
        stockSymbol: "2330",
        stockName: "台積電",
        weightPercent: 50,
        industry: "半導體",
      },
    ];

    const exposures = calculateLookthroughExposure(holdings, constituents);

    // Total portfolio value = 150,000
    // 2330 exposure from direct stock = 50,000
    // 2330 exposure from 0050 = 50,000
    // Total 2330 exposure = 100,000 (66.67% of 150,000)
    expect(exposures).toHaveLength(1);
    expect(exposures[0].stockSymbol).toBe("2330");
    expect(exposures[0].exposureValue).toBe(100000);
    expect(exposures[0].portfolioWeight).toBeCloseTo(66.66667, 4);
    expect(exposures[0].sources).toHaveLength(2);
  });

  it("should aggregate industry exposures correctly", () => {
    const exposures = [
      {
        stockSymbol: "2330",
        stockName: "台積電",
        exposureValue: 50000,
        portfolioWeight: 50,
        industry: "半導體",
        sources: [],
      },
      {
        stockSymbol: "2454",
        stockName: "聯發科",
        exposureValue: 30000,
        portfolioWeight: 30,
        industry: "半導體",
        sources: [],
      },
      {
        stockSymbol: "2881",
        stockName: "富邦金",
        exposureValue: 20000,
        portfolioWeight: 20,
        industry: "金融業",
        sources: [],
      },
    ];

    const industryExposures = calculateIndustryExposure(exposures);

    expect(industryExposures).toHaveLength(2);
    expect(industryExposures[0].industry).toBe("半導體");
    expect(industryExposures[0].exposureValue).toBe(80000);
    expect(industryExposures[0].portfolioWeight).toBe(80);
    expect(industryExposures[1].industry).toBe("金融業");
    expect(industryExposures[1].exposureValue).toBe(20000);
    expect(industryExposures[1].portfolioWeight).toBe(20);
  });

  it("should trigger warnings for high concentrations (>10% and >20%)", () => {
    const exposures = [
      {
        stockSymbol: "2330",
        stockName: "台積電",
        exposureValue: 30000,
        portfolioWeight: 30,
        sources: [],
      },
      {
        stockSymbol: "2454",
        stockName: "聯發科",
        exposureValue: 15000,
        portfolioWeight: 15,
        sources: [],
      },
      {
        stockSymbol: "2881",
        stockName: "富邦金",
        exposureValue: 5000,
        portfolioWeight: 5,
        sources: [],
      },
    ];

    const warnings = findConcentrationWarnings(exposures);

    expect(warnings).toHaveLength(2);
    // 2330 (>20%) -> level: high
    expect(warnings[0].stockSymbol).toBe("2330");
    expect(warnings[0].level).toBe("high");
    // 2454 (>10%) -> level: medium
    expect(warnings[1].stockSymbol).toBe("2454");
    expect(warnings[1].level).toBe("medium");
  });

  it("should calculate unmapped ETF holdings", () => {
    const holdings: PortfolioHolding[] = [
      {
        id: "h-1",
        symbol: "0050",
        name: "元大台灣50",
        category: "台股核心 ETF",
        marketValue: 50000,
      },
      {
        id: "h-2",
        symbol: "0056",
        name: "元大高股息",
        category: "台股核心 ETF",
        marketValue: 30000,
      },
    ];
    // Constituents only exist for 0050
    const constituents: EtfConstituent[] = [
      {
        id: "c-1",
        etfSymbol: "0050",
        stockSymbol: "2330",
        stockName: "台積電",
        weightPercent: 50,
      },
    ];

    const unmapped = calculateUnmappedEtfHoldings(holdings, constituents);

    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].symbol).toBe("0056");
  });
});
