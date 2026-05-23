import type {
  EtfConstituent,
  IndustryExposure,
  LookthroughExposure,
  PortfolioHolding,
} from "../types/portfolio";

// Step 1/2 only: all values below are mock data for UI preview.
// Real ETF constituent sourcing and lookthrough calculation logic will be added later.
export const mockPortfolioHoldings: PortfolioHolding[] = [
  {
    id: "holding-0050",
    symbol: "0050",
    name: "元大台灣50",
    category: "台股核心 ETF",
    marketValue: 260000,
    note: "範例資料",
  },
  {
    id: "holding-00646",
    symbol: "00646",
    name: "元大S&P500",
    category: "美股核心 ETF",
    marketValue: 180000,
    note: "範例資料",
  },
  {
    id: "holding-00981a",
    symbol: "00981A",
    name: "主動型台股ETF",
    category: "台股主動 ETF",
    marketValue: 220000,
    note: "範例資料",
  },
  {
    id: "holding-2412",
    symbol: "2412",
    name: "中華電",
    category: "防禦型股票",
    marketValue: 95000,
  },
  {
    id: "holding-2891",
    symbol: "2891",
    name: "中信金",
    category: "金融股",
    marketValue: 76000,
  },
];

export const mockEtfConstituents: EtfConstituent[] = [
  {
    id: "0050-2330",
    etfSymbol: "0050",
    stockSymbol: "2330",
    stockName: "台積電",
    weightPercent: 48,
    industry: "半導體",
    underlyingMarket: "TW",
  },
  {
    id: "0050-2317",
    etfSymbol: "0050",
    stockSymbol: "2317",
    stockName: "鴻海",
    weightPercent: 5.1,
    industry: "電子代工",
    underlyingMarket: "TW",
  },
  {
    id: "0050-2454",
    etfSymbol: "0050",
    stockSymbol: "2454",
    stockName: "聯發科",
    weightPercent: 4.7,
    industry: "半導體",
    underlyingMarket: "TW",
  },
  {
    id: "0050-2412",
    etfSymbol: "0050",
    stockSymbol: "2412",
    stockName: "中華電",
    weightPercent: 2.1,
    industry: "電信",
    underlyingMarket: "TW",
  },
  {
    id: "00981a-2330",
    etfSymbol: "00981A",
    stockSymbol: "2330",
    stockName: "台積電",
    weightPercent: 22,
    industry: "半導體",
    underlyingMarket: "TW",
  },
  {
    id: "00981a-2308",
    etfSymbol: "00981A",
    stockSymbol: "2308",
    stockName: "台達電",
    weightPercent: 7.5,
    industry: "電源與能源管理",
    underlyingMarket: "TW",
  },
  {
    id: "00981a-2891",
    etfSymbol: "00981A",
    stockSymbol: "2891",
    stockName: "中信金",
    weightPercent: 4.8,
    industry: "金融",
    underlyingMarket: "TW",
  },
  {
    id: "00981a-3661",
    etfSymbol: "00981A",
    stockSymbol: "3661",
    stockName: "世芯-KY",
    weightPercent: 3.8,
    industry: "半導體",
    underlyingMarket: "TW",
  },
];

export const mockLookthroughExposures: LookthroughExposure[] = [
  {
    stockSymbol: "2330",
    stockName: "台積電",
    exposureValue: 173200,
    portfolioWeight: 20.83,
    industry: "半導體",
    underlyingMarket: "TW",
    sources: [
      { sourceSymbol: "0050", sourceName: "元大台灣50", exposureValue: 124800 },
      { sourceSymbol: "00981A", sourceName: "主動型台股ETF", exposureValue: 48400 },
    ],
  },
  {
    stockSymbol: "2412",
    stockName: "中華電",
    exposureValue: 100460,
    portfolioWeight: 12.09,
    industry: "電信",
    underlyingMarket: "TW",
    sources: [
      { sourceSymbol: "2412", sourceName: "中華電", exposureValue: 95000 },
      { sourceSymbol: "0050", sourceName: "元大台灣50", exposureValue: 5460 },
    ],
  },
  {
    stockSymbol: "2891",
    stockName: "中信金",
    exposureValue: 86560,
    portfolioWeight: 10.42,
    industry: "金融",
    underlyingMarket: "TW",
    sources: [
      { sourceSymbol: "2891", sourceName: "中信金", exposureValue: 76000 },
      { sourceSymbol: "00981A", sourceName: "主動型台股ETF", exposureValue: 10560 },
    ],
  },
  {
    stockSymbol: "2317",
    stockName: "鴻海",
    exposureValue: 13260,
    portfolioWeight: 1.6,
    industry: "電子代工",
    underlyingMarket: "TW",
    sources: [
      { sourceSymbol: "0050", sourceName: "元大台灣50", exposureValue: 13260 },
    ],
  },
];

export const mockIndustryExposures: IndustryExposure[] = [
  { industry: "半導體", exposureValue: 193780, portfolioWeight: 23.32 },
  { industry: "電信", exposureValue: 100460, portfolioWeight: 12.09 },
  { industry: "金融", exposureValue: 86560, portfolioWeight: 10.42 },
  { industry: "海外市場", exposureValue: 180000, portfolioWeight: 21.66 },
  { industry: "其他台股", exposureValue: 27000, portfolioWeight: 3.25 },
];
