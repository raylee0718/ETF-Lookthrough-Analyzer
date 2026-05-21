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

export type EtfHoldingsProviderSupportLevel =
  | "full"
  | "partial"
  | "blocked_by_cors"
  | "unsupported";

export type EtfHoldingsAttemptedSource = {
  label: string;
  url: string;
  status: EtfHoldingsProviderSupportLevel;
  notes?: string;
  errorName?: string;
  errorMessage?: string;
  corsLikeFailure?: boolean;
};

export type EtfHoldingsRuntimeDiagnostics = {
  executionEnvironment: "browser" | "server-or-shell";
  siteEnvironment: "local-dev" | "deployed-site" | "unknown";
  origin?: string;
  testedAt: string;
};

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
  attemptedSources?: EtfHoldingsAttemptedSource[];
  supportLevel?: EtfHoldingsProviderSupportLevel;
  safeToSave?: boolean;
  runtimeDiagnostics?: EtfHoldingsRuntimeDiagnostics;
};

export type EtfProviderConfig = {
  etfSymbol: string;
  providerType: EtfHoldingsProviderType;
  sourceUrl?: string;
  notes?: string;
  enabled: boolean;
};
