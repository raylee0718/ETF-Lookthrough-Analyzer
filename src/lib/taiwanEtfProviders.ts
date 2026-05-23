import type {
  EtfHoldingsAttemptedSource,
  EtfHoldingsFetchResult,
  EtfHoldingsRuntimeDiagnostics,
} from "../types/etfProvider";
import type { EtfConstituent } from "../types/portfolio";
import { normalizeImportedStockSymbol } from "./marketClassification";

export const YUANTA_0050_HOLDINGS_URL =
  "https://www.yuantaetfs.com/product/detail/0050/ratio";
export const YUANTA_0050_PCF_URL =
  "https://www.yuantaetfs.com/tradeInfo/pcf/0050";
export const YUANTA_00646_PCF_URL =
  "https://www.yuantaetfs.com/tradeInfo/pcf/00646";
export const YUANTA_00646_BASIC_INFORMATION_URL =
  "https://www.yuantaetfs.com/product/detail/00646/Basic_information";
export const YUANTA_00646_PCF_API_URL =
  "https://etfapi.yuantaetfs.com/ectranslation/api/bridge?APIType=ETFAPI&CompanyName=YUANTAFUNDS&PageName=%2FtradeInfo%2Fpcf%2F00646&DeviceId=null&FuncId=PCF%2FDaily&AppName=ETF&Device=3&Platform=ETF&ticker=00646&ndate=";
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
export const FSITC_00994A_FUND_DETAIL_URL =
  "https://www.fsitc.com.tw/FundDetail.aspx?ID=182";
export const FSITC_00994A_ETF_LIST_URL =
  "https://www.fsitc.com.tw/ETFList.aspx";
export const FSITC_00994A_GET_HD_URL =
  "https://www.fsitc.com.tw/WebAPI.aspx/Get_hd";
export const TWSE_00994A_PRODUCT_CONTENT_URL =
  "https://www.twse.com.tw/rwd/zh/ETF/productContent?id=00994A&response=json";
export const TWSE_00994A_NEWS_URL =
  "https://www.twse.com.tw/zh/ETFortune/newsDetail/8a8216d69a3d6cf9019b8d7c0d7006a7";

const YUANTA_0050_PCF_API_URL =
  "https://etfapi.yuantaetfs.com/ectranslation/api/bridge?APIType=ETFAPI&CompanyName=YUANTAFUNDS&PageName=%2FtradeInfo%2Fpcf%2F0050&DeviceId=null&FuncId=PCF%2FDaily&AppName=ETF&Device=3&Platform=ETF&ticker=0050&ndate=";

const YUANTA_0050_RATIO_SOURCE_LABEL = "元大投信 0050 持股比重頁";
const YUANTA_0050_PCF_SOURCE_LABEL = "元大投信 0050 申購買回清單";
const YUANTA_00646_HOLDINGS_SOURCE_LABEL = "元大投信 00646 官方持股資料";
const UPAMC_00981A_PCF_SOURCE_LABEL = "統一投信 00981A 官方 PCF";
const FSITC_00994A_HOLDINGS_SOURCE_LABEL = "第一金投信 00994A 官方持股資料";
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
  status: "ready_for_provider" | "parser_poc_ready" | "investigating";
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

export type UniPresident00981APcfParserContext = {
  etfSymbol?: "00981A";
  source?: string;
  asOfDate?: string;
};

export type ParsedUniPresident00981APcfResponse = {
  asOfDate?: string;
  source: string;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
};

export type First00994AGetHdParserContext = {
  etfSymbol?: "00994A";
  source?: string;
  asOfDate?: string;
};

export type ParsedFirst00994AGetHdResponse = {
  asOfDate?: string;
  source: string;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
};

export type Yuanta00646HoldingsParserContext = {
  etfSymbol?: "00646";
  source?: string;
  asOfDate?: string;
};

export type ParsedYuanta00646HoldingsResponse = {
  asOfDate?: string;
  source: string;
  constituents: EtfConstituent[];
  warnings: string[];
  errors: string[];
  ignoredNonStockRows: {
    futures: number;
    cash: number;
    margin: number;
  };
};

type ParsedHoldingRow = {
  stockSymbol: string;
  stockName: string;
  weightPercent: number;
};

