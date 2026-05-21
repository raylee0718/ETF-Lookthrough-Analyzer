import type { EtfConstituent } from "./portfolio";

export type EtfHoldingsProviderType =
  | "manual"
  | "csv"
  | "sitca"
  | "issuer"
  | "custom";

export type EtfHoldingsProviderStatus =
  | "supported"
  | "partial"
  | "unsupported"
  | "failed";

export type EtfHoldingsFetchResult = {
  etfSymbol: string;
  asOfDate?: string;
  source: string;
  providerType: EtfHoldingsProviderType;
  status: EtfHoldingsProviderStatus;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
  fetchedAt: string;
};

export type EtfProviderConfig = {
  etfSymbol: string;
  providerType: EtfHoldingsProviderType;
  sourceUrl?: string;
  notes?: string;
  enabled: boolean;
};
