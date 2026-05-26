type MarketPriceResult = {
  symbol: string;
  name?: string;
  price?: number;
  priceDate?: string;
  source?: string;
  status: "ok" | "failed";
  warning?: string;
  error?: string;
};

type MarketPricesResponse = {
  status: "ok" | "partial" | "failed";
  fetchedAt: string;
  requestedSymbols: string[];
  source: string;
  cacheControl?: string;
  prices: MarketPriceResult[];
  warnings: string[];
  errors: string[];
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

type ProviderRow = Record<string, unknown>;

type ParsedPrice = {
  symbol: string;
  name?: string;
  price: number;
  priceDate: string;
  source: string;
};

const TWSE_DAILY_CLOSE_URL =
  "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
const TPEX_DAILY_CLOSE_URL =
  "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes";
const CACHE_CONTROL = "s-maxage=900, stale-while-revalidate=1800";
const MAX_SYMBOLS = 40;
const VALID_SYMBOL_PATTERN = /^[0-9A-Z.-]{1,12}$/;
const INVALID_PRICE_VALUES = new Set(["", "--", "---", "----", "N/A", "NA"]);

const isProviderRow = (value: unknown): value is ProviderRow =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getRowsFromResponse = (data: unknown): ProviderRow[] => {
  if (Array.isArray(data)) {
    return data.filter(isProviderRow);
  }

  if (isProviderRow(data) && Array.isArray(data.value)) {
    return data.value.filter(isProviderRow);
  }

  return [];
};

const getStringField = (row: ProviderRow, fieldNames: string[]) => {
  for (const fieldName of fieldNames) {
    const value = row[fieldName];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
};

const parsePrice = (value: string) => {
  const normalizedValue = value.replace(/,/g, "").trim();

  if (INVALID_PRICE_VALUES.has(normalizedValue.toUpperCase())) {
    return undefined;
  }

  const price = Number(normalizedValue);
  return Number.isFinite(price) && price > 0 ? price : undefined;
};

const parseProviderDate = (value: string) => {
  const normalizedValue = value.replace(/\D/g, "");

  if (/^\d{8}$/.test(normalizedValue)) {
    return `${normalizedValue.slice(0, 4)}-${normalizedValue.slice(
      4,
      6,
    )}-${normalizedValue.slice(6, 8)}`;
  }

  if (/^\d{7}$/.test(normalizedValue)) {
    const year = Number(normalizedValue.slice(0, 3)) + 1911;
    return `${year}-${normalizedValue.slice(3, 5)}-${normalizedValue.slice(
      5,
      7,
    )}`;
  }

  if (/^\d{6}$/.test(normalizedValue)) {
    const year = Number(normalizedValue.slice(0, 2)) + 1911;
    return `${year}-${normalizedValue.slice(2, 4)}-${normalizedValue.slice(
      4,
      6,
    )}`;
  }

  return "";
};

const parseSymbols = (rawSymbols: string | string[] | undefined) => {
  const joinedSymbols = Array.isArray(rawSymbols)
    ? rawSymbols.join(",")
    : rawSymbols ?? "";
  const symbols = Array.from(
    new Set(
      joinedSymbols
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  if (symbols.length === 0) {
    return {
      symbols,
      errors: ["請提供 symbols 參數，例如 symbols=0050,2330。"],
    };
  }

  if (symbols.length > MAX_SYMBOLS) {
    return {
      symbols,
      errors: [`一次最多更新 ${MAX_SYMBOLS} 個代號。`],
    };
  }

  const invalidSymbols = symbols.filter(
    (symbol) => !VALID_SYMBOL_PATTERN.test(symbol),
  );

  if (invalidSymbols.length > 0) {
    return {
      symbols,
      errors: [`代號格式無法辨識：${invalidSymbols.join("、")}`],
    };
  }

  return { symbols, errors: [] };
};

const fetchProviderJson = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ETF-Lookthrough-Analyzer/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<unknown>;
};

const parseRowsToPriceMap = (
  rows: ProviderRow[],
  source: string,
): Map<string, ParsedPrice> => {
  const priceMap = new Map<string, ParsedPrice>();

  rows.forEach((row) => {
    const symbol = getStringField(row, [
      "Code",
      "SecuritiesCompanyCode",
      "證券代號",
      "代號",
      "股票代號",
    ]).toUpperCase();
    const name = getStringField(row, [
      "Name",
      "CompanyName",
      "證券名稱",
      "名稱",
      "股票名稱",
    ]);
    const price = parsePrice(
      getStringField(row, [
        "ClosingPrice",
        "Close",
        "收盤價",
        "收盤",
        "最後成交價",
      ]),
    );
    const priceDate = parseProviderDate(
      getStringField(row, ["Date", "日期", "資料日期"]),
    );

    if (!symbol || !price || !priceDate) {
      return;
    }

    priceMap.set(symbol, {
      symbol,
      name: name || undefined,
      price,
      priceDate,
      source,
    });
  });

  return priceMap;
};

const fetchOfficialClosingPriceMap = async () => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const priceMap = new Map<string, ParsedPrice>();

  await Promise.all(
    [
      { url: TWSE_DAILY_CLOSE_URL, source: "TWSE OpenAPI" },
      { url: TPEX_DAILY_CLOSE_URL, source: "TPEx OpenAPI" },
    ].map(async (provider) => {
      try {
        const data = await fetchProviderJson(provider.url);
        const rows = getRowsFromResponse(data);

        if (rows.length === 0) {
          warnings.push(`${provider.source} 未回傳可用資料。`);
          return;
        }

        parseRowsToPriceMap(rows, provider.source).forEach((price, symbol) => {
          priceMap.set(symbol, price);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${provider.source} 抓取失敗：${message}`);
      }
    }),
  );

  return { priceMap, warnings, errors };
};

const createResponse = (
  status: MarketPricesResponse["status"],
  requestedSymbols: string[],
  prices: MarketPriceResult[],
  warnings: string[],
  errors: string[],
  fetchedAt: string,
): MarketPricesResponse => ({
  status,
  fetchedAt,
  requestedSymbols,
  source: "TWSE / TPEx official closing price OpenAPI",
  cacheControl: CACHE_CONTROL,
  prices,
  warnings,
  errors,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const fetchedAt = new Date().toISOString();

  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json(
      createResponse(
        "failed",
        [],
        [],
        [],
        ["只支援 GET 請求。"],
        fetchedAt,
      ),
    );
  }

  const { symbols, errors: symbolErrors } = parseSymbols(req.query.symbols);

  if (symbolErrors.length > 0) {
    return res.status(400).json(
      createResponse("failed", symbols, [], [], symbolErrors, fetchedAt),
    );
  }

  res.setHeader("Cache-Control", CACHE_CONTROL);

  const {
    priceMap,
    warnings: providerWarnings,
    errors: providerErrors,
  } = await fetchOfficialClosingPriceMap();

  const prices = symbols.map<MarketPriceResult>((symbol) => {
    const price = priceMap.get(symbol);

    if (!price) {
      return {
        symbol,
        status: "failed",
        warning: "未取得最近收盤價。",
      };
    }

    return {
      symbol,
      name: price.name,
      price: price.price,
      priceDate: price.priceDate,
      source: price.source,
      status: "ok",
    };
  });
  const okCount = prices.filter((price) => price.status === "ok").length;
  const status =
    okCount === symbols.length ? "ok" : okCount > 0 ? "partial" : "failed";
  const missingSymbols = prices
    .filter((price) => price.status !== "ok")
    .map((price) => price.symbol);
  const warnings = [...providerWarnings];

  if (missingSymbols.length > 0) {
    warnings.push(`未取得價格：${missingSymbols.join("、")}`);
  }

  const response = createResponse(
    status,
    symbols,
    prices,
    warnings,
    providerErrors,
    fetchedAt,
  );

  const providerUnavailable =
    okCount === 0 && providerErrors.length > 0 && priceMap.size === 0;

  return res.status(providerUnavailable ? 502 : 200).json(response);
}
