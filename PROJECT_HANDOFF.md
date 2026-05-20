# PROJECT_HANDOFF

## Current Clean Project Path

`C:\Users\uuuu1\OneDrive\桌面\ETF-Lookthrough-Analyzer`

This folder is the clean React ETF Lookthrough Analyzer project. It was separated from the old Python active ETF research project.

Do not merge this project with the active ETF research project.

## Project Goal

ETF Lookthrough Analyzer is a local-first personal portfolio analysis tool. Its purpose is to help the user:

- maintain personal ETF / stock holdings;
- maintain ETF constituent data manually;
- calculate lookthrough exposure from ETF holdings to underlying stocks;
- analyze ETF overlap;
- maintain transaction records;
- estimate transaction-derived holdings with manual price records;
- export and import local backups.

The app should remain focused on personal ETF lookthrough portfolio analysis.

## Intentionally Out Of Scope

Do not add the following to this project:

- ETF manager rebalance impact research
- added / removed ETF holdings research
- increased / decreased holdings research
- same-day / next-day / two-day stock return correlation
- active ETF price reaction research
- scraping or automatic ETF constituent fetching
- automatic broker integration
- backend, login, database, or cloud sync
- routing library unless there is a future explicit product need
- old Python research files such as `requirements.txt`, `notebooks/`, `data/`, `outputs/`, or `src/*.py`

Step 11 was intentionally simplified: this project keeps ETF data freshness/status only. It does not include ETF version comparison research.

## Completed Steps

- Clean React project separated from old Python research folder.
- Manual holdings CRUD.
- ETF constituent import from pasted table / CSV-like data.
- Lookthrough exposure calculation.
- ETF overlap calculation.
- Dashboard with portfolio summary and analysis previews.
- Portfolio data source mode:
  - manual holdings;
  - transaction-derived holdings.
- Transaction records CRUD.
- Manual price records.
- Step 9: JSON backup/export and CSV export tools.
- Step 10: transaction CSV import with preview, validation, duplicate warning, and append import.
- Step 11: simplified ETF data freshness/status:
  - `asOfDate`;
  - `source`;
  - latest constituent data date per ETF;
  - latest constituent records used for Dashboard, LookthroughPage, and OverlapPage.
- Step 12: documentation cleanup and handoff update.

## Current Pages

- `src/pages/Dashboard.tsx`
  - Portfolio overview, lookthrough exposure preview, overlap preview, concentration warnings, transaction/price data status.
- `src/pages/HoldingsPage.tsx`
  - Manual holdings management.
- `src/pages/EtfConstituentsPage.tsx`
  - ETF constituent import, preview, save/replace for one ETF, saved records, ETF data status.
- `src/pages/LookthroughPage.tsx`
  - Detailed lookthrough stock exposure and industry exposure.
- `src/pages/OverlapPage.tsx`
  - ETF overlap pair analysis and all-pair ranking.
- `src/pages/TransactionsPage.tsx`
  - Transaction CRUD, calculated positions, transaction CSV import.
- `src/pages/PricesPage.tsx`
  - Manual price records.
- `src/pages/BackupPage.tsx`
  - JSON backup export/import and CSV exports.

Navigation is managed in `src/App.tsx` with local React state.

## Current Hooks

- `src/hooks/usePortfolioHoldings.ts`
  - Manual holdings state and localStorage persistence.
- `src/hooks/useEtfConstituents.ts`
  - ETF constituent state and localStorage persistence.
  - Replaces all records for one ETF when saving imported constituents.
  - Exposes latest constituent helper.
- `src/hooks/useTransactions.ts`
  - Transaction state and localStorage persistence.
- `src/hooks/usePriceRecords.ts`
  - Manual price records state and localStorage persistence.
- `src/hooks/useAppSettings.ts`
  - App settings, especially portfolio data source mode.
- `src/hooks/useLocalStorage.ts`
  - Generic localStorage helper.

## Current Lib Utilities

- `src/lib/lookthrough.ts`
  - Lookthrough exposure, industry exposure, concentration warnings, unmapped ETF holdings.
- `src/lib/overlap.ts`
  - Pairwise ETF overlap, all ETF overlap pairs, overlap level labels.
- `src/lib/positions.ts`
  - Transaction-to-position calculation and basic position conversion.
- `src/lib/prices.ts`
  - Latest price map, priced positions, conversion to holdings.
- `src/lib/portfolioSource.ts`
  - Chooses manual or transaction-derived holdings for analysis.
- `src/lib/backup.ts`
  - Backup file creation, backup validation, localStorage restore, CSV export helpers.
