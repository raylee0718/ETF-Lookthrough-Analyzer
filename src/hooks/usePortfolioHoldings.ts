import { useEffect, useState } from "react";
import { mockPortfolioHoldings } from "../data/mockData";
import {
  parsePortfolioHoldings,
  PORTFOLIO_STORAGE_KEY,
  serializePortfolioHoldings,
} from "../lib/portfolioStorage";
import type { PortfolioHolding } from "../types/portfolio";

export type HoldingInput = Omit<PortfolioHolding, "id">;

const createHoldingId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `holding-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeInput = (input: HoldingInput): HoldingInput => ({
  symbol: input.symbol.trim().toUpperCase(),
  name: input.name.trim(),
  category: input.category.trim(),
  marketValue: input.marketValue,
  note: input.note?.trim() || undefined,
});

export function usePortfolioHoldings() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => {
    const storedHoldings = parsePortfolioHoldings(
      window.localStorage.getItem(PORTFOLIO_STORAGE_KEY),
    );

    return storedHoldings ?? mockPortfolioHoldings;
  });

  useEffect(() => {
    window.localStorage.setItem(
      PORTFOLIO_STORAGE_KEY,
      serializePortfolioHoldings(holdings),
    );
  }, [holdings]);

  const addHolding = (input: HoldingInput) => {
    const normalizedInput = normalizeInput(input);

    setHoldings((currentHoldings) => [
      ...currentHoldings,
      {
        id: createHoldingId(),
        ...normalizedInput,
      },
    ]);
  };

  const updateHolding = (id: string, input: HoldingInput) => {
    const normalizedInput = normalizeInput(input);

    setHoldings((currentHoldings) =>
      currentHoldings.map((holding) =>
        holding.id === id ? { ...holding, ...normalizedInput } : holding,
      ),
    );
  };

  const deleteHolding = (id: string) => {
    setHoldings((currentHoldings) =>
      currentHoldings.filter((holding) => holding.id !== id),
    );
  };

  const resetHoldings = () => {
    setHoldings(mockPortfolioHoldings);
  };

  return {
    holdings,
    addHolding,
    updateHolding,
    deleteHolding,
    resetHoldings,
  };
}
