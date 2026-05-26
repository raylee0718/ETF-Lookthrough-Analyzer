import { calculatePositionsFromTransactions } from "./positions";
import {
  calculatePositionsWithMarketValue,
  convertPricedPositionsToPortfolioHoldings,
} from "./prices";
import type { PortfolioHolding } from "../types/portfolio";
import type { PriceRecord } from "../types/prices";
import type { AppSettings, PortfolioDataSourceMode } from "../types/settings";
import type { TransactionRecord } from "../types/transactions";

type PortfolioSourceInput = {
  mode: AppSettings["portfolioDataSourceMode"];
  manualHoldings: PortfolioHolding[];
  transactions: TransactionRecord[];
  priceRecords: PriceRecord[];
};

export function getPortfolioDataSourceLabel(mode: PortfolioDataSourceMode) {
  return mode === "manual" ? "我的持股" : "交易紀錄";
}

export function getPortfolioHoldingsForAnalysis({
  mode,
  manualHoldings,
  transactions,
  priceRecords,
}: PortfolioSourceInput) {
  const shouldUseTransactions = transactions.length > 0 || mode === "transactions";

  if (!shouldUseTransactions) {
    const totalMarketValue = manualHoldings.reduce(
      (sum, holding) => sum + holding.marketValue,
      0,
    );

    return {
      holdingsForAnalysis: manualHoldings,
      dataQualityNotes: [
        "根據目前持股與已儲存的 ETF 成分股資料，查看實際底層曝險。",
      ],
      missingPriceSymbols: [] as string[],
      totalMarketValue,
      modeLabel: getPortfolioDataSourceLabel(mode),
    };
  }

  const { positions } = calculatePositionsFromTransactions(transactions);
  const pricedPositions = calculatePositionsWithMarketValue(
    positions,
    priceRecords,
  );
  const holdingsForAnalysis =
    convertPricedPositionsToPortfolioHoldings(pricedPositions);
  const missingPriceSymbols = pricedPositions
    .filter((position) => position.shares > 0 && position.priceStatus === "missing")
    .map((position) => position.symbol);
  const dataQualityNotes = [
    "根據交易紀錄與價格表估算市值。",
  ];

  if (missingPriceSymbols.length > 0) {
    dataQualityNotes.push("部分標的缺少價格，暫以投入成本估算市值。");
  }

  return {
    holdingsForAnalysis,
    dataQualityNotes,
    missingPriceSymbols,
    totalMarketValue: pricedPositions.reduce(
      (sum, position) => sum + position.marketValue,
      0,
    ),
    modeLabel: getPortfolioDataSourceLabel(mode),
  };
}
