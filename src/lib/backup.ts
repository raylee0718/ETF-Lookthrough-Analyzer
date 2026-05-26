import { APP_SETTINGS_STORAGE_KEY } from "../hooks/useAppSettings";
import { ETF_CONSTITUENTS_STORAGE_KEY } from "../hooks/useEtfConstituents";
import { PRICE_RECORDS_STORAGE_KEY } from "../hooks/usePriceRecords";
import { TRANSACTIONS_STORAGE_KEY } from "../hooks/useTransactions";
import {
  getUnderlyingMarketLabel,
  inferConstituentMarket,
} from "./marketClassification";
import { PORTFOLIO_STORAGE_KEY } from "./portfolioStorage";
import type {
  EtfConstituent,
  IndustryExposure,
  LookthroughExposure,
  PortfolioHolding,
} from "../types/portfolio";
import type { PriceRecord } from "../types/prices";
import type { AppSettings } from "../types/settings";
import type { TransactionRecord } from "../types/transactions";
import type { EtfOverlapResult } from "./overlap";

export type BackupFile = {
  appName: "ETF Lookthrough Analyzer";
  version: "1.0";
  exportedAt: string;
  manualHoldings: PortfolioHolding[];
  etfConstituents: EtfConstituent[];
  transactions: TransactionRecord[];
  priceRecords: PriceRecord[];
  appSettings?: AppSettings;
};

export type BackupPreview = {
  manualHoldingsCount: number;
  etfConstituentSetCount: number;
  etfConstituentRecordCount: number;
  transactionsCount: number;
  priceRecordsCount: number;
  exportedAt?: string;
  hasAppSettings: boolean;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isPortfolioHolding = (value: unknown): value is PortfolioHolding => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.symbol === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    typeof value.marketValue === "number" &&
    Number.isFinite(value.marketValue) &&
    (value.note === undefined || typeof value.note === "string")
  );
};

const isEtfConstituent = (value: unknown): value is EtfConstituent => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.etfSymbol === "string" &&
    typeof value.stockSymbol === "string" &&
    typeof value.stockName === "string" &&
    typeof value.weightPercent === "number" &&
    Number.isFinite(value.weightPercent) &&
    (value.industry === undefined || typeof value.industry === "string") &&
    (value.underlyingMarket === undefined ||
      value.underlyingMarket === "TW" ||
      value.underlyingMarket === "US" ||
      value.underlyingMarket === "OTHER" ||
      value.underlyingMarket === "UNKNOWN") &&
    (value.asOfDate === undefined || typeof value.asOfDate === "string") &&
    (value.source === undefined || typeof value.source === "string")
  );
};

const isTransactionRecord = (value: unknown): value is TransactionRecord => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.date === "string" &&
    typeof value.symbol === "string" &&
    typeof value.name === "string" &&
    typeof value.category === "string" &&
    (value.type === "buy" || value.type === "sell") &&
    typeof value.shares === "number" &&
    Number.isFinite(value.shares) &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    (value.fee === undefined ||
      (typeof value.fee === "number" && Number.isFinite(value.fee))) &&
    (value.tax === undefined ||
      (typeof value.tax === "number" && Number.isFinite(value.tax))) &&
    (value.note === undefined || typeof value.note === "string")
  );
};

const isPriceRecord = (value: unknown): value is PriceRecord => {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.symbol === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    typeof value.date === "string" &&
    (value.sourceType === undefined ||
      value.sourceType === "manual" ||
      value.sourceType === "csv" ||
      value.sourceType === "provider") &&
    (value.name === undefined || typeof value.name === "string") &&
    (value.source === undefined || typeof value.source === "string") &&
    (value.fetchedAt === undefined || typeof value.fetchedAt === "string") &&
    (value.note === undefined || typeof value.note === "string")
  );
};

const isAppSettings = (value: unknown): value is AppSettings =>
  isObject(value) &&
  (value.portfolioDataSourceMode === "manual" ||
    value.portfolioDataSourceMode === "transactions");

