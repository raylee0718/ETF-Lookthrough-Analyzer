import { useEffect, useMemo, useState } from "react";
import type { PriceRecord } from "../types/prices";

export const PRICE_RECORDS_STORAGE_KEY = "etf-lookthrough-price-records";

export type PriceRecordInput = Omit<PriceRecord, "id">;

const isPriceRecord = (value: unknown): value is PriceRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "string" &&
    typeof record.symbol === "string" &&
    typeof record.price === "number" &&
    Number.isFinite(record.price) &&
    typeof record.date === "string" &&
    (record.sourceType === undefined ||
      record.sourceType === "manual" ||
      record.sourceType === "csv" ||
      record.sourceType === "provider") &&
    (record.name === undefined || typeof record.name === "string") &&
    (record.source === undefined || typeof record.source === "string") &&
    (record.fetchedAt === undefined || typeof record.fetchedAt === "string") &&
    (record.note === undefined || typeof record.note === "string")
  );
};

const parseStoredPriceRecords = (rawValue: string | null) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue) || !parsedValue.every(isPriceRecord)) {
      return [];
    }

    return parsedValue;
  } catch {
    return [];
  }
};

const createPriceRecordId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `price-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeInput = (input: PriceRecordInput): PriceRecordInput => ({
  symbol: input.symbol.trim().toUpperCase(),
  name: input.name?.trim() || undefined,
  price: input.price,
  date: input.date,
  sourceType: input.sourceType ?? "manual",
  source: input.source?.trim() || undefined,
  fetchedAt: input.fetchedAt,
  note: input.note?.trim() || undefined,
});

export function usePriceRecords() {
  const [priceRecords, setPriceRecords] = useState<PriceRecord[]>(() =>
    parseStoredPriceRecords(window.localStorage.getItem(PRICE_RECORDS_STORAGE_KEY)),
  );

  useEffect(() => {
    window.localStorage.setItem(
      PRICE_RECORDS_STORAGE_KEY,
      JSON.stringify(priceRecords),
    );
  }, [priceRecords]);

  const sortedPriceRecords = useMemo(
    () =>
      [...priceRecords].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        return dateCompare !== 0 ? dateCompare : b.id.localeCompare(a.id);
      }),
    [priceRecords],
  );

  const addPriceRecord = (input: PriceRecordInput) => {
    const normalizedInput = normalizeInput(input);

    setPriceRecords((currentRecords) => [
      ...currentRecords,
      {
        id: createPriceRecordId(),
        ...normalizedInput,
      },
    ]);
  };

  const updatePriceRecord = (id: string, input: PriceRecordInput) => {
    const normalizedInput = normalizeInput(input);

    setPriceRecords((currentRecords) =>
      currentRecords.map((record) =>
        record.id === id ? { ...record, ...normalizedInput } : record,
      ),
    );
  };

  const deletePriceRecord = (id: string) => {
    setPriceRecords((currentRecords) =>
      currentRecords.filter((record) => record.id !== id),
    );
  };

  const upsertLatestPrice = (input: PriceRecordInput) => {
    const normalizedInput = normalizeInput(input);

    setPriceRecords((currentRecords) => {
      const existingRecord = currentRecords.find(
        (record) =>
          record.symbol.toUpperCase() === normalizedInput.symbol &&
          record.date === normalizedInput.date,
      );

      if (!existingRecord) {
        return [
          ...currentRecords,
          {
            id: createPriceRecordId(),
            ...normalizedInput,
          },
        ];
      }

      return currentRecords.map((record) =>
        record.id === existingRecord.id
          ? { ...record, ...normalizedInput }
          : record,
      );
    });
  };

  const resetPriceRecords = () => {
    setPriceRecords([]);
  };

  return {
    priceRecords: sortedPriceRecords,
    addPriceRecord,
    updatePriceRecord,
    deletePriceRecord,
    upsertLatestPrice,
    resetPriceRecords,
  };
}
