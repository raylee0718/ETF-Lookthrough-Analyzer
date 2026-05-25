import type { EtfConstituent } from "./portfolio";

export type EtfHoldingsProxySymbol = "0050" | "00646" | "00981A" | "00994A";

export type EtfHoldingsProxyStatus = "ok" | "partial" | "failed";

export type EtfHoldingsProxyDebugAttempt = {
  variantName: string;
  requestUrl: string;
  method: string;
  responseStatus?: number;
  responseContentType?: string;
  responseTextPreview?: string;
  redirectLocation?: string;
  setCookieReceived?: boolean;
  fetchErrorName?: string;
  fetchErrorMessage?: string;
  fetchErrorCauseName?: string;
  fetchErrorCauseCode?: string;
  fetchErrorCauseMessage?: string;
  beforeResponse: boolean;
};

export type EtfHoldingsProxyDebug = {
  attempts: EtfHoldingsProxyDebugAttempt[];
  recommendation?: string;
  requestDateLabel?: string;
  requestVariant?: string;
  officialAsOfDate?: string;
};

export type EtfHoldingsProxyResponse = {
  symbol: EtfHoldingsProxySymbol;
  status: EtfHoldingsProxyStatus;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  asOfDate?: string;
  cacheControl?: string;
  cacheNote?: string;
  refreshRequested?: boolean;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
  debug?: EtfHoldingsProxyDebug;
};
