import type { EtfConstituent } from "./portfolio";

export type EtfHoldingsProxySymbol = "0050" | "00981A" | "00994A";

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
};

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
  debug?: EtfHoldingsProxyDebug;
};
