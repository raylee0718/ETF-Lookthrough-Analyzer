import type {
  EtfConstituent,
  IndustryExposure,
  LookthroughExposure,
  PortfolioHolding,
  UnderlyingMarket,
} from "../types/portfolio";
import {
  inferConstituentMarket,
  inferHoldingMarket,
} from "./marketClassification";

export type ConcentrationWarning = {
  stockSymbol: string;
  stockName: string;
  portfolioWeight: number;
  level: "high" | "medium";
  message: string;
};

type ExposureAccumulator = {
  stockSymbol: string;
  stockName: string;
  exposureValue: number;
  industry?: string;
  underlyingMarket: UnderlyingMarket;
  sources: LookthroughExposure["sources"];
};

export function calculateLookthroughExposure(
  holdings: PortfolioHolding[],
  constituents: EtfConstituent[],
): LookthroughExposure[] {
  const totalPortfolioValue = holdings.reduce(
    (sum, holding) => sum + holding.marketValue,
    0,
  );
  const constituentsByEtf = new Map<string, EtfConstituent[]>();
  const exposuresByStock = new Map<string, ExposureAccumulator>();

  constituents.forEach((constituent) => {
    const etfSymbol = constituent.etfSymbol.toUpperCase();
    const currentConstituents = constituentsByEtf.get(etfSymbol) ?? [];
    currentConstituents.push(constituent);
    constituentsByEtf.set(etfSymbol, currentConstituents);
  });

  const addExposure = ({
    stockSymbol,
    stockName,
    exposureValue,
    industry,
    underlyingMarket,
    sourceSymbol,
    sourceName,
  }: {
    stockSymbol: string;
    stockName: string;
    exposureValue: number;
    industry?: string;
    underlyingMarket: UnderlyingMarket;
    sourceSymbol: string;
    sourceName: string;
  }) => {
    const normalizedStockSymbol = stockSymbol.toUpperCase();
    const normalizedMarket = underlyingMarket ?? "UNKNOWN";
    const exposureKey = `${normalizedMarket}:${normalizedStockSymbol}`;
    const existingExposure = exposuresByStock.get(exposureKey);

    if (!existingExposure) {
      exposuresByStock.set(exposureKey, {
        stockSymbol: normalizedStockSymbol,
        stockName,
        exposureValue,
        industry,
        underlyingMarket: normalizedMarket,
        sources: [{ sourceSymbol, sourceName, exposureValue }],
      });
      return;
    }

    const existingSource = existingExposure.sources.find(
      (source) => source.sourceSymbol === sourceSymbol,
    );

    if (existingSource) {
      existingSource.exposureValue += exposureValue;
    } else {
      existingExposure.sources.push({ sourceSymbol, sourceName, exposureValue });
    }

    existingExposure.exposureValue += exposureValue;
    existingExposure.industry = existingExposure.industry ?? industry;
    existingExposure.underlyingMarket =
      existingExposure.underlyingMarket ?? normalizedMarket;
  };

  holdings.forEach((holding) => {
    const holdingSymbol = holding.symbol.toUpperCase();
    const matchingConstituents = constituentsByEtf.get(holdingSymbol);

    if (matchingConstituents && matchingConstituents.length > 0) {
      matchingConstituents.forEach((constituent) => {
        addExposure({
          stockSymbol: constituent.stockSymbol,
          stockName: constituent.stockName,
          exposureValue:
            (holding.marketValue * constituent.weightPercent) / 100,
          industry: constituent.industry,
          underlyingMarket: inferConstituentMarket(constituent),
          sourceSymbol: holding.symbol,
          sourceName: holding.name,
        });
      });
      return;
    }

    addExposure({
      stockSymbol: holding.symbol,
      stockName: holding.name,
      exposureValue: holding.marketValue,
      underlyingMarket: inferHoldingMarket(holding),
      sourceSymbol: holding.symbol,
      sourceName: holding.name,
    });
  });

  return Array.from(exposuresByStock.values())
    .map((exposure) => ({
      ...exposure,
      portfolioWeight:
        totalPortfolioValue > 0
          ? (exposure.exposureValue / totalPortfolioValue) * 100
          : 0,
      sources: exposure.sources.sort(
        (a, b) => b.exposureValue - a.exposureValue,
      ),
    }))
    .sort((a, b) => b.exposureValue - a.exposureValue);
}

export function calculateIndustryExposure(
  lookthroughExposures: LookthroughExposure[],
): IndustryExposure[] {
  const exposureByIndustry = new Map<
    string,
    { exposureValue: number; portfolioWeight: number }
  >();

  lookthroughExposures.forEach((exposure) => {
    const industry = exposure.industry || "未分類";
    const currentExposure = exposureByIndustry.get(industry) ?? {
      exposureValue: 0,
      portfolioWeight: 0,
    };

    exposureByIndustry.set(industry, {
      exposureValue: currentExposure.exposureValue + exposure.exposureValue,
      portfolioWeight: currentExposure.portfolioWeight + exposure.portfolioWeight,
    });
  });

  return Array.from(exposureByIndustry.entries())
    .map(([industry, exposure]) => ({
      industry,
      exposureValue: exposure.exposureValue,
      portfolioWeight: exposure.portfolioWeight,
    }))
    .sort((a, b) => b.exposureValue - a.exposureValue);
}

export function findConcentrationWarnings(
  lookthroughExposures: LookthroughExposure[],
): ConcentrationWarning[] {
  return lookthroughExposures
    .filter((exposure) => exposure.portfolioWeight > 10)
    .map((exposure) => ({
      stockSymbol: exposure.stockSymbol,
      stockName: exposure.stockName,
      portfolioWeight: exposure.portfolioWeight,
      level: exposure.portfolioWeight > 20 ? "high" : "medium",
      message: exposure.portfolioWeight > 20 ? "高度集中" : "中度集中",
    }));
}

export function calculateUnmappedEtfHoldings(
  holdings: PortfolioHolding[],
  constituents: EtfConstituent[],
): PortfolioHolding[] {
  const mappedEtfSymbols = new Set(
    constituents.map((constituent) => constituent.etfSymbol.toUpperCase()),
  );

  return holdings.filter(
    (holding) =>
      holding.category.toUpperCase().includes("ETF") &&
      !mappedEtfSymbols.has(holding.symbol.toUpperCase()),
  );
}
