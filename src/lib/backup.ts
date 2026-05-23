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
  etfConstituentsCount: number;
  transactionsCount: number;
  priceRecordsCount: number;
  hasAppSettings: boolean;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

  const appSettings = isObject(value.appSettings)
    ? (value.appSettings as AppSettings)
    : undefined;
  const backup = {
    appName: "ETF Lookthrough Analyzer",
    version: "1.0",
    exportedAt:
      typeof value.exportedAt === "string" ? value.exportedAt : new Date().toISOString(),
    manualHoldings: value.manualHoldings as PortfolioHolding[],
    etfConstituents: value.etfConstituents as EtfConstituent[],
    transactions: value.transactions as TransactionRecord[],
    priceRecords: value.priceRecords as PriceRecord[],
    appSettings,
  } satisfies BackupFile;

  return {
    backup,
    preview: {
      manualHoldingsCount: backup.manualHoldings.length,
      etfConstituentsCount: backup.etfConstituents.length,
      transactionsCount: backup.transactions.length,
      priceRecordsCount: backup.priceRecords.length,
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
