import { useEffect, useState } from "react";
import { mockEtfConstituents } from "../data/mockData";
import { getLatestConstituentsByEtf } from "../lib/constituentVersions";
import type { EtfConstituent } from "../types/portfolio";

export const ETF_CONSTITUENTS_STORAGE_KEY = "etf-lookthrough-etf-constituents";

export type EtfConstituentInput = Omit<EtfConstituent, "id">;

const isEtfConstituent = (value: unknown): value is EtfConstituent => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const constituent = value as Record<string, unknown>;

  return (
    typeof constituent.id === "string" &&
    typeof constituent.etfSymbol === "string" &&
    typeof constituent.stockSymbol === "string" &&
    typeof constituent.stockName === "string" &&
    typeof constituent.weightPercent === "number" &&
    Number.isFinite(constituent.weightPercent) &&
    (constituent.industry === undefined ||
      typeof constituent.industry === "string") &&
    (constituent.asOfDate === undefined ||
      typeof constituent.asOfDate === "string") &&
    (constituent.source === undefined || typeof constituent.source === "string")
  );
};

const parseStoredConstituents = (rawValue: string | null) => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue) || !parsedValue.every(isEtfConstituent)) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
};

const createConstituentId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `constituent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeInput = (
  input: EtfConstituentInput,
): EtfConstituentInput => ({
  etfSymbol: input.etfSymbol.trim().toUpperCase(),
  stockSymbol: input.stockSymbol.trim().toUpperCase(),
  stockName: input.stockName.trim(),
  weightPercent: input.weightPercent,
  industry: input.industry?.trim() || undefined,
  asOfDate: input.asOfDate?.trim() || undefined,
  source: input.source?.trim() || undefined,
});

export function useEtfConstituents() {
  const [constituents, setConstituents] = useState<EtfConstituent[]>(() => {
    const storedConstituents = parseStoredConstituents(
      window.localStorage.getItem(ETF_CONSTITUENTS_STORAGE_KEY),
    );

    return storedConstituents ?? mockEtfConstituents;
  });

  useEffect(() => {
    window.localStorage.setItem(
      ETF_CONSTITUENTS_STORAGE_KEY,
      JSON.stringify(constituents),
    );
  }, [constituents]);

  const addConstituent = (input: EtfConstituentInput) => {
    const normalizedInput = normalizeInput(input);

    setConstituents((currentConstituents) => [
      ...currentConstituents,
      {
        id: createConstituentId(),
        ...normalizedInput,
      },
    ]);
  };

  const updateConstituent = (id: string, input: EtfConstituentInput) => {
    const normalizedInput = normalizeInput(input);

    setConstituents((currentConstituents) =>
      currentConstituents.map((constituent) =>
        constituent.id === id
          ? { ...constituent, ...normalizedInput }
          : constituent,
      ),
    );
  };

  const deleteConstituent = (id: string) => {
    setConstituents((currentConstituents) =>
      currentConstituents.filter((constituent) => constituent.id !== id),
    );
  };

  const replaceConstituentsForEtf = (
    etfSymbol: string,
    records: EtfConstituentInput[],
  ) => {
    const normalizedEtfSymbol = etfSymbol.trim().toUpperCase();
    const replacementRecords = records.map((record) => ({
      id: createConstituentId(),
      ...normalizeInput({
        ...record,
        etfSymbol: normalizedEtfSymbol,
      }),
    }));

    setConstituents((currentConstituents) => [
      ...currentConstituents.filter(
        (constituent) => constituent.etfSymbol !== normalizedEtfSymbol,
      ),
      ...replacementRecords,
    ]);
  };

  const getLatestConstituents = () => getLatestConstituentsByEtf(constituents);

  const resetConstituents = () => {
    setConstituents(mockEtfConstituents);
  };

  return {
    constituents,
    addConstituent,
    updateConstituent,
    deleteConstituent,
    replaceConstituentsForEtf,
    getLatestConstituents,
    resetConstituents,
  };
}
