import type { EtfConstituent } from "./portfolio";

export type EtfHoldingsProxySymbol = "0050" | "00981A" | "00994A";

export type EtfHoldingsProxyStatus = "ok" | "partial" | "failed";

export type EtfHoldingsProxyResponse = {
  symbol: EtfHoldingsProxySymbol;
  status: EtfHoldingsProxyStatus;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  asOfDate?: string;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
};
