type EtfHoldingsProxySymbol = "0050" | "00646" | "00981A" | "00994A";

type EtfConstituent = {
  id: string;
  etfSymbol: string;
  stockSymbol: string;
  stockName: string;
  weightPercent: number;
  industry?: string;
  underlyingMarket?: "TW" | "US" | "OTHER" | "UNKNOWN";
  asOfDate?: string;
  source?: string;
};

type EtfHoldingsProxyResponse = {
  symbol: EtfHoldingsProxySymbol;
  status: "ok" | "partial" | "failed";
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

type EtfHoldingsProxyDebugAttempt = {
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

type EtfHoldingsProxyDebug = {
  attempts: EtfHoldingsProxyDebugAttempt[];
  recommendation?: string;
};

type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

type ParsedHoldings = {
  asOfDate?: string;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
  debug?: EtfHoldingsProxyDebug;
};

type UniPresidentPcfDetail = {
  DetailCode?: unknown;
  DetailName?: unknown;
  NavRate?: unknown;
  TranDate?: unknown;
};

type UniPresidentPcfAsset = {
  AssetCode?: unknown;
  Details?: unknown;
};

type UniPresidentPcfResponse = {
  pcf?: unknown;
  asset?: unknown;
  Data?: unknown;
};

type FirstGetHdRow = {
  sdate?: unknown;
  group?: unknown;
  A?: unknown;
  B?: unknown;
  C?: unknown;
};

type YuantaPcfStockWeight = {
  code?: unknown;
  stkcd?: unknown;
  name?: unknown;
  ename?: unknown;
  weights?: unknown;
  weight?: unknown;
};

type YuantaPcfCash = {
  CashPosition?: unknown;
  Margin?: unknown;
};

type YuantaPcfResponse = {
  Data?: unknown;
  PCF?: {
    trandate?: unknown;
    anndate?: unknown;
    upddate?: unknown;
  };
  FundWeights?: {
    StockWeights?: YuantaPcfStockWeight[];
    FutureWeights?: unknown;
    ETFWeights?: unknown;
    BondWeights?: unknown;
  };
  Cash?: YuantaPcfCash;
};

const YUANTA_0050_PCF_DAILY_URL =
  "https://etfapi.yuantaetfs.com/ectranslation/api/bridge?APIType=ETFAPI&CompanyName=YUANTAFUNDS&PageName=%2FtradeInfo%2Fpcf%2F0050&DeviceId=null&FuncId=PCF%2FDaily&AppName=ETF&Device=3&Platform=ETF&ticker=0050&ndate=";
const YUANTA_00646_PCF_DAILY_URL =
  "https://etfapi.yuantaetfs.com/ectranslation/api/bridge?APIType=ETFAPI&CompanyName=YUANTAFUNDS&PageName=%2FtradeInfo%2Fpcf%2F00646&DeviceId=null&FuncId=PCF%2FDaily&AppName=ETF&Device=3&Platform=ETF&ticker=00646&ndate=";
const UPAMC_00981A_GET_PCF_URL =
  "https://www.ezmoney.com.tw/ETF/Transaction/GetPCF";
const FSITC_00994A_GET_HD_URL =
  "https://www.fsitc.com.tw/WebAPI.aspx/Get_hd";

const SUPPORTED_SYMBOLS = new Set<EtfHoldingsProxySymbol>([
  "0050",
  "00646",
  "00981A",
  "00994A",
]);

const SOURCE_LABELS: Record<EtfHoldingsProxySymbol, string> = {
  "0050": "Yuanta 0050 official PCF/Daily JSON",
  "00646": "Yuanta 00646 official PCF/Daily JSON",
  "00981A": "Uni-President 00981A official PCF",
  "00994A": "FSITC 00994A official holdings",
};

const SOURCE_URLS: Record<EtfHoldingsProxySymbol, string> = {
  "0050": YUANTA_0050_PCF_DAILY_URL,
  "00646": YUANTA_00646_PCF_DAILY_URL,
  "00981A": UPAMC_00981A_GET_PCF_URL,
  "00994A": FSITC_00994A_GET_HD_URL,
};

const JSON_HEADERS = {
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Content-Type": "application/json; charset=utf-8",
  "X-Requested-With": "XMLHttpRequest",
};

const getSymbol = (value: string | string[] | undefined) => {
  const rawSymbol = Array.isArray(value) ? value[0] : value;
  return rawSymbol?.trim().toUpperCase();
};

const isRefreshRequested = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "1" || rawValue?.toLowerCase() === "true";
};

const getMinguoDate = (date = new Date()) => {
  const taipeiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = taipeiDate.split("-");

  return `${Number(year) - 1911}/${month}/${day}`;
};

const formatCompactDate = (value: string) => {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
};

const normalizeDateString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  const isoDate = normalized.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  const compactDate = formatCompactDate(normalized);
  if (compactDate) {
    return compactDate;
  }

  const minguoDate = normalized.match(/^(\d{3})\/(\d{2})\/(\d{2})$/);
  if (minguoDate) {
    return `${Number(minguoDate[1]) + 1911}-${minguoDate[2]}-${minguoDate[3]}`;
  }

  return undefined;
};

