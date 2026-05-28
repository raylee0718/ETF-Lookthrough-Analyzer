import type { PortfolioHolding, EtfConstituent } from "../types/portfolio";
import type { TransactionRecord } from "../types/transactions";
import type { PriceRecord } from "../types/prices";
import type { AppSettings } from "../types/settings";
import type { EtfProviderConfig } from "../types/etfProvider";
import { inferConstituentMarket } from "./marketClassification";

// Versioning Constants
export const SCHEMA_VERSION_KEY = "etf-lookthrough-schema-version";
export const CURRENT_SCHEMA_VERSION = 1;

// Storage Keys
const PORTFOLIO_KEY = "etf-lookthrough-portfolio-holdings";
const CONSTITUENTS_KEY = "etf-lookthrough-etf-constituents";
const TRANSACTIONS_KEY = "etf-lookthrough-transactions";
const PRICE_RECORDS_KEY = "etf-lookthrough-price-records";
const APP_SETTINGS_KEY = "etf-lookthrough-app-settings";
const PROVIDER_CONFIGS_KEY = "etf-lookthrough-etf-provider-configs";

// Helper to generate UUID fallback if missing
const generateUUID = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `gen-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Helper for today's date in YYYY-MM-DD format
const getTodayDateString = () => {
  try {
    return new Date().toISOString().split("T")[0];
  } catch {
    return "2026-05-28";
  }
};

// 1. Clean Portfolio Holdings
function cleanPortfolioHoldings(rawStr: string | null): PortfolioHolding[] | null {
  if (rawStr === null) return null;
  try {
    const parsed = JSON.parse(rawStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any): PortfolioHolding => {
      const obj = typeof item === "object" && item !== null ? item : {};
      const symbol = String(obj.symbol ?? "UNKNOWN").trim().toUpperCase();
      const marketValue = Number(obj.marketValue);

      return {
        id: typeof obj.id === "string" && obj.id ? obj.id : generateUUID(),
        symbol,
        name: typeof obj.name === "string" && obj.name ? obj.name.trim() : symbol,
        category: typeof obj.category === "string" && obj.category ? obj.category.trim() : "個股",
        marketValue: Number.isFinite(marketValue) ? marketValue : 0,
        note: typeof obj.note === "string" ? obj.note.trim() : undefined,
      };
    });
  } catch {
    return [];
  }
}

// 2. Clean ETF Constituents
function cleanEtfConstituents(rawStr: string | null): EtfConstituent[] | null {
  if (rawStr === null) return null;
  try {
    const parsed = JSON.parse(rawStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any): EtfConstituent => {
      const obj = typeof item === "object" && item !== null ? item : {};
      const etfSymbol = String(obj.etfSymbol ?? "UNKNOWN").trim().toUpperCase();
      const stockSymbol = String(obj.stockSymbol ?? "UNKNOWN").trim().toUpperCase();
      const weightPercent = Number(obj.weightPercent);

      const cleanedConstituent: EtfConstituent = {
        id: typeof obj.id === "string" && obj.id ? obj.id : generateUUID(),
        etfSymbol,
        stockSymbol,
        stockName: typeof obj.stockName === "string" && obj.stockName ? obj.stockName.trim() : stockSymbol,
        weightPercent: Number.isFinite(weightPercent) ? weightPercent : 0,
        industry: typeof obj.industry === "string" && obj.industry ? obj.industry.trim() : undefined,
        asOfDate: typeof obj.asOfDate === "string" && obj.asOfDate ? obj.asOfDate.trim() : undefined,
        source: typeof obj.source === "string" && obj.source ? obj.source.trim() : undefined,
      };

      // Handle underlyingMarket validation and inference
      const rawMarket = typeof obj.underlyingMarket === "string" ? obj.underlyingMarket.trim().toUpperCase() : "";
      if (["TW", "US", "OTHER", "UNKNOWN"].includes(rawMarket)) {
        cleanedConstituent.underlyingMarket = rawMarket as any;
      } else {
        cleanedConstituent.underlyingMarket = inferConstituentMarket(cleanedConstituent);
      }

      return cleanedConstituent;
    });
  } catch {
    return [];
  }
}

// 3. Clean Transactions
function cleanTransactions(rawStr: string | null): TransactionRecord[] | null {
  if (rawStr === null) return null;
  try {
    const parsed = JSON.parse(rawStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any): TransactionRecord => {
      const obj = typeof item === "object" && item !== null ? item : {};
      const symbol = String(obj.symbol ?? "UNKNOWN").trim().toUpperCase();
      const shares = Number(obj.shares);
      const price = Number(obj.price);
      const fee = Number(obj.fee);
      const tax = Number(obj.tax);

      const rawType = typeof obj.type === "string" ? obj.type.trim().toLowerCase() : "";
      const type = (rawType === "buy" || rawType === "sell") ? rawType : "buy";

      return {
        id: typeof obj.id === "string" && obj.id ? obj.id : generateUUID(),
        date: typeof obj.date === "string" && obj.date ? obj.date.trim() : getTodayDateString(),
        symbol,
        name: typeof obj.name === "string" && obj.name ? obj.name.trim() : symbol,
        category: typeof obj.category === "string" && obj.category ? obj.category.trim() : "個股",
        type,
        shares: Number.isFinite(shares) ? shares : 0,
        price: Number.isFinite(price) ? price : 0,
        fee: Number.isFinite(fee) ? fee : 0,
        tax: Number.isFinite(tax) ? tax : 0,
        note: typeof obj.note === "string" ? obj.note.trim() : undefined,
      };
    });
  } catch {
    return [];
  }
}

// 4. Clean Price Records
function cleanPriceRecords(rawStr: string | null): PriceRecord[] | null {
  if (rawStr === null) return null;
  try {
    const parsed = JSON.parse(rawStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any): PriceRecord => {
      const obj = typeof item === "object" && item !== null ? item : {};
      const symbol = String(obj.symbol ?? "UNKNOWN").trim().toUpperCase();
      const price = Number(obj.price);

      const rawSourceType = typeof obj.sourceType === "string" ? obj.sourceType.trim().toLowerCase() : "";
      const sourceType = ["manual", "csv", "provider"].includes(rawSourceType)
        ? (rawSourceType as any)
        : "manual";

      return {
        id: typeof obj.id === "string" && obj.id ? obj.id : generateUUID(),
        symbol,
        name: typeof obj.name === "string" && obj.name ? obj.name.trim() : undefined,
        price: Number.isFinite(price) ? price : 0,
        date: typeof obj.date === "string" && obj.date ? obj.date.trim() : getTodayDateString(),
        sourceType,
        source: typeof obj.source === "string" && obj.source ? obj.source.trim() : undefined,
        fetchedAt: typeof obj.fetchedAt === "string" && obj.fetchedAt ? obj.fetchedAt.trim() : undefined,
        note: typeof obj.note === "string" ? obj.note.trim() : undefined,
      };
    });
  } catch {
    return [];
  }
}

// 5. Clean App Settings
function cleanAppSettings(rawStr: string | null): AppSettings | null {
  if (rawStr === null) return null;
  try {
    const parsed = JSON.parse(rawStr);
    if (typeof parsed !== "object" || parsed === null) {
      return { portfolioDataSourceMode: "transactions" };
    }

    const portfolioDataSourceMode = parsed.portfolioDataSourceMode === "manual" ? "manual" : "transactions";
    return { portfolioDataSourceMode };
  } catch {
    return { portfolioDataSourceMode: "transactions" };
  }
}

// 6. Clean ETF Provider Configs
function cleanEtfProviderConfigs(rawStr: string | null): EtfProviderConfig[] | null {
  if (rawStr === null) return null;
  try {
    const parsed = JSON.parse(rawStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any): EtfProviderConfig => {
      const obj = typeof item === "object" && item !== null ? item : {};
      const etfSymbol = String(obj.etfSymbol ?? "UNKNOWN").trim().toUpperCase();

      const rawProviderType = typeof obj.providerType === "string" ? obj.providerType.trim().toLowerCase() : "";
      const providerType = ["manual", "csv", "sitca", "issuer", "custom"].includes(rawProviderType)
        ? (rawProviderType as any)
        : "issuer";

      return {
        etfSymbol,
        providerType,
        enabled: typeof obj.enabled === "boolean" ? obj.enabled : true,
        sourceUrl: typeof obj.sourceUrl === "string" && obj.sourceUrl ? obj.sourceUrl.trim() : undefined,
        notes: typeof obj.notes === "string" && obj.notes ? obj.notes.trim() : undefined,
      };
    });
  } catch {
    return [];
  }
}

// Main runMigrations function
export function runMigrations(): void {
  try {
    // 1. Check current schema version in localStorage
    const rawVersion = window.localStorage.getItem(SCHEMA_VERSION_KEY);
    const version = rawVersion !== null ? parseInt(rawVersion, 10) : null;

    // If it's already the current version, exit early (no work needed)
    if (version === CURRENT_SCHEMA_VERSION) {
      console.log(`[Schema Migration] Already at the latest version: ${CURRENT_SCHEMA_VERSION}.`);
      return;
    }

    // 2. Detect if it's a completely new user
    const hasPortfolio = window.localStorage.getItem(PORTFOLIO_KEY) !== null;
    const hasConstituents = window.localStorage.getItem(CONSTITUENTS_KEY) !== null;
    const hasTransactions = window.localStorage.getItem(TRANSACTIONS_KEY) !== null;
    const hasPriceRecords = window.localStorage.getItem(PRICE_RECORDS_KEY) !== null;

    const isNewUser = !hasPortfolio && !hasConstituents && !hasTransactions && !hasPriceRecords;

    if (isNewUser) {
      console.log(`[Schema Migration] New user detected. Initializing schema version to: ${CURRENT_SCHEMA_VERSION}.`);
      window.localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
      return;
    }

    console.log(`[Schema Migration] Migrating from version ${version ?? 0} to ${CURRENT_SCHEMA_VERSION}...`);

    // 3. Perform version 0 -> 1 migration
    if (version === null || version < 1) {
      // Migrate Portfolio Holdings
      const rawHoldings = window.localStorage.getItem(PORTFOLIO_KEY);
      const cleanedHoldings = cleanPortfolioHoldings(rawHoldings);
      if (cleanedHoldings !== null) {
        window.localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(cleanedHoldings));
        console.log(`[Schema Migration v1] Cleaned & migrated ${cleanedHoldings.length} portfolio holdings.`);
      }

      // Migrate ETF Constituents
      const rawConstituents = window.localStorage.getItem(CONSTITUENTS_KEY);
      const cleanedConstituents = cleanEtfConstituents(rawConstituents);
      if (cleanedConstituents !== null) {
        window.localStorage.setItem(CONSTITUENTS_KEY, JSON.stringify(cleanedConstituents));
        console.log(`[Schema Migration v1] Cleaned & migrated ${cleanedConstituents.length} ETF constituents.`);
      }

      // Migrate Transactions
      const rawTransactions = window.localStorage.getItem(TRANSACTIONS_KEY);
      const cleanedTransactions = cleanTransactions(rawTransactions);
      if (cleanedTransactions !== null) {
        window.localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(cleanedTransactions));
        console.log(`[Schema Migration v1] Cleaned & migrated ${cleanedTransactions.length} transaction records.`);
      }

      // Migrate Price Records
      const rawPriceRecords = window.localStorage.getItem(PRICE_RECORDS_KEY);
      const cleanedPriceRecords = cleanPriceRecords(rawPriceRecords);
      if (cleanedPriceRecords !== null) {
        window.localStorage.setItem(PRICE_RECORDS_KEY, JSON.stringify(cleanedPriceRecords));
        console.log(`[Schema Migration v1] Cleaned & migrated ${cleanedPriceRecords.length} price records.`);
      }

      // Migrate App Settings
      const rawSettings = window.localStorage.getItem(APP_SETTINGS_KEY);
      const cleanedSettings = cleanAppSettings(rawSettings);
      if (cleanedSettings !== null) {
        window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(cleanedSettings));
        console.log(`[Schema Migration v1] Cleaned & migrated app settings.`);
      }

      // Migrate Provider Configs
      const rawProviderConfigs = window.localStorage.getItem(PROVIDER_CONFIGS_KEY);
      const cleanedProviderConfigs = cleanEtfProviderConfigs(rawProviderConfigs);
      if (cleanedProviderConfigs !== null) {
        window.localStorage.setItem(PROVIDER_CONFIGS_KEY, JSON.stringify(cleanedProviderConfigs));
        console.log(`[Schema Migration v1] Cleaned & migrated ${cleanedProviderConfigs.length} provider configs.`);
      }
    }

    // 4. Update stored version key
    window.localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
    console.log(`[Schema Migration] Migration to version ${CURRENT_SCHEMA_VERSION} successfully completed!`);
  } catch (error) {
    console.error("[Schema Migration] Critical failure during migration execution:", error);
  }
}