type UniPresidentPcfDetail = {
  DetailCode?: unknown;
  DetailName?: unknown;
  NavRate?: unknown;
  TranDate?: unknown;
  Share?: unknown;
  Amount?: unknown;
};

type UniPresidentPcfAsset = {
  AssetCode?: unknown;
  AssetName?: unknown;
  Details?: unknown;
};

type UniPresidentPcfResponse = {
  pcf?: unknown;
  fund?: unknown;
  asset?: unknown;
  Data?: unknown;
};

type FirstGetHdOuterResponse = {
  d?: unknown;
};

type FirstGetHdRow = {
  fundid?: unknown;
  sdate?: unknown;
  group?: unknown;
  A?: unknown;
  B?: unknown;
  C?: unknown;
  D?: unknown;
  E?: unknown;
};

type YuantaPcfStockWeight = {
  code?: unknown;
  stkcd?: unknown;
  name?: unknown;
  ename?: unknown;
  weights?: unknown;
  weight?: unknown;
  qty?: unknown;
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
        "00981A 官方 PCF JSON parser POC 已可將 asset[AssetCode=ST].Details 轉成 EtfConstituent[]。",
        "官方 JSON 端點未回 CORS header，前端瀏覽器自動化可能需要 serverless proxy；本步驟仍不接 production provider。",
      ],
      recommendedFallback: "目前仍建議 CSV 匯入；下一步是評估 serverless proxy 或 parser proof-of-concept 的部署方式。",
    },
    {
      etfSymbol: "00994A",
      etfName: "主動第一金台股優",
      issuer: "第一金證券投資信託股份有限公司",
      status: "investigating",
      statusLabel: "官方來源深度驗證中",
      officialCandidateUrls: [
        FSITC_00994A_FUND_DETAIL_URL,
        FSITC_00994A_GET_HD_URL,
        FSITC_00994A_ETF_LIST_URL,
        FSITC_00994A_CAMPAIGN_URL,
        TWSE_00994A_PRODUCT_CONTENT_URL,
        TWSE_00994A_NEWS_URL,
      ],
      candidateSourceNotes: [
        "已找到第一金投信官方 FundDetail AJAX：POST /WebAPI.aspx/Get_hd，可回傳股票代號、名稱、持股權重與股數。",
        "00994A 官方 Get_hd JSON parser POC 已可將 group=1 股票列轉成 EtfConstituent[]。",
        "TWSE ETF productContent 可確認 00994A 的官方 PCF 入口指向第一金 FundDetail 申購買回清單頁。",
        "官方 JSON 端點未回 CORS header，前端瀏覽器自動化可能需要 serverless proxy；本步驟仍不接 production provider。",
        "00994A 已非目前使用者優先標的，保留為低優先度 / CSV fallback。",
      ],
      recommendedFallback: "低優先度保留；目前仍建議 CSV 匯入，不列入 0050 / 00981A 主要自動化焦點。",
    },
    {
      etfSymbol: "00646",
      etfName: "元大S&P500",
      issuer: "元大投信",
      status: "parser_poc_ready",
      statusLabel: "00646 parser POC 已建立；尚未接入一鍵更新",
      officialCandidateUrls: [
        YUANTA_00646_PCF_URL,
        YUANTA_00646_BASIC_INFORMATION_URL,
        YUANTA_00646_PCF_API_URL,
      ],
      candidateSourceNotes: [
        "00646 為海外成分股 ETF，需將股票成分分類為 US / 美股成分。",
        "元大 PCF/Daily 官方 JSON 含 FundWeights.StockWeights，可取得股票代號、名稱、股數與直接權重。",
        "00646 官方 PCF/Daily JSON parser POC 已可將股票列轉成 EtfConstituent[]，且固定 underlyingMarket 為 US。",
        "同一 JSON 也含 FutureWeights 與 Cash 區塊；parser POC 應先只轉換股票列，期貨 / 現金留待未來非股票曝險設計。",
        "需要沿用 00646 ticker cleanup，處理 UQ / UN 等 Bloomberg-like suffix 與 BRK/B 類 class-share 代號。",
      ],
      recommendedFallback:
        "CSV / 貼上表格匯入仍保留；自動 00646 provider 尚未實作。",
    },
  ];
}

