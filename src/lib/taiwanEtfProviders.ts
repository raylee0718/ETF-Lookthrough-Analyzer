import type {
  EtfHoldingsAttemptedSource,
  EtfHoldingsFetchResult,
  EtfHoldingsRuntimeDiagnostics,
} from "../types/etfProvider";
import type { EtfConstituent } from "../types/portfolio";

export const YUANTA_0050_HOLDINGS_URL =
  "https://www.yuantaetfs.com/product/detail/0050/ratio";
export const YUANTA_0050_PCF_URL =
  "https://www.yuantaetfs.com/tradeInfo/pcf/0050";
export const UPAMC_00981A_PCF_URL =
  "https://www.ezmoney.com.tw/ETF/Transaction/PCF?fundCode=49YTW";
export const UPAMC_00981A_GET_PCF_URL =
  "https://www.ezmoney.com.tw/ETF/Transaction/GetPCF";
export const UPAMC_00981A_PCF_EXCEL_URL =
  "https://www.ezmoney.com.tw/ETF/Transaction/PCFExcelNPOI?fundCode=49YTW&date=115/05/22&specificDate=true";
export const TWSE_00981A_ETFORTUNE_URL =
  "https://www.twse.com.tw/zh/ETFortune/etfInfo/00981A";
export const FSITC_00994A_CAMPAIGN_URL =
  "https://www.fsitc.com.tw/act/202512_994AETF/index.html";
export const TWSE_00994A_NEWS_URL =
  "https://www.twse.com.tw/zh/ETFortune/newsDetail/8a8216d69a3d6cf9019b8d7c0d7006a7";

const YUANTA_0050_PCF_API_URL =
  "https://etfapi.yuantaetfs.com/ectranslation/api/bridge?APIType=ETFAPI&CompanyName=YUANTAFUNDS&PageName=%2FtradeInfo%2Fpcf%2F0050&DeviceId=null&FuncId=PCF%2FDaily&AppName=ETF&Device=3&Platform=ETF&ticker=0050&ndate=";

const YUANTA_0050_RATIO_SOURCE_LABEL = "元大投信 0050 持股比重頁";
const YUANTA_0050_PCF_SOURCE_LABEL = "元大投信 0050 申購買回清單";
const YUANTA_0050_FALLBACK_MESSAGE =
  "0050 官方資料來源目前無法由瀏覽器直接穩定取得，請先使用 CSV 匯入。";
const YUANTA_0050_CORS_MESSAGE =
  "官方來源可在伺服器端讀取，但瀏覽器端可能受 CORS 限制。此 local-first 版本仍建議使用 CSV 匯入，或未來改用 serverless proxy。";
const YUANTA_0050_BROWSER_CORS_MESSAGE =
  "瀏覽器端可能受到 CORS 限制，無法直接讀取官方來源。官方資料本身可用，但此 local-first 前端版本可能需要 CSV 匯入或 serverless proxy 才能自動更新。";
const YUANTA_0050_PCF_WEIGHT_WARNING =
  "已找到官方 PCF 資料，但缺少可直接用於穿透分析的權重欄位，因此暫不自動覆蓋成分股。";
const COMPLETE_0050_ROW_THRESHOLD = 20;

export type KnownTaiwanEtfProviderCapability = {
  etfSymbol: string;
  etfName: string;
  issuer: string;
  status: "ready_for_provider" | "investigating";
  statusLabel: string;
  candidateSourceNotes: string[];
  officialCandidateUrls: string[];
  recommendedFallback: string;
};

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

type YuantaPcfStockWeight = {
  code?: unknown;
  stkcd?: unknown;
  name?: unknown;
  weights?: unknown;
  weight?: unknown;
  qty?: unknown;
};

type YuantaPcfResponse = {
  Data?: unknown;
  PCF?: {
    trandate?: unknown;
    anndate?: unknown;
  };
  FundWeights?: {
    StockWeights?: YuantaPcfStockWeight[];
  };
  InKind?: {
    FundComposition?: Array<{
      stkcd?: unknown;
      name?: unknown;
      qty?: unknown;
    }>;
  };
};