- `src/lib/importTransactions.ts`
  - Transaction CSV/table parsing, validation, duplicate detection.
- `src/lib/constituentVersions.ts`
  - Lightweight latest ETF constituent data selection and freshness/status summaries.
  - No version comparison research should be added here.
- `src/lib/format.ts`
  - Currency, percent, number, and share formatting.
- `src/lib/formatters.ts`
  - Additional formatting helpers used by some pages.
- `src/lib/portfolioStorage.ts`
  - Manual holdings storage key and parsing/serialization helpers.

## Current Types

- `src/types/portfolio.ts`
  - `PortfolioHolding`
  - `EtfConstituent`
  - `LookthroughExposure`
  - `IndustryExposure`
- `src/types/transactions.ts`
  - `TransactionType`
  - `TransactionRecord`
  - `CalculatedPosition`
  - `PositionCalculationWarning`
- `src/types/prices.ts`
  - `PriceRecord`
  - `PositionWithMarketValue`
- `src/types/settings.ts`
  - `PortfolioDataSourceMode`
  - `AppSettings`

## localStorage Keys

- `etf-lookthrough-portfolio-holdings`
  - Manual holdings.
- `etf-lookthrough-etf-constituents`
  - ETF constituent records.
- `etf-lookthrough-transactions`
  - Transaction records.
- `etf-lookthrough-price-records`
  - Manual price records.
- `etf-lookthrough-app-settings`
  - App settings.

## Main Calculation Logic

### Portfolio Source

`getPortfolioHoldingsForAnalysis` selects one of two analysis inputs:

- manual holdings; or
- transaction-derived positions with manual prices.

### Lookthrough Exposure

`calculateLookthroughExposure`:

- calculates total portfolio value from holdings;
- maps ETF symbols to constituent records;
- if a holding has matching ETF constituents, distributes holding market value by constituent `weightPercent`;
- if a holding has no constituent data, treats the holding as direct exposure;
- groups exposure by underlying stock symbol;
- calculates portfolio weight for each exposure.

Dashboard and LookthroughPage pass latest constituent records per ETF by default, using `getLatestConstituentsByEtf`, to avoid double counting if older dated records remain in localStorage.

### Industry Exposure

`calculateIndustryExposure` groups lookthrough exposure by industry and sums exposure values and portfolio weights.

### Concentration Warnings

`findConcentrationWarnings` flags high single-stock exposure based on portfolio weight thresholds.

### ETF Overlap

`calculatePairwiseEtfOverlap`:

- aggregates each ETF's constituents by stock symbol;
- finds shared stocks;
- calculates overlap by count and weighted overlap;
- uses `min(weightA, weightB)` for weighted overlap contribution.

OverlapPage uses latest constituent records per ETF by default.

### Transactions And Positions

`calculatePositionsFromTransactions`:

- sorts transactions by date and id;
- buys add shares and cost basis;
- sells reduce shares using average cost;
- calculates realized P/L;
- warns if a sell exceeds available shares.

### Prices

`getLatestPriceMap` selects latest price by symbol. `calculatePositionsWithMarketValue` combines calculated positions with manual prices.

### Backup

JSON backup includes:

- manual holdings;
- ETF constituents;
- transactions;
- price records;
- app settings.

Restore writes directly to localStorage and expects a page refresh.

## Known Technical Debt

- Some older Traditional Chinese strings in source files are mojibake/encoding-corrupted. Build passes, but UI/source cleanup is recommended.
- No automated tests yet.
- Backup validation is structural and not deeply validating every nested record.
- localStorage schema migration is not implemented.
- Import parser logic is split across constituent import and transaction import.
- Bundle size triggers Vite's default 500 kB warning.
- Dependencies are currently set to `latest`.
- Navigation is state-based, not URL-based.

## Safe Next Steps

Stay inside personal lookthrough-tool scope.

Recommended safe next steps:

- Clean mojibake UI strings gradually.
- Add lightweight tests for:
  - `calculateLookthroughExposure`;
  - `calculatePairwiseEtfOverlap`;
  - `calculatePositionsFromTransactions`;
  - `parseTransactionsImportText`;
  - `getLatestConstituentsByEtf`.
- Add clearer import templates for ETF constituents and transactions.
- Improve mobile table layouts.
- Improve backup validation and user-facing restore warnings.
- Add PWA polish.
- Consider static deployment.

Avoid:

- active ETF price reaction research;
- ETF manager rebalance analysis;
- holdings added/removed research;
- merging this React app back into the old Python project.

