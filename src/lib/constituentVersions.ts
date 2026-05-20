import type { EtfConstituent } from "../types/portfolio";

export const UNSPECIFIED_AS_OF_DATE = "未指定日期";

export type EtfConstituentDataStatus = {
  etfSymbol: string;
  latestAsOfDate: string;
  source?: string;
  recordCount: number;
  hasMissingDate: boolean;
};

export const normalizeConstituentDate = (asOfDate?: string) =>
  asOfDate?.trim() || UNSPECIFIED_AS_OF_DATE;

const normalizeEtfSymbol = (etfSymbol: string) => etfSymbol.trim().toUpperCase();

const compareConstituentDates = (a: string, b: string) => {
  if (a === b) return 0;
  if (a === UNSPECIFIED_AS_OF_DATE) return -1;
  if (b === UNSPECIFIED_AS_OF_DATE) return 1;
  return a.localeCompare(b);
};

const getLatestDateByEtf = (constituents: EtfConstituent[]) => {
  const latestDateByEtf = new Map<string, string>();

  constituents.forEach((constituent) => {
    const etfSymbol = normalizeEtfSymbol(constituent.etfSymbol);
    const asOfDate = normalizeConstituentDate(constituent.asOfDate);
    const currentLatestDate = latestDateByEtf.get(etfSymbol);

    if (!currentLatestDate || compareConstituentDates(asOfDate, currentLatestDate) > 0) {
      latestDateByEtf.set(etfSymbol, asOfDate);
    }
  });

  return latestDateByEtf;
};

export const getLatestConstituentsByEtf = (constituents: EtfConstituent[]) => {
  const latestDateByEtf = getLatestDateByEtf(constituents);

  return constituents.filter((constituent) => {
    const etfSymbol = normalizeEtfSymbol(constituent.etfSymbol);
    return latestDateByEtf.get(etfSymbol) === normalizeConstituentDate(constituent.asOfDate);
  });
};

export const getLatestConstituentDataStatuses = (
  constituents: EtfConstituent[],
): EtfConstituentDataStatus[] => {
  const latestConstituents = getLatestConstituentsByEtf(constituents);
  const allRecordsByEtf = new Map<string, EtfConstituent[]>();
  const latestRecordsByEtf = new Map<string, EtfConstituent[]>();

  constituents.forEach((constituent) => {
    const etfSymbol = normalizeEtfSymbol(constituent.etfSymbol);
    allRecordsByEtf.set(etfSymbol, [...(allRecordsByEtf.get(etfSymbol) ?? []), constituent]);
  });

  latestConstituents.forEach((constituent) => {
    const etfSymbol = normalizeEtfSymbol(constituent.etfSymbol);
    latestRecordsByEtf.set(etfSymbol, [
      ...(latestRecordsByEtf.get(etfSymbol) ?? []),
      constituent,
    ]);
  });

  return Array.from(latestRecordsByEtf.entries())
    .map(([etfSymbol, records]) => {
      const latestAsOfDate = normalizeConstituentDate(records[0]?.asOfDate);
      const allRecords = allRecordsByEtf.get(etfSymbol) ?? [];

      return {
        etfSymbol,
        latestAsOfDate,
        source: records.find((record) => record.source?.trim())?.source,
        recordCount: records.length,
        hasMissingDate: allRecords.some(
          (record) => normalizeConstituentDate(record.asOfDate) === UNSPECIFIED_AS_OF_DATE,
        ),
      };
    })
    .sort((a, b) => a.etfSymbol.localeCompare(b.etfSymbol));
};

