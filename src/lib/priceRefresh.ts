import type {
  PriceRecordInput,
  UpsertManyPriceRecordsResult,
} from "../hooks/usePriceRecords";
import {
  fetchedPricesToPriceRecords,
  fetchTpexClosingPrices,
  fetchTwseClosingPrices,
} from "./priceProviders";
import type { PriceRecord } from "../types/prices";
import type { PriceProviderMarket, PriceProviderResult } from "../types/priceProvider";

type RefreshAvailableClosingPricesInput = {
  priceRecords: PriceRecord[];
  upsertManyPriceRecords: (
    records: PriceRecordInput[],
    options: { replaceSameDateSymbol: boolean },
  ) => UpsertManyPriceRecordsResult;
};

export type PriceRefreshSummary = {
  fetchedCount: number;
  importedCount: number;
  replacedCount: number;
  skippedCount: number;
  warnings: string[];
  errors: string[];
  fetchedAt: string;
  marketsUpdated: PriceProviderMarket[];
};

const providerTasks: {
  market: PriceProviderMarket;
  fetchPrices?: () => Promise<PriceProviderResult>;
}[] = [
  { market: "twse", fetchPrices: fetchTwseClosingPrices },
  { market: "tpex", fetchPrices: fetchTpexClosingPrices },
];

const marketLabels: Record<PriceProviderMarket, string> = {
  twse: "上市",
  tpex: "上櫃",
};

export async function refreshAvailableClosingPrices({
  priceRecords,
  upsertManyPriceRecords,
}: RefreshAvailableClosingPricesInput): Promise<PriceRefreshSummary> {
  const fetchedAt = new Date().toISOString();
  const warnings: string[] = [];
  const errors: string[] = [];
  const fetchedRecords: PriceRecordInput[] = [];
  const marketsUpdated = new Set<PriceProviderMarket>();

  const settledResults = await Promise.all(
    providerTasks.map(async ({ market, fetchPrices }) => {
      if (!fetchPrices) {
        return {
          market,
          result: undefined,
          warning: `${marketLabels[market]}市場尚未支援自動更新。`,
        };
      }

      try {
        return {
          market,
          result: await fetchPrices(),
          warning: undefined,
        };
      } catch {
        return {
          market,
          result: undefined,
          warning: undefined,
          error: `${marketLabels[market]}價格更新失敗，請稍後再試，或改用每日價格 CSV 匯入。`,
        };
      }
    }),
  );

  settledResults.forEach(({ market, result, warning, error }) => {
    if (warning) {
      warnings.push(warning);
    }

    if (error) {
      errors.push(error);
    }

    if (!result) {
      return;
    }

    warnings.push(...result.warnings);
    errors.push(...result.errors);

    if (result.prices.length > 0) {
      marketsUpdated.add(market);
      fetchedRecords.push(...fetchedPricesToPriceRecords(result.prices));
    }
  });

  const unchangedFetchedKeys = new Set(
    fetchedRecords
      .filter((record) =>
        priceRecords.some(
          (existingRecord) =>
            existingRecord.date === record.date &&
            existingRecord.symbol.toUpperCase() === record.symbol.toUpperCase() &&
            existingRecord.price === record.price,
        ),
      )
      .map((record) => `${record.date}:${record.symbol.toUpperCase()}`),
  );
  const changedFetchedRecords = fetchedRecords.filter(
    (record) => !unchangedFetchedKeys.has(`${record.date}:${record.symbol.toUpperCase()}`),
  );
  const duplicateFetchedCount =
    changedFetchedRecords.length -
    new Set(
      changedFetchedRecords.map(
        (record) => `${record.date}:${record.symbol.toUpperCase()}`,
      ),
    ).size;

  const upsertResult =
    changedFetchedRecords.length > 0
      ? upsertManyPriceRecords(changedFetchedRecords, {
          replaceSameDateSymbol: true,
        })
      : { importedCount: 0, replacedCount: 0, skippedDuplicateCount: 0 };

  return {
    fetchedCount: fetchedRecords.length,
    importedCount: upsertResult.importedCount,
    replacedCount: upsertResult.replacedCount,
    skippedCount:
      upsertResult.skippedDuplicateCount +
      duplicateFetchedCount +
      unchangedFetchedKeys.size,
    warnings: Array.from(new Set(warnings)),
    errors: Array.from(new Set(errors)),
    fetchedAt,
    marketsUpdated: Array.from(marketsUpdated),
  };
}
