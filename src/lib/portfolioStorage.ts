import type { PortfolioHolding } from "../types/portfolio";

export const PORTFOLIO_STORAGE_KEY = "etf-lookthrough-portfolio-holdings";

const isPortfolioHolding = (value: unknown): value is PortfolioHolding => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const holding = value as Record<string, unknown>;

  return (
    typeof holding.id === "string" &&
    typeof holding.symbol === "string" &&
    typeof holding.name === "string" &&
    typeof holding.category === "string" &&
    typeof holding.marketValue === "number" &&
    Number.isFinite(holding.marketValue) &&
    (holding.note === undefined || typeof holding.note === "string")
  );
};

export const serializePortfolioHoldings = (holdings: PortfolioHolding[]) =>
  JSON.stringify(holdings);

export const parsePortfolioHoldings = (rawValue: string | null) => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue) || !parsedValue.every(isPortfolioHolding)) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
};
