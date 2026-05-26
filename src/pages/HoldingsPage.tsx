import { FormEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import type { HoldingInput } from "../hooks/usePortfolioHoldings";
import { formatCurrency } from "../lib/format";
import type { PortfolioHolding } from "../types/portfolio";

const categoryOptions = [
  "台股核心 ETF",
  "美股核心 ETF",
  "台股主動 ETF",
  "金融股",
  "防禦型股票",
  "個股",
  "其他",
];

const emptyForm: HoldingInput = {
  symbol: "",
  name: "",
  category: "",
  marketValue: 0,
  note: "",
};

type HoldingsPageProps = {
  holdings: PortfolioHolding[];
  addHolding: (input: HoldingInput) => void;
  updateHolding: (id: string, input: HoldingInput) => void;
  deleteHolding: (id: string) => void;
  resetHoldings: () => void;
};

type FormErrors = Partial<Record<keyof HoldingInput, string>>;

export default function HoldingsPage({
  holdings,
  addHolding,
  updateHolding,
  deleteHolding,
  resetHoldings,
}: HoldingsPageProps) {
  const [formValue, setFormValue] = useState<HoldingInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const totalPortfolioValue = useMemo(
    () => holdings.reduce((sum, holding) => sum + holding.marketValue, 0),
    [holdings],
  );

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formValue.symbol.trim()) nextErrors.symbol = "請輸入代號";
    if (!formValue.name.trim()) nextErrors.name = "請輸入名稱";
    if (!formValue.category.trim()) nextErrors.category = "請選擇分類";
    if (!Number.isFinite(formValue.marketValue) || formValue.marketValue <= 0) {
      nextErrors.marketValue = "市值必須大於 0";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) return;

    if (editingId) {
      updateHolding(editingId, formValue);
    } else {
      addHolding(formValue);
    }

    setFormValue(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleEdit = (holding: PortfolioHolding) => {
    setEditingId(holding.id);
    setFormValue({
      symbol: holding.symbol,
      name: holding.name,
      category: holding.category,
      marketValue: holding.marketValue,
      note: holding.note ?? "",
    });
    setErrors({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormValue(emptyForm);
    setErrors({});
  };

  const handleDelete = (holding: PortfolioHolding) => {
    const confirmed = window.confirm(`確定要刪除 ${holding.symbol} ${holding.name} 嗎？`);

    if (confirmed) {
      deleteHolding(holding.id);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "這會覆蓋目前資料。建議先備份，是否繼續？",
    );

    if (confirmed) {
      resetHoldings();
      handleCancelEdit();
    }
  };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              我的持股
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              管理目前持有的 ETF 與股票。
            </p>
          </div>
          <button
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 sm:w-auto"
            onClick={handleReset}
            type="button"
          >
            載入範例資料
          </button>
        </header>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <p className="text-sm leading-6">
            請填目前市值；系統會用它計算穿透後曝險。
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="投資組合總市值"
            value={formatCurrency(totalPortfolioValue)}
            helperText="依目前手動持股加總"
          />
          <StatCard
            label="持股筆數"
            value={`${holdings.length} 筆`}
            helperText="目前清單"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <SectionCard
            title={editingId ? "編輯持股" : "新增持股"}
            description="輸入目前市值即可。"
          >
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                代號
                <input
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setFormValue((current) => ({
                      ...current,
                      symbol: event.target.value,
                    }))
                  }
                  placeholder="例如 0050"
                  value={formValue.symbol}
                />
                {errors.symbol ? (
                  <span className="text-xs text-red-600">{errors.symbol}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                名稱
                <input
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setFormValue((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="例如 元大台灣50"
                  value={formValue.name}
                />
                {errors.name ? (
                  <span className="text-xs text-red-600">{errors.name}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                分類
                <select
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setFormValue((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  value={formValue.category}
                >
                  <option value="">請選擇分類</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category ? (
                  <span className="text-xs text-red-600">{errors.category}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                市值
                <input
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  min="0"
                  onChange={(event) =>
                    setFormValue((current) => ({
                      ...current,
                      marketValue: Number(event.target.value),
                    }))
                  }
                  placeholder="例如 100000"
                  type="number"
                  value={formValue.marketValue || ""}
                />
                {errors.marketValue ? (
                  <span className="text-xs text-red-600">{errors.marketValue}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                備註
                <textarea
                  className="min-h-24 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) =>
                    setFormValue((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="選填"
                  value={formValue.note ?? ""}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  type="submit"
                >
                  {editingId ? "儲存修改" : "新增持股"}
                </button>
                {editingId ? (
                  <button
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                    onClick={handleCancelEdit}
                    type="button"
                  >
                    取消編輯
                  </button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard title="目前持股" description="可直接編輯或刪除本機資料。">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500">
                    <th className="pb-3 font-medium">代號</th>
                    <th className="pb-3 font-medium">名稱</th>
                    <th className="pb-3 font-medium">分類</th>
                    <th className="pb-3 text-right font-medium">市值</th>
                    <th className="pb-3 font-medium">備註</th>
                    <th className="pb-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr
                      className="border-b border-stone-100 last:border-0"
                      key={holding.id}
                    >
                      <td className="py-4 font-semibold text-slate-950">
                        {holding.symbol}
                      </td>
                      <td className="py-4 text-slate-700">{holding.name}</td>
                      <td className="py-4 text-slate-600">{holding.category}</td>
                      <td className="py-4 text-right font-medium text-slate-950">
                        {formatCurrency(holding.marketValue)}
                      </td>
                      <td className="max-w-48 truncate py-4 text-slate-500">
                        {holding.note ?? "-"}
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                            onClick={() => handleEdit(holding)}
                            type="button"
                          >
                            編輯
                          </button>
                          <button
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                            onClick={() => handleDelete(holding)}
                            type="button"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
