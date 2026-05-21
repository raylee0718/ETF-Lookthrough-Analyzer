import { parseFirst00994AGetHdResponse } from "../lib/taiwanEtfProviders";

const sample00994AGetHdRows = [
  {
    fundid: "182",
    sdate: "2026-05-21",
    group: "1",
    A: "2330",
    B: "台積電",
    C: "16.01",
    D: "382,999",
    E: "",
  },
  {
    fundid: "182",
    sdate: "2026-05-21",
    group: "1",
    A: "2383.TW",
    B: "台光電",
    C: "6.50%",
    D: "74,000",
    E: "",
  },
  {
    fundid: "182",
    sdate: "2026-05-21",
    group: "5",
    A: "股票",
    B: "95.60",
    C: "",
    D: "",
    E: "",
  },
  {
    fundid: "182",
    sdate: "2026-05-21",
    group: "1",
    A: "",
    B: "無效列",
    C: "",
    D: "0",
    E: "",
  },
];

export const sample00994AGetHdResponse = {
  d: JSON.stringify(sample00994AGetHdRows),
};

export function runSample00994AParserSmokeTest() {
  const parsed = parseFirst00994AGetHdResponse(sample00994AGetHdResponse);

  return {
    parsedConstituentsCount: parsed.constituents.length,
    firstParsedRow: parsed.constituents[0],
    warnings: parsed.warnings,
    errors: parsed.errors,
  };
}