export const createBackupFile = ({
  manualHoldings,
  etfConstituents,
  transactions,
  priceRecords,
  appSettings,
}: Omit<BackupFile, "appName" | "version" | "exportedAt">): BackupFile => ({
  appName: "ETF Lookthrough Analyzer",
  version: "1.0",
  exportedAt: new Date().toISOString(),
  manualHoldings,
  etfConstituents,
  transactions,
  priceRecords,
  appSettings,
});

export const validateBackupFile = (
  value: unknown,
): { backup?: BackupFile; error?: string; preview?: BackupPreview } => {
  if (!isObject(value)) {
    return { error: "檔案格式不正確，最外層必須是 JSON 物件。" };
  }

  if (value.appName !== "ETF Lookthrough Analyzer") {
    return { error: "這不是 ETF Lookthrough Analyzer 的備份檔。" };
  }

  if (value.version !== "1.0") {
    return { error: "備份檔版本不支援。" };
  }

  const requiredArrays = [
    ["manualHoldings", value.manualHoldings],
    ["etfConstituents", value.etfConstituents],
    ["transactions", value.transactions],
    ["priceRecords", value.priceRecords],
  ] as const;

  const invalidField = requiredArrays.find(([, fieldValue]) => !Array.isArray(fieldValue));

  if (invalidField) {
    return { error: `備份檔缺少有效的 ${invalidField[0]} 陣列。` };
  }

  const manualHoldings = value.manualHoldings as unknown[];
  const etfConstituents = value.etfConstituents as unknown[];
  const transactions = value.transactions as unknown[];
  const priceRecords = value.priceRecords as unknown[];

  if (!manualHoldings.every(isPortfolioHolding)) {
    return { error: "備份檔的手動持股資料不相容。" };
  }

  if (!etfConstituents.every(isEtfConstituent)) {
    return { error: "備份檔的 ETF 成分股資料不相容。" };
  }

  if (!transactions.every(isTransactionRecord)) {
    return { error: "備份檔的交易紀錄不相容。" };
  }

  if (!priceRecords.every(isPriceRecord)) {
    return { error: "備份檔的價格資料不相容。" };
  }

  if (value.appSettings !== undefined && !isAppSettings(value.appSettings)) {
    return { error: "備份檔的使用設定不相容。" };
  }

  const appSettings = value.appSettings;
  const exportedAt =
    typeof value.exportedAt === "string" ? value.exportedAt : undefined;
  const backup = {
    appName: "ETF Lookthrough Analyzer",
    version: "1.0",
    exportedAt: exportedAt ?? new Date().toISOString(),
    manualHoldings,
    etfConstituents,
    transactions,
    priceRecords,
    appSettings,
  } satisfies BackupFile;
  const etfConstituentSetCount = new Set(
    backup.etfConstituents.map((constituent) => constituent.etfSymbol.toUpperCase()),
  ).size;

  return {
    backup,
    preview: {
      manualHoldingsCount: backup.manualHoldings.length,
      etfConstituentSetCount,
      etfConstituentRecordCount: backup.etfConstituents.length,
      transactionsCount: backup.transactions.length,
      priceRecordsCount: backup.priceRecords.length,
      exportedAt,
      hasAppSettings: Boolean(backup.appSettings),
    },
  };
};

export const restoreBackupToLocalStorage = (backup: BackupFile) => {
  window.localStorage.setItem(
    PORTFOLIO_STORAGE_KEY,
    JSON.stringify(backup.manualHoldings),
  );
  window.localStorage.setItem(
    ETF_CONSTITUENTS_STORAGE_KEY,
    JSON.stringify(backup.etfConstituents),
  );
  window.localStorage.setItem(
    TRANSACTIONS_STORAGE_KEY,
    JSON.stringify(backup.transactions),
  );
  window.localStorage.setItem(
    PRICE_RECORDS_STORAGE_KEY,
    JSON.stringify(backup.priceRecords),
  );

  if (backup.appSettings) {
    window.localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify(backup.appSettings),
    );
  } else {
    window.localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
  }
};