export function getKnownTaiwanEtfProviderCapabilities(): KnownTaiwanEtfProviderCapability[] {
  return [
    {
      etfSymbol: "0050",
      etfName: "元大台灣50",
      issuer: "元大證券投資信託股份有限公司",
      status: "ready_for_provider",
      statusLabel: "0050 provider 試作中",
      officialCandidateUrls: [YUANTA_0050_PCF_URL, YUANTA_0050_HOLDINGS_URL],
      candidateSourceNotes: [
        "官方 PCF/Daily JSON 已可解析完整股票權重，但瀏覽器端可能受 CORS 限制。",
        "若瀏覽器無法抓取，仍建議使用 CSV 匯入或未來評估 serverless proxy。",
      ],
      recommendedFallback: "CSV 匯入",
    },
    {
      etfSymbol: "00981A",
      etfName: "主動統一台股增長",
      issuer: "統一證券投資信託股份有限公司",
      status: "investigating",
      statusLabel: "官方 PCF 深度驗證中",
      officialCandidateUrls: [
        UPAMC_00981A_PCF_URL,
        UPAMC_00981A_GET_PCF_URL,
        UPAMC_00981A_PCF_EXCEL_URL,
        TWSE_00981A_ETFORTUNE_URL,
      ],
      candidateSourceNotes: [
        "已找到統一投信官方 PCF AJAX：POST /ETF/Transaction/GetPCF，回傳股票代號、名稱、股數、金額與 NavRate 持股權重。",
        "官方 JSON 端點未回 CORS header，前端瀏覽器自動化可能需要 serverless proxy；本步驟暫不接 provider。",
      ],
      recommendedFallback: "目前仍建議 CSV 匯入；若官方來源確認可由部署環境穩定讀取，下一步才加入 provider。",
    },
    {
      etfSymbol: "00994A",
      etfName: "主動第一金台股優",
      issuer: "第一金證券投資信託股份有限公司",
      status: "investigating",
      statusLabel: "官方來源盤點中",
      officialCandidateUrls: [FSITC_00994A_CAMPAIGN_URL, TWSE_00994A_NEWS_URL],
      candidateSourceNotes: [
        "第一金投信官方頁與公開說明書可讀，但目前未發現完整持股權重下載檔。",
        "TWSE e添富新上市資訊與週報可確認商品與交易資料，未揭露完整持股權重。",
      ],
      recommendedFallback: "目前請先使用 CSV 匯入",
    },
  ];
}

const formatSlashDate = (value: string) => value.replace(/\//g, "-");

const formatCompactDate = (value: string) => {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
};

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

const parseWeight = (value: unknown) => {
  const normalizedValue = String(value ?? "")
    .replace("%", "")
    .replace(/,/g, "")
    .trim();
  const weight = Number(normalizedValue);
  return Number.isFinite(weight) && weight > 0 ? weight : undefined;
};

const createConstituent = (
  row: ParsedHoldingRow,
  index: number,
  asOfDate: string | undefined,
  source: string,
): EtfConstituent => ({
  id: `provider-0050-${row.stockSymbol}-${index}`,
  etfSymbol: "0050",
  stockSymbol: row.stockSymbol,
  stockName: row.stockName,
  weightPercent: row.weightPercent,
  asOfDate,
  source,
});

const hasValidWeights = (constituents: EtfConstituent[]) =>
  constituents.every(
    (constituent) =>
      Number.isFinite(constituent.weightPercent) &&
      constituent.weightPercent > 0,
  );

const isSafeToSave0050Result = (constituents: EtfConstituent[]) =>
  constituents.length >= COMPLETE_0050_ROW_THRESHOLD &&
  hasValidWeights(constituents);

const createAttemptedSource = (
  label: string,
  url: string,
  status: EtfHoldingsAttemptedSource["status"],
  notes?: string,
  error?: unknown,
): EtfHoldingsAttemptedSource => ({
  label,
  url,
  status,
  notes,
  errorName: error instanceof Error ? error.name : undefined,
  errorMessage: error instanceof Error ? error.message : undefined,
  corsLikeFailure: isCorsLikeFetchError(error),
});

const getRuntimeDiagnostics = (testedAt: string): EtfHoldingsRuntimeDiagnostics => {
  if (typeof window === "undefined") {
    return {
      executionEnvironment: "server-or-shell",
      siteEnvironment: "unknown",
      testedAt,
    };
  }

  const hostname = window.location.hostname;
  const isLocalDev =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";

  return {
    executionEnvironment: "browser",
    siteEnvironment: isLocalDev ? "local-dev" : "deployed-site",
    origin: window.location.origin,
    testedAt,
  };
};

const isCorsLikeFetchError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    error.name === "TypeError" ||
    message.includes("failed to fetch") ||
    message.includes("load failed") ||
    message.includes("networkerror") ||
    message.includes("cors")
  );
};

