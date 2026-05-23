import type { EtfHoldingsFetchResult, EtfProviderConfig } from "../types/etfProvider";
import type { EtfConstituent } from "../types/portfolio";
import {
  inferConstituentMarket,
  normalizeUnderlyingMarketValue,
} from "./marketClassification";
import { fetchYuanta0050Holdings } from "./taiwanEtfProviders";

type RawConstituentRow = Record<string, unknown>;

type NormalizeEtfConstituentContext = {
  etfSymbol: string;
  asOfDate?: string;
  source: string;
};

const createResult = ({
  config,
  status,
  constituents = [],
  warnings = [],
  errors = [],
  source,
  asOfDate,
}: {
  config: EtfProviderConfig;
  status: EtfHoldingsFetchResult["status"];
  constituents?: EtfConstituent[];
  warnings?: string[];
  errors?: string[];
  source?: string;
  asOfDate?: string;
}): EtfHoldingsFetchResult => ({
  etfSymbol: config.etfSymbol.trim().toUpperCase(),
  asOfDate,
  source: source ?? config.sourceUrl ?? config.providerType,
  providerType: config.providerType,
  status,
  constituents,
  warnings,
  errors,
  fetchedAt: new Date().toISOString(),
});

const getStringField = (row: RawConstituentRow, fieldNames: string[]) => {
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

const parseWeightPercent = (value: string) => {
  const normalizedValue = value.replace("%", "").replace(/,/g, "").trim();
  const weightPercent = Number(normalizedValue);

  return Number.isFinite(weightPercent) && weightPercent > 0
    ? weightPercent
    : undefined;
};

export function normalizeEtfConstituentRows(
  rawRows: RawConstituentRow[],
  context: NormalizeEtfConstituentContext,
): EtfConstituent[] {
  const normalizedEtfSymbol = context.etfSymbol.trim().toUpperCase();

  return rawRows.flatMap((row, index) => {
    const stockSymbol = getStringField(row, [
      "stockSymbol",
      "symbol",
      "code",
      "股票代號",
      "證券代號",
      "代號",
    ]).toUpperCase();
    const stockName = getStringField(row, [
      "stockName",
      "name",
      "股票名稱",
      "證券名稱",
      "名稱",
    ]);
    const weightPercent = parseWeightPercent(
      getStringField(row, [
        "weightPercent",
        "weight",
        "percent",
        "權重",
        "持股比例",
        "比例",
      ]),
    );
    const industry = getStringField(row, ["industry", "產業", "類別"]);
    const explicitMarket = normalizeUnderlyingMarketValue(
      getStringField(row, [
        "underlyingMarket",
        "market",
        "市場",
        "成分市場",
        "股票市場",
      ]),
    );

    if (!normalizedEtfSymbol || !stockSymbol || !stockName || !weightPercent) {
      return [];
    }

    const constituent = {
      id: `provider-${normalizedEtfSymbol}-${stockSymbol}-${index}`,
      etfSymbol: normalizedEtfSymbol,
      stockSymbol,
      stockName,
      weightPercent,
      industry: industry || undefined,
      underlyingMarket: explicitMarket,
      asOfDate: context.asOfDate,
      source: context.source,
    };

    return [
      {
        ...constituent,
        underlyingMarket:
          explicitMarket ?? inferConstituentMarket(constituent),
      },
    ];
  });
}

export async function fetchEtfHoldingsByConfig(
  config: EtfProviderConfig,
): Promise<EtfHoldingsFetchResult> {
  const normalizedConfig = {
    ...config,
    etfSymbol: config.etfSymbol.trim().toUpperCase(),
    sourceUrl: config.sourceUrl?.trim() || undefined,
    notes: config.notes?.trim() || undefined,
  };

  if (!normalizedConfig.etfSymbol) {
    return createResult({
      config: normalizedConfig,
      status: "failed",
      errors: ["請先設定 ETF 代號。"],
    });
  }

  if (!normalizedConfig.enabled) {
    return createResult({
      config: normalizedConfig,
      status: "unsupported",
      warnings: ["此 ETF 自動來源目前未啟用。"],
    });
  }

  if (
    normalizedConfig.providerType === "manual" ||
    normalizedConfig.providerType === "csv"
  ) {
    return createResult({
      config: normalizedConfig,
      status: "unsupported",
      warnings: ["此 ETF 目前使用手動或 CSV 匯入。"],
    });
  }

  if (normalizedConfig.providerType === "sitca") {
    return createResult({
      config: normalizedConfig,
      status: "partial",
      source: normalizedConfig.sourceUrl ?? "SITCA",
      warnings: [
        "投信投顧公會資料可能偏月資料，尚未啟用自動抓取。",
        "若需要立即分析，請先使用 CSV 匯入作為備援。",
      ],
    });
  }

  if (normalizedConfig.providerType === "issuer") {
    if (normalizedConfig.etfSymbol === "0050") {
      return fetchYuanta0050Holdings();
    }

    return createResult({
      config: normalizedConfig,
      status: "unsupported",
      warnings: [
        normalizedConfig.sourceUrl
          ? "此 issuer sourceUrl 尚未列入支援清單，暫不抓取任意發行商頁面。"
          : "請先提供官方資料來源 URL；目前尚未啟用任意 issuer 自動抓取。",
        "不會進行脆弱的 HTML scraping，避免資料格式變動造成錯誤分析。",
      ],
    });
  }

  return createResult({
    config: normalizedConfig,
    status: "unsupported",
    warnings: ["custom provider 尚未實作，請先使用 CSV 匯入。"],
  });
}

export function getEtfProviderCapabilityNotes() {
  return [
    "價格資料通常比 ETF 持股更容易自動化，因為交易所收盤價格式較一致。",
    "ETF 持股資料會依發行商、基金類型與揭露頻率而不同。",
    "發行商資料可能是 CSV、Excel、PDF、JSON 或網頁表格，欄位格式不一定一致。",
    "部分公開資料可能偏月資料，未必能代表每日最新持股。",
    "若官方資料無法從瀏覽器穩定取得，CSV 匯入仍是可靠備援。",
  ];
}
