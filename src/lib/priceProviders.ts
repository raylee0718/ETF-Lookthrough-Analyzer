import type { PriceRecordInput } from "../hooks/usePriceRecords";
import type {
  FetchedPrice,
  PriceProviderMarket,
  PriceProviderResult,
} from "../types/priceProvider";

const TWSE_DAILY_CLOSE_URL =
  "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL";
const TPEX_DAILY_CLOSE_URL =
  "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes";

const INVALID_PRICE_VALUES = new Set(["", "--", "---", "----", "N/A", "NA"]);

type ProviderRow = Record<string, unknown>;

const getRowsFromResponse = (data: unknown): ProviderRow[] => {
  if (Array.isArray(data)) {
    return data.filter(isProviderRow);
  }

  if (isProviderRow(data) && Array.isArray(data.value)) {
    return data.value.filter(isProviderRow);
  }

  return [];
};

const isProviderRow = (value: unknown): value is ProviderRow =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

const fetchProviderJson = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<unknown>;
};

const parseRowsToFetchedPrices = (
  rows: ProviderRow[],
  market: PriceProviderMarket,
) => {
  const prices: FetchedPrice[] = [];
  let skippedInvalidRows = 0;

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
    const date = parseProviderDate(
      getStringField(row, ["Date", "日期", "資料日期"]),
    );

    if (!symbol || !price || !date) {
      skippedInvalidRows += 1;
      return;
    }

    prices.push({
      symbol,
      name: name || undefined,
      price,
      date,
      market,
      raw: row,
    });
  });

  return { prices, skippedInvalidRows };
};

const createProviderResult = (
  provider: string,
  prices: FetchedPrice[],
  warnings: string[],
  errors: string[],
  fetchedAt = new Date().toISOString(),
): PriceProviderResult => ({
  provider,
  fetchedAt,
  prices,
  warnings,
  errors,
});

export async function fetchTwseClosingPrices(): Promise<PriceProviderResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const data = await fetchProviderJson(TWSE_DAILY_CLOSE_URL);
    const rows = getRowsFromResponse(data);

    if (rows.length === 0) {
      return createProviderResult(
        "TWSE OpenAPI",
        [],
        [],
        ["抓取失敗，請稍後再試，或改用每日價格 CSV 匯入。"],
        fetchedAt,
      );
    }

    const { prices, skippedInvalidRows } = parseRowsToFetchedPrices(rows, "twse");
    const warnings =
      skippedInvalidRows > 0
        ? ["部分資料列格式無法辨識，已略過。"]
        : [];

    if (prices.length === 0) {
      warnings.push("未取得可匯入的上市收盤價，請改用每日價格 CSV 匯入。");
    }

    return createProviderResult(
      "TWSE OpenAPI",
      prices,
      warnings,
      [],
      fetchedAt,
    );
  } catch {
    return createProviderResult(
      "TWSE OpenAPI",
      [],
      [],
      ["抓取失敗，請稍後再試，或改用每日價格 CSV 匯入。"],
      fetchedAt,
    );
  }
}

export async function fetchTpexClosingPrices(): Promise<PriceProviderResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const data = await fetchProviderJson(TPEX_DAILY_CLOSE_URL);
    const rows = getRowsFromResponse(data);

    if (rows.length === 0) {
      return createProviderResult(
        "TPEx OpenAPI",
        [],
        ["上櫃收盤價自動來源尚未啟用，請先使用每日價格 CSV 匯入。"],
        [],
        fetchedAt,
      );
    }

    const { prices, skippedInvalidRows } = parseRowsToFetchedPrices(rows, "tpex");
    const warnings =
      skippedInvalidRows > 0
        ? ["部分資料列格式無法辨識，已略過。"]
        : [];

    if (prices.length === 0) {
      warnings.push("未取得可匯入的上櫃收盤價，請改用每日價格 CSV 匯入。");
    }

    return createProviderResult(
      "TPEx OpenAPI",
      prices,
      warnings,
      [],
      fetchedAt,
    );
  } catch {
    return createProviderResult(
      "TPEx OpenAPI",
      [],
      ["上櫃收盤價自動來源尚未啟用，請先使用每日價格 CSV 匯入。"],
      [],
      fetchedAt,
    );
  }
}

export function fetchedPricesToPriceRecords(
  fetchedPrices: FetchedPrice[],
): PriceRecordInput[] {
  const fetchedAt = new Date().toISOString();

  return fetchedPrices.map((fetchedPrice) => ({
    symbol: fetchedPrice.symbol,
    name: fetchedPrice.name,
    price: fetchedPrice.price,
    date: fetchedPrice.date,
    sourceType: "provider",
    source:
      fetchedPrice.market === "twse" ? "TWSE OpenAPI" : "TPEx OpenAPI",
    fetchedAt,
    note: "自動收盤價來源",
  }));
}
