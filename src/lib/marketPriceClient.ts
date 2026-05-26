import type { MarketPricesResponse } from "../types/marketPrices";

type FetchMarketPricesOptions = {
  symbols: string[];
};

export async function fetchMarketPricesForSymbols({
  symbols,
}: FetchMarketPricesOptions): Promise<MarketPricesResponse> {
  const normalizedSymbols = Array.from(
    new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter((symbol) => symbol.length > 0),
    ),
  );

  if (normalizedSymbols.length === 0) {
    throw new Error("沒有可更新的代號。");
  }

  const params = new URLSearchParams({
    symbols: normalizedSymbols.join(","),
  });
  const response = await fetch(`/api/market-prices?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });

  let body: MarketPricesResponse | undefined;

  try {
    body = (await response.json()) as MarketPricesResponse;
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const message =
      body?.errors?.[0] ?? `價格更新失敗，HTTP ${response.status}`;
    throw new Error(message);
  }

  if (!body) {
    throw new Error("價格更新失敗，回應格式無法辨識。");
  }

  return body;
}