const csvCell = (value: unknown) => {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export const toCsv = (headers: string[], rows: unknown[][]) => {
  const csvLines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];

  return `\uFEFF${csvLines.join("\r\n")}`;
};

export const downloadTextFile = (
  filename: string,
  content: string,
  type = "text/plain;charset=utf-8",
) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const manualHoldingsToCsv = (holdings: PortfolioHolding[]) =>
  toCsv(
    ["代號", "名稱", "分類", "市值", "備註"],
    holdings.map((holding) => [
      holding.symbol,
      holding.name,
      holding.category,
      holding.marketValue,
      holding.note ?? "",
    ]),
  );

export const etfConstituentsToCsv = (constituents: EtfConstituent[]) =>
  toCsv(
    [
      "ETF 代號",
      "股票代號",
      "股票名稱",
      "權重",
      "成分市場",
      "產業",
      "資料日期",
      "來源",
    ],
    constituents.map((constituent) => [
      constituent.etfSymbol,
      constituent.stockSymbol,
      constituent.stockName,
      constituent.weightPercent,
      getUnderlyingMarketLabel(inferConstituentMarket(constituent)),
      constituent.industry ?? "",
      constituent.asOfDate ?? "",
      constituent.source ?? "",
    ]),
  );

export const transactionsToCsv = (transactions: TransactionRecord[]) =>
  toCsv(
    ["日期", "類型", "代號", "名稱", "分類", "股數", "成交價", "手續費", "稅", "備註"],
    transactions.map((transaction) => [
      transaction.date,
      transaction.type === "buy" ? "買進" : "賣出",
      transaction.symbol,
      transaction.name,
      transaction.category,
      transaction.shares,
      transaction.price,
      transaction.fee ?? 0,
      transaction.tax ?? 0,
      transaction.note ?? "",
    ]),
  );

export const priceRecordsToCsv = (priceRecords: PriceRecord[]) =>
  toCsv(
    ["日期", "代號", "名稱", "價格", "來源", "備註"],
    priceRecords.map((record) => [
      record.date,
      record.symbol,
      record.name ?? "",
      record.price,
      record.source ?? "",
      record.note ?? "",
    ]),
  );

export const lookthroughExposuresToCsv = (exposures: LookthroughExposure[]) =>
  toCsv(
    [
      "股票代號",
      "股票名稱",
      "穿透後金額",
      "投資組合佔比",
      "成分市場",
      "產業",
      "來源",
    ],
    exposures.map((exposure) => [
      exposure.stockSymbol,
      exposure.stockName,
      exposure.exposureValue,
      exposure.portfolioWeight,
      getUnderlyingMarketLabel(exposure.underlyingMarket),
      exposure.industry ?? "未分類",
      exposure.sources
        .map(
          (source) =>
            `${source.sourceSymbol} ${source.sourceName}: ${source.exposureValue}`,
        )
        .join("; "),
    ]),
  );

export const industryExposuresToCsv = (exposures: IndustryExposure[]) =>
  toCsv(
    ["產業", "穿透後金額", "投資組合佔比"],
    exposures.map((exposure) => [
      exposure.industry,
      exposure.exposureValue,
      exposure.portfolioWeight,
    ]),
  );

export const overlapPairsToCsv = (pairs: EtfOverlapResult[]) =>
  toCsv(
    [
      "ETF A",
      "ETF B",
      "共同持股數",
      "ETF A 成分股數",
      "ETF B 成分股數",
      "ETF A 重複比例",
      "ETF B 重複比例",
      "加權重疊率",
    ],
    pairs.map((pair) => [
      pair.etfA,
      pair.etfB,
      pair.sharedStockCount,
      pair.etfAStockCount,
      pair.etfBStockCount,
      pair.overlapByCountA,
      pair.overlapByCountB,
      pair.weightedOverlap,
    ]),
  );
