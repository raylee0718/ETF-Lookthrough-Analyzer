import { useMemo, useState } from "react";
import { useEtfConstituents } from "./hooks/useEtfConstituents";
import { usePortfolioHoldings } from "./hooks/usePortfolioHoldings";
import { usePriceRecords } from "./hooks/usePriceRecords";
import { useTransactions } from "./hooks/useTransactions";
import { calculatePositionsFromTransactions } from "./lib/positions";
import BackupPage from "./pages/BackupPage";
import Dashboard from "./pages/Dashboard";
import EtfConstituentsPage from "./pages/EtfConstituentsPage";
import HoldingsPage from "./pages/HoldingsPage";
import LookthroughPage from "./pages/LookthroughPage";
import OverlapPage from "./pages/OverlapPage";
import PricesPage from "./pages/PricesPage";
import TransactionsPage from "./pages/TransactionsPage";

type ActivePage =
  | "dashboard"
  | "holdings"
  | "constituents"
  | "lookthrough"
  | "overlap"
  | "transactions"
  | "prices"
  | "backup";

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>("dashboard");
  const portfolioHoldings = usePortfolioHoldings();
  const etfConstituents = useEtfConstituents();
  const transactions = useTransactions();
  const priceRecords = usePriceRecords();
  const transactionPositions = useMemo(
    () => calculatePositionsFromTransactions(transactions.transactions).positions,
    [transactions.transactions],
  );

  const navItems: { key: ActivePage; label: string }[] = [
    { key: "dashboard", label: "總覽" },
    { key: "holdings", label: "我的持股" },
    { key: "constituents", label: "ETF 成分股" },
    { key: "lookthrough", label: "穿透分析" },
    { key: "overlap", label: "ETF 重疊" },
    { key: "transactions", label: "交易紀錄" },
    { key: "prices", label: "價格資料" },
    { key: "backup", label: "備份匯出" },
  ];

  return (
    <div className="min-h-screen bg-stone-100">
      <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              ETF Lookthrough Analyzer
            </p>
            <p className="text-xs text-slate-500">
              Local-first｜資料儲存在此瀏覽器｜請定期備份
            </p>
          </div>
          <div className="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-stone-100 p-1 sm:mx-0">
            {navItems.map((item) => (
              <button
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
                  activePage === item.key
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
                key={item.key}
                onClick={() => setActivePage(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {activePage === "dashboard" ? (
        <Dashboard
          constituents={etfConstituents.constituents}
          holdings={portfolioHoldings.holdings}
          priceRecords={priceRecords.priceRecords}
          transactions={transactions.transactions}
        />
      ) : null}

      {activePage === "holdings" ? <HoldingsPage {...portfolioHoldings} /> : null}

      {activePage === "constituents" ? (
        <EtfConstituentsPage
          holdings={portfolioHoldings.holdings}
          {...etfConstituents}
        />
      ) : null}

      {activePage === "lookthrough" ? (
        <LookthroughPage
          constituents={etfConstituents.constituents}
          holdings={portfolioHoldings.holdings}
          priceRecords={priceRecords.priceRecords}
          transactions={transactions.transactions}
        />
      ) : null}

      {activePage === "overlap" ? (
        <OverlapPage constituents={etfConstituents.constituents} />
      ) : null}

      {activePage === "transactions" ? (
        <TransactionsPage
          {...transactions}
          priceRecords={priceRecords.priceRecords}
        />
      ) : null}

      {activePage === "prices" ? (
        <PricesPage {...priceRecords} positions={transactionPositions} />
      ) : null}

      {activePage === "backup" ? (
        <BackupPage
          constituents={etfConstituents.constituents}
          holdings={portfolioHoldings.holdings}
          priceRecords={priceRecords.priceRecords}
          transactions={transactions.transactions}
        />
      ) : null}
    </div>
  );
}
