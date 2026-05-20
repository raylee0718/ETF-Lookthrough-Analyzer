import { useAppSettings } from "../hooks/useAppSettings";
import type { PortfolioDataSourceMode } from "../types/settings";

const modeOptions: {
  mode: PortfolioDataSourceMode;
  label: string;
  description: string;
}[] = [
  {
    mode: "manual",
    label: "手動持股模式",
    description: "適合快速輸入目前市值",
  },
  {
    mode: "transactions",
    label: "交易紀錄模式",
    description: "適合根據買賣紀錄與價格表估算市值",
  },
];

export default function PortfolioModeSwitch() {
  const { settings, setPortfolioDataSourceMode } = useAppSettings();

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            投資組合資料來源
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            目前選擇：
            <span className="font-medium text-blue-700">
              {settings.portfolioDataSourceMode === "manual"
                ? "手動持股模式"
                : "交易紀錄模式"}
            </span>
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {modeOptions.map((option) => {
            const isSelected =
              settings.portfolioDataSourceMode === option.mode;

            return (
              <button
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 text-blue-950 ring-2 ring-blue-100"
                    : "border-stone-200 bg-stone-50 text-slate-700 hover:bg-white"
                }`}
                key={option.mode}
                onClick={() => setPortfolioDataSourceMode(option.mode)}
                type="button"
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
