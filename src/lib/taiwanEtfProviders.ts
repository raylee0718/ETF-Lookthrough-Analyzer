import type { EtfHoldingsFetchResult } from "../types/etfProvider";
import type { EtfConstituent } from "../types/portfolio";

export const YUANTA_0050_HOLDINGS_URL =
  "https://www.yuantaetfs.com/product/detail/0050/ratio";

const YUANTA_0050_SOURCE_LABEL = "元大投信 0050 持股資料";
const YUANTA_0050_FALLBACK_MESSAGE =
  "0050 官方資料來源目前無法由瀏覽器直接穩定取得，請先使用 CSV 匯入。";

type ParsedYuanta0050Holdings = {
  asOfDate?: string;
  constituents: EtfConstituent[];
  warnings: string[];
};

type ParsedHoldingRow = {
  stockSymbol: string;
  stockName: string;
  weightPercent: number;
};

const formatDate = (value: string) => value.replace(/\//g, "-");

const stripTags = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const normalizeStockSymbol = (value: string) => {
  const symbol = value.trim().toUpperCase().replace(/\.TW$/, "");
  const match = symbol.match(/^\d{4,6}[A-Z]?/);
  return match?.[0] ?? "";
};

const parseWeight = (value: string) => {
  const normalizedValue = value.replace("%", "").replace(/,/g, "").trim();
  const weight = Number(normalizedValue);
  return Number.isFinite(weight) && weight > 0 ? weight : undefined;
};

const createConstituent = (
  row: ParsedHoldingRow,
  index: number,
  asOfDate?: string,
): EtfConstituent => ({
  id: `provider-0050-${row.stockSymbol}-${index}`,
  etfSymbol: "0050",
  stockSymbol: row.stockSymbol,
  stockName: row.stockName,
  weightPercent: row.weightPercent,
  asOfDate,
  source: YUANTA_0050_SOURCE_LABEL,
});

const parseRowsFromDom = (raw: string) => {
  if (typeof DOMParser === "undefined") {
    return undefined;
  }

  const document = new DOMParser().parseFromString(raw, "text/html");
  const headings = Array.from(document.querySelectorAll("h3"));
  const stockHeading = headings.find((heading) =>
    heading.textContent?.includes("基金權重-股票"),
  );
  const stockSection = stockHeading?.closest("[data-v-818b5120]");
  const rows = Array.from(
    stockSection?.querySelectorAll(".tbody .tr") ?? [],
  ).map((row) => stripTags(row.innerHTML));

  return rows.length > 0 ? rows : undefined;
};

const parseRowsFromHtml = (raw: string) => {
  const sectionMatch = raw.match(
    /基金權重-股票([\s\S]*?)(基金權重-期貨|window\.__NUXT__)/,
  );
  const section = sectionMatch?.[1] ?? "";
  const sectionText = stripTags(section);
  const rowMatches = Array.from(
    sectionText.matchAll(
      /商品代碼\s+[0-9A-Za-z.]+\s+商品名稱\s+.+?\s+商品數量\s+[\d,]+\s+商品權重\s+[0-9,.%]+/g,
    ),
  ).map((match) => match[0]);

  if (rowMatches.length > 0) {
    return rowMatches;
  }

  return Array.from(section.matchAll(/<div class="tr"[\s\S]*?<\/div><\/div>/g))
    .map((match) => stripTags(match[0]))
    .filter((text) => text.includes("商品代碼"));
};

const parseHoldingRows = (rowTexts: string[]) => {
  const rows: ParsedHoldingRow[] = [];
  let skippedRows = 0;

  rowTexts.forEach((rowText) => {
    const match = rowText.match(
      /商品代碼\s+([0-9A-Za-z.]+)\s+商品名稱\s+(.+?)\s+商品數量\s+[\d,]+\s+商品權重\s+([0-9,.%]+)/,
    );

    if (!match) {
      skippedRows += 1;
      return;
    }

    const stockSymbol = normalizeStockSymbol(match[1]);
    const stockName = match[2].trim();
    const weightPercent = parseWeight(match[3]);

    if (!stockSymbol || !stockName || !weightPercent) {
      skippedRows += 1;
      return;
    }

    rows.push({ stockSymbol, stockName, weightPercent });
  });

  return { rows, skippedRows };
};

export function parseYuanta0050HoldingsResponse(
  raw: string,
): ParsedYuanta0050Holdings {
  const warnings: string[] = [];
  const asOfDateMatch = raw.match(/交易日期:\s*(?:<br[^>]*>)?\s*(\d{4}\/\d{2}\/\d{2})/);
  const asOfDate = asOfDateMatch ? formatDate(asOfDateMatch[1]) : undefined;
  const rowTexts = parseRowsFromDom(raw) ?? parseRowsFromHtml(raw);
  const { rows, skippedRows } = parseHoldingRows(rowTexts);

  if (!asOfDate) {
    warnings.push("無法從元大 0050 官方頁面判讀資料日期。");
  }

  if (skippedRows > 0) {
    warnings.push(`有 ${skippedRows} 筆 0050 持股列因缺少代號、名稱或權重而略過。`);
  }

  if (rows.length === 0) {
    warnings.push(YUANTA_0050_FALLBACK_MESSAGE);
  }

  return {
    asOfDate,
    constituents: rows.map((row, index) =>
      createConstituent(row, index, asOfDate),
    ),
    warnings,
  };
}

export async function fetchYuanta0050Holdings(): Promise<EtfHoldingsFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(YUANTA_0050_HOLDINGS_URL, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        etfSymbol: "0050",
        source: YUANTA_0050_SOURCE_LABEL,
        providerType: "issuer",
        status: "failed",
        constituents: [],
        warnings: [],
        errors: [YUANTA_0050_FALLBACK_MESSAGE, `元大官方頁面回應 HTTP ${response.status}。`],
        fetchedAt,
      };
    }

    const raw = await response.text();
    const parsed = parseYuanta0050HoldingsResponse(raw);

    if (parsed.constituents.length === 0) {
      return {
        etfSymbol: "0050",
        asOfDate: parsed.asOfDate,
        source: YUANTA_0050_SOURCE_LABEL,
        providerType: "issuer",
        status: "partial",
        constituents: [],
        warnings: parsed.warnings,
        errors: [YUANTA_0050_FALLBACK_MESSAGE],
        fetchedAt,
      };
    }

    const isLikelyComplete0050HoldingList = parsed.constituents.length >= 45;
    const completenessWarnings = isLikelyComplete0050HoldingList
      ? []
      : [
          `元大 0050 官方頁面目前只解析到 ${parsed.constituents.length} 筆股票權重，可能是頁面摘要而非完整成分股清單。`,
          "若要完整穿透分析，請先使用 CSV 匯入完整 0050 成分股。",
        ];

    return {
      etfSymbol: "0050",
      asOfDate: parsed.asOfDate,
      source: YUANTA_0050_SOURCE_LABEL,
      providerType: "issuer",
      status: isLikelyComplete0050HoldingList ? "supported" : "partial",
      constituents: parsed.constituents,
      warnings: [
        "目前正在試作 0050 provider；尚未代表所有元大 ETF 或台灣 ETF 都支援。",
        ...completenessWarnings,
        ...parsed.warnings,
      ],
      errors: [],
      fetchedAt,
    };
  } catch {
    return {
      etfSymbol: "0050",
      source: YUANTA_0050_SOURCE_LABEL,
      providerType: "issuer",
      status: "failed",
      constituents: [],
      warnings: [],
      errors: [YUANTA_0050_FALLBACK_MESSAGE],
      fetchedAt,
    };
  }
}