const createFetchResult = ({
  asOfDate,
  source,
  status,
  constituents,
  warnings,
  errors,
  fetchedAt,
  attemptedSources,
  runtimeDiagnostics,
}: {
  asOfDate?: string;
  source: string;
  status: EtfHoldingsFetchResult["status"];
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
  fetchedAt: string;
  attemptedSources: EtfHoldingsAttemptedSource[];
  runtimeDiagnostics: EtfHoldingsRuntimeDiagnostics;
}): EtfHoldingsFetchResult => {
  const safeToSave = isSafeToSave0050Result(constituents);
  const supportLevel = safeToSave
    ? "full"
    : attemptedSources.some((source) => source.status === "blocked_by_cors")
      ? "blocked_by_cors"
      : constituents.length > 0 || status === "partial"
        ? "partial"
        : "unsupported";

  return {
    etfSymbol: "0050",
    asOfDate,
    source,
    providerType: "issuer",
    status,
    constituents,
    warnings,
    errors,
    fetchedAt,
    attemptedSources,
    supportLevel,
    safeToSave,
    runtimeDiagnostics,
  };
};

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
  const asOfDate = asOfDateMatch
    ? formatSlashDate(asOfDateMatch[1])
    : undefined;
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
      createConstituent(row, index, asOfDate, YUANTA_0050_RATIO_SOURCE_LABEL),
    ),
    warnings,
  };
}