const normalizeStockSymbol = (value: string) => {
  const symbol = value
    .trim()
    .toUpperCase()
    .replace(/\.(TW|TWO|TT|TPE)$/i, "");
  const match = symbol.match(/^\d{4,6}[A-Z]?/);
  return match?.[0] ?? "";
};

const parseWeight = (value: unknown) => {
  const weight = Number(
    String(value ?? "")
      .replace("%", "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(weight) && weight > 0 ? weight : undefined;
};

const parseNonNegativeWeight = (value: unknown) => {
  const weight = Number(
    String(value ?? "")
      .replace("%", "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(weight) && weight >= 0 ? weight : undefined;
};

const normalizeImported00646StockSymbol = (value: string) => {
  let symbol = value.trim().toUpperCase().replace(/\s+/g, " ");

  if (!symbol) {
    return symbol;
  }

  symbol = symbol.replace(/^([A-Z0-9./-]+)\s+(UQ|UN|UF)$/u, "$1");

  if (/^[A-Z]{1,5}\/[A-Z]{1,2}$/.test(symbol)) {
    symbol = symbol.replace("/", ".");
  }

  return symbol;
};

const hasSuspiciousImportedTicker = (symbol: string) =>
  /\s/.test(symbol) || /[^A-Z0-9.-]/.test(symbol);

const parseJson = (raw: unknown) => {
  if (typeof raw !== "string") {
    return raw;
  }

  return JSON.parse(raw);
};

const fetchText = async (
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000,
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `Official source returned HTTP ${response.status}: ${text.slice(0, 160)}`,
      );
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
};

const getErrorCause = (error: unknown) => {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const cause = error.cause;
  return cause && typeof cause === "object"
    ? (cause as {
        name?: string;
        code?: string;
        message?: string;
      })
    : undefined;
};

const getSetCookiePair = (setCookie: string | null) => {
  if (!setCookie) {
    return undefined;
  }

  return setCookie.split(";")[0];
};

const appendCookie = (currentCookie: string | undefined, setCookie: string | null) => {
  const cookiePair = getSetCookiePair(setCookie);

  if (!cookiePair) {
    return currentCookie;
  }

  return currentCookie ? `${currentCookie}; ${cookiePair}` : cookiePair;
};

const fetchTextWithCookieRedirectDiagnostics = async ({
  variantName,
  url,
  init,
  attempts,
  timeoutMs = 15000,
  maxRedirects = 2,
}: {
  variantName: string;
  url: string;
  init: RequestInit;
  attempts: EtfHoldingsProxyDebugAttempt[];
  timeoutMs?: number;
  maxRedirects?: number;
}) => {
  let cookie: string | undefined;

  for (let redirectIndex = 0; redirectIndex <= maxRedirects; redirectIndex += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(init.headers);

    if (cookie) {
      headers.set("Cookie", cookie);
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        redirect: "manual",
        signal: controller.signal,
      });
      const text = await response.text();
      const setCookie = response.headers.get("set-cookie");
      const location = response.headers.get("location") ?? undefined;

      attempts.push({
        variantName,
        requestUrl: url,
        method: init.method ?? "GET",
        responseStatus: response.status,
        responseContentType: response.headers.get("content-type") ?? undefined,
        responseTextPreview: text.slice(0, 240),
        redirectLocation: location,
        setCookieReceived: Boolean(setCookie),
        beforeResponse: false,
      });

      if (
        response.status >= 300 &&
        response.status < 400 &&
        location === url &&
        setCookie
      ) {
        cookie = appendCookie(cookie, setCookie);
        continue;
      }

      if (!response.ok) {
        throw new Error(
          `Official source returned HTTP ${response.status}: ${text.slice(0, 160)}`,
        );
      }

      return text;
    } catch (error) {
      const cause = getErrorCause(error);

      attempts.push({
        variantName,
        requestUrl: url,
        method: init.method ?? "GET",
        fetchErrorName: error instanceof Error ? error.name : undefined,
        fetchErrorMessage: error instanceof Error ? error.message : String(error),
        fetchErrorCauseName: cause?.name,
        fetchErrorCauseCode: cause?.code,
        fetchErrorCauseMessage: cause?.message,
        beforeResponse: true,
      });

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(
    `${variantName} exceeded ${maxRedirects} same-URL cookie redirects.`,
  );
};

const parseYuanta0050PcfResponse = (raw: string): ParsedHoldings => {
  const warnings: string[] = [];
  let parsedJson: YuantaPcfResponse;

  try {
    parsedJson = JSON.parse(raw) as YuantaPcfResponse;
  } catch {
    return {
      constituents: [],
      warnings,
      errors: ["Yuanta 0050 PCF/Daily response was not valid JSON."],
    };
  }

  const data = (parsedJson.Data ?? parsedJson) as YuantaPcfResponse;
  const asOfDate =
    typeof data.PCF?.trandate === "string"
      ? formatCompactDate(data.PCF.trandate)
      : undefined;
  const stockWeights = Array.isArray(data.FundWeights?.StockWeights)
    ? data.FundWeights.StockWeights
    : [];

  if (!asOfDate) {
    warnings.push("Could not determine 0050 asOfDate from PCF/Daily JSON.");
  }

  const constituents = stockWeights.flatMap((row, index): EtfConstituent[] => {
    const stockSymbol = normalizeStockSymbol(String(row.code ?? row.stkcd ?? ""));
    const stockName = String(row.name ?? "").trim();
    const weightPercent = parseWeight(row.weights ?? row.weight);

    if (!stockSymbol || !stockName || !weightPercent) {
      warnings.push(`Skipped invalid 0050 PCF stock row ${index + 1}.`);
      return [];
    }

    return [
      {
        id: `provider-proxy-0050-${stockSymbol}-${index}`,
        etfSymbol: "0050",
        stockSymbol,
        stockName,
        weightPercent,
        asOfDate,
        source: SOURCE_LABELS["0050"],
      },
    ];
  });

  return {
    asOfDate,
    constituents,
    warnings,
    errors:
      constituents.length > 0
        ? []
        : ["Yuanta 0050 PCF/Daily JSON did not contain parseable weighted holdings."],
  };
};

const countArrayRows = (value: unknown) => (Array.isArray(value) ? value.length : 0);

const getYuanta00646AsOfDate = (data: YuantaPcfResponse) =>
  [data.PCF?.trandate, data.PCF?.anndate, data.PCF?.upddate]
    .map(normalizeDateString)
    .find(Boolean);

const parseYuanta00646PcfResponse = (raw: string): ParsedHoldings => {
  const warnings: string[] = [];
  const errors: string[] = [];
  let parsedJson: YuantaPcfResponse;

  try {
    parsedJson = JSON.parse(raw) as YuantaPcfResponse;
  } catch {
    return {
      constituents: [],
      warnings,
      errors: ["Yuanta 00646 PCF/Daily response was not valid JSON."],
    };
  }

  const data = (parsedJson.Data ?? parsedJson) as YuantaPcfResponse;
  const asOfDate = getYuanta00646AsOfDate(data);
  const stockWeights = Array.isArray(data.FundWeights?.StockWeights)
    ? data.FundWeights.StockWeights
    : [];
  const ignoredNonStockRows = {
    futures: countArrayRows(data.FundWeights?.FutureWeights),
    cash: countArrayRows(data.Cash?.CashPosition),
    margin: countArrayRows(data.Cash?.Margin),
  };

  if (!asOfDate) {
    warnings.push("Could not determine 00646 asOfDate from PCF/Daily JSON.");
  }

  if (stockWeights.length === 0) {
    errors.push("Yuanta 00646 PCF/Daily JSON did not contain FundWeights.StockWeights.");
  }

  if (
    ignoredNonStockRows.futures > 0 ||
    ignoredNonStockRows.cash > 0 ||
    ignoredNonStockRows.margin > 0
  ) {
    warnings.push(
      `Ignored non-stock 00646 rows: futures ${ignoredNonStockRows.futures}, cash ${ignoredNonStockRows.cash}, margin ${ignoredNonStockRows.margin}.`,
    );
  }

  const constituents = stockWeights.flatMap((row, index): EtfConstituent[] => {
    const rawSymbol = String(row.code ?? row.stkcd ?? "");
    const stockSymbol = normalizeImported00646StockSymbol(rawSymbol);
    const stockName = String(row.name ?? row.ename ?? "").trim();
    const weightPercent = parseNonNegativeWeight(row.weights ?? row.weight);

    if (!stockSymbol || !stockName || weightPercent === undefined) {
      warnings.push(`Skipped invalid 00646 PCF stock row ${index + 1}.`);
      return [];
    }

    if (hasSuspiciousImportedTicker(stockSymbol)) {
      warnings.push(`00646 ticker may still need review: ${stockSymbol}.`);
    }

    return [
      {
        id: `provider-proxy-00646-${stockSymbol}-${index}`,
        etfSymbol: "00646",
        stockSymbol,
        stockName,
        weightPercent,
        underlyingMarket: "US",
        asOfDate,
        source: SOURCE_LABELS["00646"],
      },
    ];
  });

  if (stockWeights.length > 0 && constituents.length === 0) {
    errors.push("Yuanta 00646 PCF/Daily JSON had stock rows but no valid weights.");
  }

  return {
    asOfDate,
    constituents,
    warnings,
    errors,
  };
};

const parseUniPresident00981APcfResponse = (raw: string): ParsedHoldings => {
  const warnings: string[] = [];
  const errors: string[] = [];
  let parsedJson: UniPresidentPcfResponse;

  try {
    parsedJson = parseJson(raw) as UniPresidentPcfResponse;
  } catch {
    return {
      constituents: [],
      warnings,
      errors: ["00981A PCF response was not valid JSON."],
    };
  }

  const data = (parsedJson.Data ?? parsedJson) as UniPresidentPcfResponse;
  const assets = Array.isArray(data.asset) ? (data.asset as UniPresidentPcfAsset[]) : [];
  const stockAsset = assets.find((asset) => String(asset.AssetCode ?? "") === "ST");
  const stockDetails = Array.isArray(stockAsset?.Details)
    ? (stockAsset.Details as UniPresidentPcfDetail[])
    : [];
  const firstDetailDate = stockDetails
    .map((row) => normalizeDateString(row.TranDate))
    .find(Boolean);
  const pcfRows = Array.isArray(data.pcf) ? (data.pcf as Array<Record<string, unknown>>) : [];
  const asOfDate =
    firstDetailDate ??
    pcfRows
      .flatMap((row) => [row.TranDate, row.tranDate, row.PostDate, row.postDate])
      .map(normalizeDateString)
      .find(Boolean);

  if (stockDetails.length === 0) {
    errors.push("00981A PCF JSON did not contain asset[AssetCode=ST].Details.");
  }

  if (!asOfDate) {
    warnings.push("Could not determine 00981A asOfDate from PCF JSON.");
  }

  const constituents = stockDetails.flatMap((row, index): EtfConstituent[] => {
    const stockSymbol = normalizeStockSymbol(String(row.DetailCode ?? ""));
    const stockName = String(row.DetailName ?? "").trim();
    const weightPercent = parseWeight(row.NavRate);

    if (!stockSymbol || !stockName || !weightPercent) {
      warnings.push(`Skipped invalid 00981A PCF stock row ${index + 1}.`);
      return [];
    }

    return [
      {
        id: `provider-proxy-00981A-${stockSymbol}-${index}`,
        etfSymbol: "00981A",
        stockSymbol,
        stockName,
        weightPercent,
        asOfDate,
        source: SOURCE_LABELS["00981A"],
      },
    ];
  });

  if (stockDetails.length > 0 && constituents.length === 0) {
    errors.push("00981A PCF JSON had stock rows but no valid NavRate weights.");
  }

  return {
    asOfDate,
    constituents,
    warnings,
    errors,
  };
};

const parseFirst00994AGetHdResponse = (raw: string): ParsedHoldings => {
  const warnings: string[] = [];
  const errors: string[] = [];
  let rows: FirstGetHdRow[] = [];

  try {
    const outer = parseJson(raw) as { d?: unknown } | FirstGetHdRow[];
    const innerData = Array.isArray(outer) ? outer : outer.d;

    if (typeof innerData === "string") {
      const parsedInner = parseJson(innerData);
      rows = Array.isArray(parsedInner) ? (parsedInner as FirstGetHdRow[]) : [];
    } else {
      rows = Array.isArray(innerData) ? (innerData as FirstGetHdRow[]) : [];
    }
  } catch {
    return {
      constituents: [],
      warnings,
      errors: ["00994A Get_hd response was not valid JSON."],
    };
  }

  const stockRows = rows.filter((row) => String(row.group ?? "").trim() === "1");
  const asOfDate = (stockRows.length > 0 ? stockRows : rows)
    .map((row) => normalizeDateString(row.sdate))
    .find(Boolean);

  if (rows.length === 0) {
    errors.push("00994A Get_hd JSON did not contain parseable rows.");
  }

  if (rows.length > 0 && stockRows.length === 0) {
    errors.push("00994A Get_hd JSON did not contain group=1 stock rows.");
  }

  if (!asOfDate) {
    warnings.push("Could not determine 00994A asOfDate from Get_hd JSON.");
  }

  const constituents = stockRows.flatMap((row, index): EtfConstituent[] => {
    const stockSymbol = normalizeStockSymbol(String(row.A ?? ""));
    const stockName = String(row.B ?? "").trim();
    const weightPercent = parseWeight(row.C);

    if (!stockSymbol || !stockName || !weightPercent) {
      warnings.push(`Skipped invalid 00994A Get_hd stock row ${index + 1}.`);
      return [];
    }

    return [
      {
        id: `provider-proxy-00994A-${stockSymbol}-${index}`,
        etfSymbol: "00994A",
        stockSymbol,
        stockName,
        weightPercent,
        asOfDate,
        source: SOURCE_LABELS["00994A"],
      },
    ];
  });

  if (stockRows.length > 0 && constituents.length === 0) {
    errors.push("00994A Get_hd JSON had stock rows but no valid C column weights.");
  }

  return {
    asOfDate,
    constituents,
    warnings,
    errors,
  };
};

const getStatus = (parsed: ParsedHoldings): EtfHoldingsProxyResponse["status"] => {
  if (parsed.errors.length > 0 && parsed.constituents.length === 0) {
    return "failed";
  }

  if (parsed.errors.length > 0 || parsed.warnings.length > 0) {
    return "partial";
  }

  return "ok";
};

const buildResponse = (
  symbol: EtfHoldingsProxySymbol,
  parsed: ParsedHoldings,
  options: {
    cacheControl: string;
    refreshRequested: boolean;
  },
): EtfHoldingsProxyResponse => ({
  symbol,
  status: getStatus(parsed),
  source: SOURCE_LABELS[symbol],
  sourceUrl: SOURCE_URLS[symbol],
  fetchedAt: new Date().toISOString(),
  asOfDate: parsed.asOfDate,
  cacheControl: options.cacheControl,
  cacheNote: options.refreshRequested
    ? "Force refresh requested; response sent with no-store cache header."
    : "Normal proxy requests may be cached briefly by Vercel/CDN. Official asOfDate can still lag today if the issuer has not published new data.",
  refreshRequested: options.refreshRequested,
  constituents: parsed.constituents,
  warnings: parsed.warnings,
  errors: parsed.errors,
  debug: parsed.debug,
});

const fetch0050 = async () => {
  const raw = await fetchText(YUANTA_0050_PCF_DAILY_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  return parseYuanta0050PcfResponse(raw);
};

const fetch00646 = async () => {
  const raw = await fetchText(YUANTA_00646_PCF_DAILY_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  return parseYuanta00646PcfResponse(raw);
};

const fetch00981A = async (): Promise<ParsedHoldings> => {
  const attempts: EtfHoldingsProxyDebugAttempt[] = [];
  const minguoDate = getMinguoDate();
  const baseHeaders = {
    ...JSON_HEADERS,
    Referer: "https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=49YTW",
    Origin: "https://www.ezmoney.com.tw",
    "User-Agent": "Mozilla/5.0 ETF-Lookthrough-Analyzer/0.1",
  };
  const variants: Array<{
    name: string;
    init: RequestInit;
  }> = [
    {
      name: "json-current-date-cookie-redirect",
      init: {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({
          fundCode: "49YTW",
          date: minguoDate,
          specificDate: true,
        }),
      },
    },
    {
      name: "json-empty-date-cookie-redirect",
      init: {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({
          fundCode: "49YTW",
          date: "",
          specificDate: false,
        }),
      },
    },
    {
      name: "json-no-date-cookie-redirect",
      init: {
        method: "POST",
        headers: baseHeaders,
        body: JSON.stringify({
          fundCode: "49YTW",
        }),
      },
    },
    {
      name: "form-current-date-cookie-redirect",
      init: {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        body: new URLSearchParams({
          fundCode: "49YTW",
          date: minguoDate,
          specificDate: "true",
        }).toString(),
      },
    },
  ];
  const parseFailures: string[] = [];

  for (const variant of variants) {
    try {
      const raw = await fetchTextWithCookieRedirectDiagnostics({
        variantName: variant.name,
        url: UPAMC_00981A_GET_PCF_URL,
        init: variant.init,
        attempts,
      });
      const parsed = parseUniPresident00981APcfResponse(raw);

      if (parsed.constituents.length > 0 && parsed.errors.length === 0) {
        return parsed;
      }

      parseFailures.push(`${variant.name}: ${parsed.errors.join("; ") || "no valid constituents"}`);
    } catch {
      continue;
    }
  }

  return {
    constituents: [],
    warnings: [],
    errors: [
      "Uni-President 00981A official PCF fetch failed for all tested request variants.",
      ...parseFailures,
    ],
    debug: {
      attempts,
      recommendation:
        "The official endpoint may require its same-URL 307 cookie challenge to succeed from the runtime. If all variants fail on Vercel, keep 00981A on CSV fallback or evaluate an alternate serverless runtime.",
    },
  };
};

const fetch00994A = async () => {
  const raw = await fetchText(FSITC_00994A_GET_HD_URL, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Referer: "https://www.fsitc.com.tw/FundDetail.aspx?ID=182",
    },
    body: JSON.stringify({
      pStrFundID: "182",
      pStrDate: "",
    }),
  });

  return parseFirst00994AGetHdResponse(raw);
};

const fetchBySymbol = (symbol: EtfHoldingsProxySymbol) => {
  if (symbol === "0050") {
    return fetch0050();
  }

  if (symbol === "00646") {
    return fetch00646();
  }

  if (symbol === "00981A") {
    return fetch00981A();
  }

  return fetch00994A();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const refreshRequested = isRefreshRequested(req.query.refresh);
  const cacheControl = refreshRequested
    ? "no-store"
    : "s-maxage=1800, stale-while-revalidate=1800";

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({
      status: "failed",
      errors: ["Method not allowed. Use GET."],
    });
    return;
  }

  const symbol = getSymbol(req.query.symbol);

  if (!symbol || !SUPPORTED_SYMBOLS.has(symbol as EtfHoldingsProxySymbol)) {
    res.status(400).json({
      status: "failed",
      errors: ["Unsupported ETF symbol. Supported symbols: 0050, 00646, 00981A, 00994A."],
    });
    return;
  }

  const typedSymbol = symbol as EtfHoldingsProxySymbol;

  try {
    const parsed = await fetchBySymbol(typedSymbol);
    const failed = parsed.errors.length > 0 && parsed.constituents.length === 0;

    res.status(failed ? 502 : 200).json(
      buildResponse(typedSymbol, parsed, {
        cacheControl,
        refreshRequested,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error while fetching official ETF holdings source.";

    res.status(502).json(
      buildResponse(
        typedSymbol,
        {
          constituents: [],
          warnings: [],
          errors: [
            `${SOURCE_LABELS[typedSymbol]} fetch failed. ${message}`,
            typedSymbol === "00981A"
              ? "00981A may be blocked by issuer network policy from the serverless runtime; this should not block 0050, 00646, or 00994A."
              : "",
          ].filter(Boolean),
          debug:
            typedSymbol === "00981A"
              ? {
                  attempts: [
                    {
                      variantName: "handler-catch",
                      requestUrl: SOURCE_URLS[typedSymbol],
                      method: "POST",
                      fetchErrorName: error instanceof Error ? error.name : undefined,
                      fetchErrorMessage:
                        error instanceof Error ? error.message : String(error),
                      fetchErrorCauseName: getErrorCause(error)?.name,
                      fetchErrorCauseCode: getErrorCause(error)?.code,
                      fetchErrorCauseMessage: getErrorCause(error)?.message,
                      beforeResponse: true,
                    },
                  ],
                  recommendation:
                    "Inspect the 00981A request variant diagnostics. Keep CSV fallback if the issuer blocks the Vercel runtime.",
                }
              : undefined,
        },
        {
          cacheControl,
          refreshRequested,
        },
      ),
    );
  }
}
