import {
  FSITC_00994A_GET_HD_URL,
  parseFirst00994AGetHdResponse,
  parseUniPresident00981APcfResponse,
  parseYuanta0050PcfResponse,
  UPAMC_00981A_GET_PCF_URL,
} from "../src/lib/taiwanEtfProviders";
import type {
  EtfHoldingsProxyResponse,
  EtfHoldingsProxySymbol,
} from "../src/types/etfHoldingsProxy";
import type { EtfConstituent } from "../src/types/portfolio";

type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
  end: () => void;
};

type ParsedHoldings = {
  asOfDate?: string;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
};

const YUANTA_0050_PCF_DAILY_URL =
  "https://etfapi.yuantaetfs.com/ectranslation/api/bridge?APIType=ETFAPI&CompanyName=YUANTAFUNDS&PageName=%2FtradeInfo%2Fpcf%2F0050&DeviceId=null&FuncId=PCF%2FDaily&AppName=ETF&Device=3&Platform=ETF&ticker=0050&ndate=";

const SUPPORTED_SYMBOLS = new Set<EtfHoldingsProxySymbol>([
  "0050",
  "00981A",
  "00994A",
]);

const SOURCE_LABELS: Record<EtfHoldingsProxySymbol, string> = {
  "0050": "Yuanta 0050 official PCF/Daily JSON",
  "00981A": "Uni-President 00981A official PCF",
  "00994A": "FSITC 00994A official holdings",
};

const SOURCE_URLS: Record<EtfHoldingsProxySymbol, string> = {
  "0050": YUANTA_0050_PCF_DAILY_URL,
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
      throw new Error(`Official source returned HTTP ${response.status}: ${text.slice(0, 160)}`);
    }

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
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
): EtfHoldingsProxyResponse => ({
  symbol,
  status: getStatus(parsed),
  source: SOURCE_LABELS[symbol],
  sourceUrl: SOURCE_URLS[symbol],
  fetchedAt: new Date().toISOString(),
  asOfDate: parsed.asOfDate,
  constituents: parsed.constituents,
  warnings: parsed.warnings,
  errors: parsed.errors,
});

const fetch0050 = async (): Promise<ParsedHoldings> => {
  const raw = await fetchText(YUANTA_0050_PCF_DAILY_URL, {
    headers: {
      Accept: "application/json",
    },
  });
  const parsed = parseYuanta0050PcfResponse(raw);

  return {
    asOfDate: parsed.asOfDate,
    constituents: parsed.constituents,
    warnings: parsed.warnings,
    errors:
      parsed.constituents.length > 0
        ? []
        : ["Yuanta 0050 PCF/Daily JSON did not contain parseable weighted holdings."],
  };
};

const fetch00981A = async (): Promise<ParsedHoldings> => {
  const raw = await fetchText(UPAMC_00981A_GET_PCF_URL, {
    method: "POST",
    headers: {
      ...JSON_HEADERS,
      Referer: "https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=49YTW",
    },
    body: JSON.stringify({
      fundCode: "49YTW",
      date: getMinguoDate(),
      specificDate: true,
    }),
  });

  return parseUniPresident00981APcfResponse(raw, {
    etfSymbol: "00981A",
    source: SOURCE_LABELS["00981A"],
  });
};

const fetch00994A = async (): Promise<ParsedHoldings> => {
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

  return parseFirst00994AGetHdResponse(raw, {
    etfSymbol: "00994A",
    source: SOURCE_LABELS["00994A"],
  });
};

const fetchBySymbol = (symbol: EtfHoldingsProxySymbol) => {
  if (symbol === "0050") {
    return fetch0050();
  }

  if (symbol === "00981A") {
    return fetch00981A();
  }

  return fetch00994A();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=1800");

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
      errors: ["Unsupported ETF symbol. Supported symbols: 0050, 00981A, 00994A."],
    });
    return;
  }

  try {
    const typedSymbol = symbol as EtfHoldingsProxySymbol;
    const parsed = await fetchBySymbol(typedSymbol);

    res.status(parsed.errors.length > 0 && parsed.constituents.length === 0 ? 502 : 200).json(
      buildResponse(typedSymbol, parsed),
    );
  } catch (error) {
    const typedSymbol = symbol as EtfHoldingsProxySymbol;
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error while fetching official ETF holdings source.";

    res.status(502).json(
      buildResponse(typedSymbol, {
        constituents: [],
        warnings: [],
        errors: [message],
      }),
    );
  }
}