export function parseYuanta0050PcfResponse(raw: string): ParsedYuanta0050Holdings {
  const warnings: string[] = [];
  let parsedJson: YuantaPcfResponse;

  try {
    parsedJson = JSON.parse(raw) as YuantaPcfResponse;
  } catch {
    return {
      constituents: [],
      warnings: ["元大 0050 PCF 回應不是可解析的 JSON。"],
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
  const pcfRows = Array.isArray(data.InKind?.FundComposition)
    ? data.InKind.FundComposition
    : [];

  if (!asOfDate) {
    warnings.push("無法從元大 0050 PCF 判讀交易日期。");
  }

  if (pcfRows.length > 0) {
    warnings.push(
      `官方 PCF 股票實物申贖清單含 ${pcfRows.length} 筆股數資料，可作為診斷來源。`,
    );
  }

  if (stockWeights.length === 0 && pcfRows.length > 0) {
    warnings.push(YUANTA_0050_PCF_WEIGHT_WARNING);
  }

  const rows = stockWeights.flatMap((row, index): ParsedHoldingRow[] => {
    const stockSymbol = normalizeStockSymbol(String(row.code ?? row.stkcd ?? ""));
    const stockName = String(row.name ?? "").trim();
    const weightPercent = parseWeight(row.weights ?? row.weight);

    if (!stockSymbol || !stockName || !weightPercent) {
      warnings.push(`PCF 股票權重第 ${index + 1} 筆缺少代號、名稱或權重，已略過。`);
      return [];
    }

    return [{ stockSymbol, stockName, weightPercent }];
  });

  if (rows.length === 0) {
    warnings.push(YUANTA_0050_PCF_WEIGHT_WARNING);
  }

  return {
    asOfDate,
    constituents: rows.map((row, index) =>
      createConstituent(row, index, asOfDate, YUANTA_0050_PCF_SOURCE_LABEL),
    ),
    warnings,
  };
}

const fetchText = async (url: string, accept: string) => {
  const response = await fetch(url, {
    headers: { Accept: accept },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
};

export async function fetchYuanta0050Holdings(): Promise<EtfHoldingsFetchResult> {
  const fetchedAt = new Date().toISOString();
  const runtimeDiagnostics = getRuntimeDiagnostics(fetchedAt);
  const attemptedSources: EtfHoldingsAttemptedSource[] = [];

  try {
    const rawPcf = await fetchText(YUANTA_0050_PCF_API_URL, "application/json");
    const parsedPcf = parseYuanta0050PcfResponse(rawPcf);
    const safeToSave = isSafeToSave0050Result(parsedPcf.constituents);

    attemptedSources.push(
      createAttemptedSource(
        "元大 0050 PCF/Daily 官方 JSON",
        YUANTA_0050_PCF_API_URL,
        safeToSave ? "full" : "partial",
        safeToSave
          ? "含完整股票權重，可用於穿透分析。"
          : "可讀取官方 PCF，但尚未取得足夠可儲存的權重資料。",
      ),
    );

    return createFetchResult({
      asOfDate: parsedPcf.asOfDate,
      source: YUANTA_0050_PCF_SOURCE_LABEL,
      status: safeToSave ? "supported" : "partial",
      constituents: parsedPcf.constituents,
      warnings: [
        "目前正在試作 0050 provider；尚未代表所有元大 ETF 或台灣 ETF 都支援。",
        "優先嘗試元大官方 PCF/Daily JSON；若瀏覽器受 CORS 限制，請改用 CSV 匯入。",
        ...parsedPcf.warnings,
      ],
      errors: [],
      fetchedAt,
      attemptedSources,
      runtimeDiagnostics,
    });
  } catch (error) {
    const corsLikeFailure = isCorsLikeFetchError(error);
    attemptedSources.push(
      createAttemptedSource(
        "元大 0050 PCF/Daily 官方 JSON",
        YUANTA_0050_PCF_API_URL,
        corsLikeFailure ? "blocked_by_cors" : "unsupported",
        corsLikeFailure
          ? YUANTA_0050_BROWSER_CORS_MESSAGE
          : error instanceof Error
            ? error.message
            : "瀏覽器 fetch 失敗。",
        error,
      ),
    );
  }

  try {
    const rawRatio = await fetchText(
      YUANTA_0050_HOLDINGS_URL,
      "text/html,application/xhtml+xml",
    );
    const parsedRatio = parseYuanta0050HoldingsResponse(rawRatio);
    const safeToSave = isSafeToSave0050Result(parsedRatio.constituents);

    attemptedSources.push(
      createAttemptedSource(
        "元大 0050 持股比重頁",
        YUANTA_0050_HOLDINGS_URL,
        safeToSave ? "full" : "partial",
        `目前解析到 ${parsedRatio.constituents.length} 筆股票權重。`,
      ),
    );

    return createFetchResult({
      asOfDate: parsedRatio.asOfDate,
      source: YUANTA_0050_RATIO_SOURCE_LABEL,
      status: safeToSave ? "supported" : "partial",
      constituents: parsedRatio.constituents,
      warnings: [
        "目前正在試作 0050 provider；尚未代表所有元大 ETF 或台灣 ETF 都支援。",
        `元大 0050 持股比重頁目前只解析到 ${parsedRatio.constituents.length} 筆股票權重，可能是頁面摘要而非完整成分股清單。`,
        "若要完整穿透分析，請先使用 CSV 匯入完整 0050 成分股。",
        ...parsedRatio.warnings,
      ],
      errors: [],
      fetchedAt,
      attemptedSources,
      runtimeDiagnostics,
    });
  } catch (error) {
    const corsLikeFailure = isCorsLikeFetchError(error);
    attemptedSources.push(
      createAttemptedSource(
        "元大 0050 持股比重頁",
        YUANTA_0050_HOLDINGS_URL,
        corsLikeFailure ? "blocked_by_cors" : "unsupported",
        corsLikeFailure
          ? YUANTA_0050_BROWSER_CORS_MESSAGE
          : error instanceof Error
            ? error.message
            : "瀏覽器 fetch 失敗。",
        error,
      ),
    );
  }

  return createFetchResult({
    source: YUANTA_0050_PCF_SOURCE_LABEL,
    status: "failed",
    constituents: [],
    warnings: [YUANTA_0050_CORS_MESSAGE],
    errors: [YUANTA_0050_FALLBACK_MESSAGE],
    fetchedAt,
    attemptedSources,
    runtimeDiagnostics,
  });
}
