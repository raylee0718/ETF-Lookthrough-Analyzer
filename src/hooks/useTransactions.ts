import { useEffect, useMemo, useState } from "react";
import type { TransactionRecord } from "../types/transactions";

export const TRANSACTIONS_STORAGE_KEY = "etf-lookthrough-transactions";

export type TransactionInput = Omit<TransactionRecord, "id">;

const isTransactionRecord = (value: unknown): value is TransactionRecord => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const transaction = value as Record<string, unknown>;

  return (
    typeof transaction.id === "string" &&
    typeof transaction.date === "string" &&
    typeof transaction.symbol === "string" &&
    typeof transaction.name === "string" &&
    typeof transaction.category === "string" &&
    (transaction.type === "buy" || transaction.type === "sell") &&
    typeof transaction.shares === "number" &&
    Number.isFinite(transaction.shares) &&
    typeof transaction.price === "number" &&
    Number.isFinite(transaction.price) &&
    (transaction.fee === undefined ||
      (typeof transaction.fee === "number" && Number.isFinite(transaction.fee))) &&
    (transaction.tax === undefined ||
      (typeof transaction.tax === "number" && Number.isFinite(transaction.tax))) &&
    (transaction.note === undefined || typeof transaction.note === "string")
  );
};

const parseStoredTransactions = (rawValue: string | null) => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue) || !parsedValue.every(isTransactionRecord)) {
      return [];
    }

    return parsedValue;
  } catch {
    return [];
  }
};

const createTransactionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `transaction-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeInput = (input: TransactionInput): TransactionInput => ({
  date: input.date,
  symbol: input.symbol.trim().toUpperCase(),
  name: input.name.trim(),
  category: input.category.trim(),
  type: input.type,
  shares: input.shares,
  price: input.price,
  fee: input.fee && input.fee > 0 ? input.fee : undefined,
  tax: input.tax && input.tax > 0 ? input.tax : undefined,
  note: input.note?.trim() || undefined,
});

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() =>
    parseStoredTransactions(window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY)),
  );

  useEffect(() => {
    window.localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(transactions),
    );
  }, [transactions]);

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        return dateCompare !== 0 ? dateCompare : b.id.localeCompare(a.id);
      }),
    [transactions],
  );

  const addTransaction = (input: TransactionInput) => {
    const normalizedInput = normalizeInput(input);

    setTransactions((currentTransactions) => [
      ...currentTransactions,
      {
        id: createTransactionId(),
        ...normalizedInput,
      },
    ]);
  };

  const updateTransaction = (id: string, input: TransactionInput) => {
    const normalizedInput = normalizeInput(input);

    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === id
          ? { ...transaction, ...normalizedInput }
          : transaction,
      ),
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions((currentTransactions) =>
      currentTransactions.filter((transaction) => transaction.id !== id),
    );
  };

  const resetTransactions = () => {
    setTransactions([]);
  };

  return {
    transactions: sortedTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    resetTransactions,
  };
}