const formatSlashDate = (value: string) => value.replace(/\//g, "-");

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
  const symbol = value
    .trim()
    .toUpperCase()
    .replace(/\.(TW|TWO|TT|TPE)$/i, "");
  const match = symbol.match(/^\d{4,6}[A-Z]?/);
  return match?.[0] ?? "";
};

const hasSuspiciousImportedTicker = (symbol: string) =>
  /\s/.test(symbol) || /[^A-Z0-9.-]/.test(symbol);

const parseWeight = (value: unknown) => {
  const normalizedValue = String(value ?? "")
    .replace("%", "")
    .replace(/,/g, "")
    .trim();
  const weight = Number(normalizedValue);
  return Number.isFinite(weight) && weight > 0 ? weight : undefined;
};

const parseNonNegativeWeight = (value: unknown) => {
  const normalizedValue = String(value ?? "")
    .replace("%", "")
    .replace(/,/g, "")
    .trim();
  const weight = Number(normalizedValue);
  return Number.isFinite(weight) && weight >= 0 ? weight : undefined;
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

const parseJsonLikeResponse = (raw: unknown): { data?: unknown; error?: string } => {
  if (typeof raw === "string") {
    try {
      return { data: JSON.parse(raw) };
    } catch {
      return { error: "00981A PCF 回應不是可解析的 JSON。" };
    }
  }

  return { data: raw };
};

const getYuanta00646AsOfDate = (
  data: YuantaPcfResponse,
  contextDate?: string,
) => {
  const contextAsOfDate = normalizeDateString(contextDate);
  if (contextAsOfDate) {
    return contextAsOfDate;
  }

  return [data.PCF?.trandate, data.PCF?.anndate, data.PCF?.upddate]
    .map(normalizeDateString)
    .find(Boolean);
};

const countArrayRows = (value: unknown) => (Array.isArray(value) ? value.length : 0);

export function parseYuanta00646HoldingsResponse(
  raw: unknown,
  context: Yuanta00646HoldingsParserContext = {},
): ParsedYuanta00646HoldingsResponse {
  const source = context.source ?? YUANTA_00646_HOLDINGS_SOURCE_LABEL;
  const warnings: string[] = [];
  const errors: string[] = [];
  const { data: parsedJson, error } = parseJsonLikeResponse(raw);

  if (error) {
    return {
      source,
      constituents: [],
      warnings,
      errors: ["00646 PCF/Daily JSON 回應不是可解析的 JSON。"],
      ignoredNonStockRows: {
        futures: 0,
        cash: 0,
        margin: 0,
      },
    };
  }

  const data = ((parsedJson as YuantaPcfResponse)?.Data ??
    parsedJson) as YuantaPcfResponse;
  const stockRows = Array.isArray(data.FundWeights?.StockWeights)
    ? data.FundWeights.StockWeights
    : [];
  const asOfDate = getYuanta00646AsOfDate(data, context.asOfDate);
  const ignoredNonStockRows = {
    futures: countArrayRows(data.FundWeights?.FutureWeights),
    cash: countArrayRows(data.Cash?.CashPosition),
    margin: countArrayRows(data.Cash?.Margin),
  };

  if (stockRows.length === 0) {
    errors.push("00646 PCF/Daily JSON 找不到 FundWeights.StockWeights 股票明細。");
  }

  if (!asOfDate) {
    warnings.push("無法從 00646 PCF/Daily JSON 判讀資料日期。");
  }

  if (
    ignoredNonStockRows.futures > 0 ||
    ignoredNonStockRows.cash > 0 ||
    ignoredNonStockRows.margin > 0
  ) {
    warnings.push(
      `00646 parser POC 已忽略非股票列：期貨 ${ignoredNonStockRows.futures} 筆、現金 ${ignoredNonStockRows.cash} 筆、保證金 ${ignoredNonStockRows.margin} 筆。`,
    );
  }

  const constituents = stockRows.flatMap((row, index): EtfConstituent[] => {
    const rawSymbol = String(row.code ?? row.stkcd ?? "");
    const stockSymbol = normalizeImportedStockSymbol(rawSymbol, {
      etfSymbol: context.etfSymbol ?? "00646",
    });
    const stockName = String(row.name ?? row.ename ?? "").trim();
    const weightPercent = parseNonNegativeWeight(row.weights ?? row.weight);

    if (!stockSymbol || !stockName || weightPercent === undefined) {
      warnings.push(
        `00646 PCF/Daily 股票明細第 ${index + 1} 筆缺少有效代號、名稱或 weights 權重，已略過。`,
      );
      return [];
    }

    if (stockSymbol !== rawSymbol.trim().toUpperCase()) {
      warnings.push(`00646 股票代號已清理：${rawSymbol} -> ${stockSymbol}`);
    }

    if (hasSuspiciousImportedTicker(stockSymbol)) {
      warnings.push(`00646 股票代號可能仍需確認：${stockSymbol}`);
    }

    return [
      {
        id: `provider-poc-00646-${stockSymbol}-${index}`,
        etfSymbol: context.etfSymbol ?? "00646",
        stockSymbol,
        stockName,
        weightPercent,
        underlyingMarket: "US",
        asOfDate,
        source,
      },
    ];
  });

  if (stockRows.length > 0 && constituents.length === 0) {
    errors.push("00646 PCF/Daily JSON 有股票明細，但沒有任何列含有效 weights 權重。");
  }

  return {
    asOfDate,
    source,
    constituents,
    warnings,
    errors,
    ignoredNonStockRows,
  };
}

const parseFirst00994AGetHdRows = (
  raw: unknown,
): { rows: FirstGetHdRow[]; error?: string } => {
  const outer = parseJsonLikeResponse(raw);
  if (outer.error) {
    return { rows: [], error: "00994A Get_hd 回應不是可解析的 JSON。" };
  }

  const outerData = outer.data as FirstGetHdOuterResponse | FirstGetHdRow[];
  const innerData = Array.isArray(outerData)
    ? outerData
    : (outerData as FirstGetHdOuterResponse).d;

  if (typeof innerData === "string") {
    const inner = parseJsonLikeResponse(innerData);
    if (inner.error) {
      return { rows: [], error: "00994A Get_hd 的 d 欄位不是可解析的 JSON string。" };
    }

    return {
      rows: Array.isArray(inner.data) ? (inner.data as FirstGetHdRow[]) : [],
    };
  }

  return {
    rows: Array.isArray(innerData) ? (innerData as FirstGetHdRow[]) : [],
  };
};

const getFirst00994AAsOfDate = (
  rows: FirstGetHdRow[],
  contextDate?: string,
) => {
  const contextAsOfDate = normalizeDateString(contextDate);
  if (contextAsOfDate) {
    return contextAsOfDate;
  }

  return rows.map((row) => normalizeDateString(row.sdate)).find(Boolean);
};

export function parseFirst00994AGetHdResponse(
  raw: unknown,
  context: First00994AGetHdParserContext = {},
): ParsedFirst00994AGetHdResponse {
  const source = context.source ?? FSITC_00994A_HOLDINGS_SOURCE_LABEL;
  const warnings: string[] = [];
  const errors: string[] = [];
  const { rows, error } = parseFirst00994AGetHdRows(raw);

  if (error) {
    return {
      source,
      constituents: [],
      warnings,
      errors: [error],
    };
  }

  const stockRows = rows.filter((row) => String(row.group ?? "").trim() === "1");
  const asOfDate = getFirst00994AAsOfDate(stockRows.length > 0 ? stockRows : rows, context.asOfDate);

  if (rows.length === 0) {
    errors.push("00994A Get_hd JSON 沒有可解析的資料列。");
  }

  if (rows.length > 0 && stockRows.length === 0) {
    errors.push("00994A Get_hd JSON 找不到 group=1 的股票持股列。");
  }

  if (!asOfDate) {
    warnings.push("無法從 00994A Get_hd JSON 判讀資料日期。");
  }

  const constituents = stockRows.flatMap((row, index): EtfConstituent[] => {
    const stockSymbol = normalizeStockSymbol(String(row.A ?? ""));
    const stockName = String(row.B ?? "").trim();
    const weightPercent = parseWeight(row.C);

    if (!stockSymbol || !stockName || !weightPercent) {
      warnings.push(
        `00994A Get_hd 股票明細第 ${index + 1} 筆缺少有效代號、名稱或 C 欄持股權重，已略過。`,
      );
      return [];
    }

    return [
      {
        id: `provider-poc-00994A-${stockSymbol}-${index}`,
        etfSymbol: context.etfSymbol ?? "00994A",
        stockSymbol,
        stockName,
        weightPercent,
        asOfDate,
        source,
      },
    ];
  });

  if (stockRows.length > 0 && constituents.length === 0) {
    errors.push("00994A Get_hd JSON 有股票明細，但沒有任何列含有效 C 欄持股權重。");
  }

  return {
    asOfDate,
    source,
    constituents,
    warnings,
    errors,
  };
}

const getUniPresident00981AStockDetails = (
  data: UniPresidentPcfResponse,
): UniPresidentPcfDetail[] => {
  const assets = Array.isArray(data.asset) ? (data.asset as UniPresidentPcfAsset[]) : [];
  const stockAsset = assets.find((asset) => String(asset.AssetCode ?? "") === "ST");

  return Array.isArray(stockAsset?.Details)
    ? (stockAsset.Details as UniPresidentPcfDetail[])
    : [];
};

const getUniPresident00981AAsOfDate = (
  data: UniPresidentPcfResponse,
  stockDetails: UniPresidentPcfDetail[],
  contextDate?: string,
) => {
  const contextAsOfDate = normalizeDateString(contextDate);
  if (contextAsOfDate) {
    return contextAsOfDate;
  }

  const firstDetailDate = stockDetails
    .map((row) => normalizeDateString(row.TranDate))
    .find(Boolean);
  if (firstDetailDate) {
    return firstDetailDate;
  }

  const pcfRows = Array.isArray(data.pcf) ? (data.pcf as Array<Record<string, unknown>>) : [];
  return pcfRows
    .flatMap((row) => [row.TranDate, row.tranDate, row.PostDate, row.postDate])
    .map(normalizeDateString)
    .find(Boolean);
};

export function parseUniPresident00981APcfResponse(
  raw: unknown,
  context: UniPresident00981APcfParserContext = {},
): ParsedUniPresident00981APcfResponse {
  const source = context.source ?? UPAMC_00981A_PCF_SOURCE_LABEL;
  const warnings: string[] = [];
  const errors: string[] = [];
  const { data: parsedJson, error } = parseJsonLikeResponse(raw);

  if (error) {
    return {
      source,
      constituents: [],
      warnings,
      errors: [error],
    };
  }

  const data = ((parsedJson as UniPresidentPcfResponse)?.Data ??
    parsedJson) as UniPresidentPcfResponse;
  const stockDetails = getUniPresident00981AStockDetails(data);
  const asOfDate = getUniPresident00981AAsOfDate(
    data,
    stockDetails,
    context.asOfDate,
  );

  if (stockDetails.length === 0) {
    errors.push("00981A PCF JSON 找不到 asset[AssetCode=ST].Details 股票明細。");
  }

  if (!asOfDate) {
    warnings.push("無法從 00981A PCF JSON 判讀資料日期。");
  }

  const constituents = stockDetails.flatMap((row, index): EtfConstituent[] => {
    const stockSymbol = normalizeStockSymbol(String(row.DetailCode ?? ""));
    const stockName = String(row.DetailName ?? "").trim();
    const weightPercent = parseWeight(row.NavRate);

    if (!stockSymbol || !stockName || !weightPercent) {
      warnings.push(
        `00981A PCF 股票明細第 ${index + 1} 筆缺少有效代號、名稱或 NavRate 權重，已略過。`,
      );
      return [];
    }

    return [
      {
        id: `provider-poc-00981A-${stockSymbol}-${index}`,
        etfSymbol: context.etfSymbol ?? "00981A",
        stockSymbol,
        stockName,
        weightPercent,
        asOfDate,
        source,
      },
    ];
  });

  if (stockDetails.length > 0 && constituents.length === 0) {
    errors.push("00981A PCF JSON 有股票明細，但沒有任何列含有效 NavRate 權重。");
  }

  return {
    asOfDate,
    source,
    constituents,
    warnings,
    errors,
  };
}

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
