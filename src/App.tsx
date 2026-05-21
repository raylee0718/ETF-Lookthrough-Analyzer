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

const mvpNavItems: { key: ActivePage; label: string }[] = [
  { key: "holdings", label: "設定我的持股" },
  { key: "constituents", label: "ETF 成分股" },
  { key: "lookthrough", label: "穿透分析" },
];

const advancedNavItems: { key: ActivePage; label: string }[] = [
  { key: "dashboard", label: "儀表板" },
  { key: "overlap", label: "ETF 重疊" },
  { key: "transactions", label: "交易紀錄" },
  { key: "prices", label: "價格表" },
  { key: "backup", label: "備份匯出" },
];

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>("holdings");
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const portfolioHoldings = usePortfolioHoldings();
  const etfConstituents = useEtfConstituents();
  const transactions = useTransactions();
  const priceRecords = usePriceRecords();
  const transactionPositions = useMemo(
    () => calculatePositionsFromTransactions(transactions.transactions).positions,
    [transactions.transactions],
  );

  const isMvpPage = mvpNavItems.some((item) => item.key === activePage);

  return (
    <div className="min-h-screen bg-stone-100">
      <nav className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                ETF Lookthrough Analyzer
              </p>
              <p className="text-xs text-slate-500">
                MVP 聚焦：持股、ETF 成分股、穿透分析
              </p>
            </div>

            <div className="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-stone-100 p-1 sm:mx-0">
              {mvpNavItems.map((item) => (
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

          <div className="flex flex-col gap-2 border-t border-stone-100 pt-2">
            <button
              className="w-fit rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-stone-100 hover:text-slate-800"
              onClick={() => setShowAdvancedTools((current) => !current)}
              type="button"
            >
              進階工具 {showAdvancedTools ? "收合" : "展開"}
            </button>

            {showAdvancedTools ? (
              <div className="flex gap-1 overflow-x-auto rounded-lg bg-stone-50 p-1">
                {advancedNavItems.map((item) => (
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
            ) : null}
          </div>
        </div>
      </nav>

      {isMvpPage ? (
        <section className="px-4 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
            <h1 className="text-base font-semibold">ETF 穿透分析 MVP</h1>
            <p className="mt-2 text-sm leading-6">
              這個工具的核心目標是：輸入目前持有的 ETF / 股票，搭配 ETF
              成分股資料，計算你實際暴露在哪些台灣股票與產業。交易紀錄、價格追蹤、備份與自動資料來源屬於進階功能，先不放在主要流程。
            </p>
          </div>
        </section>
      ) : null}

      {activePage === "dashboard" ? (
        <Dashboard
          constituents={etfConstituents.constituents}
          holdings={portfolioHoldings.holdings}
          onNavigateToPrices={() => setActivePage("prices")}
          priceRecords={priceRecords.priceRecords}
          transactions={transactions.transactions}
          upsertManyPriceRecords={priceRecords.upsertManyPriceRecords}
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
