import { parseYuanta00646HoldingsResponse } from "../lib/taiwanEtfProviders";

export const sample00646HoldingsResponse = {
  PCF: {
    markcd: "00646",
    trandate: "20260521",
    anndate: "20260525",
    upddate: "2026-05-22 14:21:21",
  },
  FundWeights: {
    StockWeights: [
      {
        code: "NVDA UQ",
        name: "NVIDIA CORP",
        ename: "NVIDIA Corp",
        weights: 8.18,
        qty: 479517,
      },
      {
        code: "AAPL UQ",
        name: "APPLE INC",
        ename: "Apple Inc",
        weights: "6.87%",
        qty: 289706,
      },
      {
        code: "JPM UN",
        name: "JPMORGAN CHASE & CO",
        ename: "JPMorgan Chase & Co",
        weights: "1.25",
        qty: 53205,
      },
      {
        code: "BRK/B UN",
        name: "BERKSHIRE HATHAWAY INC-CL B",
        ename: "Berkshire Hathaway Inc",
        weights: 1.35,
        qty: 36185,
      },
      {
        code: "BF/B UN",
        name: "BROWN-FORMAN CORP-CLASS B",
        ename: "Brown-Forman Corp",
        weights: 0.01,
        qty: 3372,
      },
      {
        code: "BAD ROW",
        name: "INVALID WEIGHT ROW",
        ename: "Invalid Weight Row",
        weights: "--",
        qty: 100,
      },
    ],
    FutureWeights: [
      {
        code: "ES",
        ym: "202606",
        name: "小S&P500指數期貨",
        ename: "Mini S&P500 Index Futures",
        weights: 2.15,
        qty: 74,
      },
    ],
    ETFWeights: [],
    BondWeights: [],
  },
  Cash: {
    CashPosition: [
      {
        code: "1500",
        name: "現金",
        ename: "CASH",
        crncy: "NTD",
        rto: 1.1559,
        amt: 469844777,
      },
    ],
    Margin: [
      {
        code: null,
        name: "保證金",
        ename: "Margin",
        crncy: "USD",
        rto: 0,
        amt: 12866365.17,
      },
    ],
  },
};

export const runSample00646ParserSmokeTest = () => {
  const parsed = parseYuanta00646HoldingsResponse(
    sample00646HoldingsResponse,
  );

  return {
    parsedCount: parsed.constituents.length,
    firstParsedRow: parsed.constituents[0],
    warnings: parsed.warnings,
    errors: parsed.errors,
    futuresAndCashIgnored:
      parsed.ignoredNonStockRows.futures === 1 &&
      parsed.ignoredNonStockRows.cash === 1 &&
      parsed.ignoredNonStockRows.margin === 1,
    ignoredNonStockRows: parsed.ignoredNonStockRows,
  };
};
