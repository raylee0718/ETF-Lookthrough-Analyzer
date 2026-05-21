import { parseUniPresident00981APcfResponse } from "../lib/taiwanEtfProviders";

export const sample00981APcfResponse = {
  pcf: [
    {
      TranDate: "2026-05-21T00:00:00",
      PostDate: "2026-05-22T00:00:00",
    },
  ],
  fund: {
    sStockNo: "00981A",
  },
  asset: [
    {
      AssetCode: "ST",
      AssetName: "股票",
      Details: [
        {
          DetailCode: "2330",
          DetailName: "台積電",
          Share: "11657000",
          Amount: "25995110000.00",
          NavRate: "9.93",
          TranDate: "2026-05-21T00:00:00",
        },
        {
          DetailCode: "2383.TW",
          DetailName: "台光電",
          Share: "4723000",
          Amount: "22150870000.00",
          NavRate: "8.46%",
          TranDate: "2026-05-21T00:00:00",
        },
        {
          DetailCode: "INVALID",
          DetailName: "無效列",
          Share: "0",
          Amount: "0",
          NavRate: "",
          TranDate: "2026-05-21T00:00:00",
        },
      ],
    },
  ],
};

export function runSample00981APcfParserSmokeTest() {
  const parsed = parseUniPresident00981APcfResponse(sample00981APcfResponse);

  return {
    parsedConstituentsCount: parsed.constituents.length,
    firstParsedRow: parsed.constituents[0],
    warnings: parsed.warnings,
    errors: parsed.errors,
  };
}
