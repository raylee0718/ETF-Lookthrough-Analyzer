import { ChangeEvent, useMemo, useState } from "react";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";
import type { EtfConstituentInput } from "../hooks/useEtfConstituents";
import { useEtfProviderConfigs } from "../hooks/useEtfProviderConfigs";
import { getLatestConstituentDataStatuses } from "../lib/constituentVersions";
import {
  fetchEtfHoldingsByConfig,
  getEtfProviderCapabilityNotes,
} from "../lib/etfHoldingsProviders";
import { formatPercent } from "../lib/formatters";
import {
  getKnownTaiwanEtfProviderCapabilities,
  YUANTA_0050_HOLDINGS_URL,
  YUANTA_0050_PCF_URL,
} from "../lib/taiwanEtfProviders";
import type {
  EtfHoldingsFetchResult,
  EtfHoldingsProviderStatus,
  EtfHoldingsProviderSupportLevel,
  EtfHoldingsProviderType,
  EtfProviderConfig,
} from "../types/etfProvider";
import type { EtfConstituent, PortfolioHolding } from "../types/portfolio";

const sourceOptions = ["投信官網", "公開說明書", "手動整理", "其他"];

const samplePasteText = `股票代號,股票名稱,權重,產業
2330,台積電,60.61,半導體
2317,鴻海,3.50,電子
2454,聯發科,3.20,半導體`;

type EtfConstituentsPageProps = {
  holdings: PortfolioHolding[];
  constituents: EtfConstituent[];
  deleteConstituent: (id: string) => void;
  replaceConstituentsForEtf: (
    etfSymbol: string,
    records: EtfConstituentInput[],
  ) => void;
  resetConstituents: () => void;
};

const emptyProviderForm: EtfProviderConfig = {
  etfSymbol: "",
  providerType: "csv",
  sourceUrl: "",
  notes: "",
  enabled: true,
};

const providerTypeOptions: {
  value: EtfHoldingsProviderType;
  label: string;
}[] = [
  { value: "manual", label: "手動" },
  { value: "csv", label: "CSV" },
  { value: "sitca", label: "投信投顧公會" },
  { value: "issuer", label: "發行商" },
  { value: "custom", label: "自訂" },
];

const providerStatusLabels: Record<EtfHoldingsProviderStatus, string> = {
  supported: "支援",
  partial: "部分支援",
  unsupported: "尚未支援",
  failed: "測試失敗",
};

const providerSupportLevelLabels: Record<
  EtfHoldingsProviderSupportLevel,
  string
> = {
  full: "full",
  partial: "partial",
  blocked_by_cors: "blocked by CORS",
  unsupported: "unsupported",
};

const getProviderTypeLabel = (providerType: EtfHoldingsProviderType) =>
  providerTypeOptions.find((option) => option.value === providerType)?.label ??
  providerType;

const getProviderResultWeightTotal = (result: EtfHoldingsFetchResult) =>
  result.constituents.reduce(
    (sum, constituent) => sum + constituent.weightPercent,
    0,
  );

const isProviderResultSafeToSave = (result: EtfHoldingsFetchResult) =>
  result.safeToSave === true &&
  result.constituents.length >= 20 &&
  result.constituents.every(
    (constituent) =>
      Number.isFinite(constituent.weightPercent) &&
      constituent.weightPercent > 0,
  );

const formatDiagnosticTime = (value?: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getExecutionEnvironmentLabel = (result: EtfHoldingsFetchResult) => {
  const runtime = result.runtimeDiagnostics;

  if (!runtime) {
    return "browser";
  }

  const siteLabel =
    runtime.siteEnvironment === "local-dev"
      ? "local dev"
      : runtime.siteEnvironment === "deployed-site"
        ? "deployed site"
        : "unknown site";

  return `${runtime.executionEnvironment} / ${siteLabel}${
    runtime.origin ? ` / ${runtime.origin}` : ""
  }`;
};

const getProviderDecisionNote = (result: EtfHoldingsFetchResult) => {
  if (isProviderResultSafeToSave(result)) {
    return "0050 provider 可在目前瀏覽器環境使用。你可以儲存此結果，並用於穿透分析。";
  }

  if (result.supportLevel === "blocked_by_cors") {
    return "0050 官方資料來源可用，但瀏覽器無法直接抓取。下一步可選擇：A. 維持 CSV 匯入；B. 建立極薄 serverless proxy。";
  }

  if (result.supportLevel === "partial") {
    return "目前只取得部分資料，不建議儲存為正式成分股。";
  }

  return "目前測試失敗，請先使用 CSV 匯入作為穩定備援。";
};

type ParseResult = {
  records: EtfConstituentInput[];
  errors: string[];
};

type DataQualityWarning = {
  id: string;
  message: string;
};

const splitDelimitedLine = (line: string, delimiter: "," | "\t") => {
  if (delimiter === "\t") {
    return line.split("\t").map((cell) => cell.trim());
  }

  const cells: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      cells.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  cells.push(currentCell.trim());
  return cells;
};

const isHeaderRow = (cells: string[]) =>
  cells.some((cell) =>
    [
      "成分股代號",
      "成分股名稱",
      "股票代號",
      "股票名稱",
      "權重",
      "產業",
      "stockSymbol",
      "stockName",
    ].some((keyword) => cell.includes(keyword)),
  );

const normalizeWeight = (value: string) =>
  Number(value.replace("%", "").replace(/,/g, "").trim());

export default function EtfConstituentsPage({
  holdings,
  constituents,
  deleteConstituent,
  replaceConstituentsForEtf,
  resetConstituents,
}: EtfConstituentsPageProps) {
  const [etfSymbol, setEtfSymbol] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [source, setSource] = useState("手動整理");
  const [pasteText, setPasteText] = useState(samplePasteText);
  const [previewRecords, setPreviewRecords] = useState<EtfConstituentInput[]>(
    [],
  );
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [selectedEtfSymbol, setSelectedEtfSymbol] = useState("");
  const {
    providerConfigs,
    upsertProviderConfig,
    deleteProviderConfig,
  } = useEtfProviderConfigs();
  const [providerForm, setProviderForm] =
    useState<EtfProviderConfig>(emptyProviderForm);
  const [providerTestResults, setProviderTestResults] = useState<
    Record<string, EtfHoldingsFetchResult>
  >({});
  const [testingProviderSymbol, setTestingProviderSymbol] = useState("");

  const normalizedEtfSymbol = etfSymbol.trim().toUpperCase();

  const etfSymbolSuggestions = useMemo(() => {
    const portfolioEtfs = holdings
      .filter((holding) => holding.category.toUpperCase().includes("ETF"))
      .map((holding) => holding.symbol.toUpperCase());
    const constituentEtfs = constituents.map((constituent) =>
      constituent.etfSymbol.toUpperCase(),
    );

    return Array.from(new Set([...portfolioEtfs, ...constituentEtfs])).sort();
  }, [constituents, holdings]);

  const latestDataStatuses = useMemo(
    () => getLatestConstituentDataStatuses(constituents),
    [constituents],
  );
  const providerCapabilityNotes = useMemo(
    () => getEtfProviderCapabilityNotes(),
    [],
  );
  const knownTaiwanEtfCapabilities = useMemo(
    () => getKnownTaiwanEtfProviderCapabilities(),
    [],
  );

  const filteredConstituents = useMemo(() => {
    if (!selectedEtfSymbol) {
      return constituents;
    }

    return constituents.filter(
      (constituent) => constituent.etfSymbol === selectedEtfSymbol,
    );
  }, [constituents, selectedEtfSymbol]);

  const summary = useMemo(() => {
    const etfSymbols = new Set(
      constituents.map((constituent) => constituent.etfSymbol),
    );
    const stockSymbols = new Set(
      constituents.map((constituent) => constituent.stockSymbol),
    );
    const selectedWeight = selectedEtfSymbol
      ? filteredConstituents.reduce(
          (sum, constituent) => sum + constituent.weightPercent,
          0,
        )
      : null;

    return {
      etfSymbolCount: etfSymbols.size,
      constituentCount: constituents.length,
      uniqueStockCount: stockSymbols.size,
      selectedWeight,
    };
  }, [constituents, filteredConstituents, selectedEtfSymbol]);

  const dataQualityWarnings = useMemo<DataQualityWarning[]>(() => {
    const warnings: DataQualityWarning[] = [];
    const duplicateCounts = new Map<string, number>();

    filteredConstituents.forEach((constituent) => {
      const duplicateKey = `${constituent.etfSymbol}-${constituent.stockSymbol}`;
      duplicateCounts.set(
        duplicateKey,
        (duplicateCounts.get(duplicateKey) ?? 0) + 1,
      );
    });

    duplicateCounts.forEach((count, key) => {
      if (count > 1) {
        const [warningEtfSymbol, stockSymbol] = key.split("-");
        warnings.push({
          id: `duplicate-${key}`,
          message: `${warningEtfSymbol} 的 ${stockSymbol} 有 ${count} 筆重複成分股資料，請確認是否需要清理。`,
        });
      }
    });

    latestDataStatuses
      .filter((status) => status.hasMissingDate)
      .forEach((status) => {
        warnings.push({
          id: `missing-date-${status.etfSymbol}`,
          message: `${status.etfSymbol} 有部分成分股未標示資料日期。`,
        });
      });

    if (selectedEtfSymbol && summary.selectedWeight !== null) {
      if (summary.selectedWeight > 105) {
        warnings.push({
          id: `overweight-${selectedEtfSymbol}`,
          message: `${selectedEtfSymbol} 權重合計為 ${formatPercent(summary.selectedWeight)}，明顯高於 100%。`,
        });
      }

      if (summary.selectedWeight < 80) {
        warnings.push({
          id: `underweight-${selectedEtfSymbol}`,
          message: `${selectedEtfSymbol} 權重合計為 ${formatPercent(summary.selectedWeight)}，可能只匯入了部分成分股。`,
        });
      }
    }

    return warnings;
  }, [filteredConstituents, latestDataStatuses, selectedEtfSymbol, summary.selectedWeight]);

  const parseText = (rawText: string): ParseResult => {
    const errors: string[] = [];
    const records: EtfConstituentInput[] = [];

    if (!normalizedEtfSymbol) {
      return {
        records,
        errors: ["請先輸入 ETF 代號。"],
      };
    }

    rawText
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line, index) => {
        const delimiter = line.includes("\t") ? "\t" : ",";
        const cells = splitDelimitedLine(line, delimiter);

        if (index === 0 && isHeaderRow(cells)) {
          return;
        }

        const [stockSymbol, stockName, weightText, industry] = cells;
        const weightPercent = normalizeWeight(weightText ?? "");
        const rowNumber = index + 1;

        if (!stockSymbol || !stockName || !weightText) {
          errors.push(`第 ${rowNumber} 列缺少成分股代號、名稱或權重。`);
          return;
        }

        if (
          !Number.isFinite(weightPercent) ||
          weightPercent <= 0 ||
          weightPercent > 100
        ) {
          errors.push(`第 ${rowNumber} 列權重格式不正確：${weightText}`);
          return;
        }

        records.push({
          etfSymbol: normalizedEtfSymbol,
          stockSymbol: stockSymbol.trim().toUpperCase(),
          stockName: stockName.trim(),
          weightPercent,
          industry: industry?.trim() || undefined,
          asOfDate: asOfDate || undefined,
          source: source || undefined,
        });
      });

    if (records.length === 0 && errors.length === 0) {
      errors.push("沒有找到可匯入的成分股資料。");
    }

    return { records, errors };
  };

  const handleParse = () => {
    const result = parseText(pasteText);
    setPreviewRecords(result.records);
    setParseErrors(result.errors);
  };

  const handleCsvFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const fileText = String(reader.result ?? "");
      const result = parseText(fileText);
      setPasteText(fileText);
      setPreviewRecords(result.records);
      setParseErrors(result.errors);
    };

    reader.readAsText(file, "utf-8");
    event.target.value = "";
  };

  const handleSavePreview = () => {
    if (!normalizedEtfSymbol || previewRecords.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `確定要將 ${previewRecords.length} 筆資料儲存並取代 ${normalizedEtfSymbol} 目前的成分股嗎？`,
    );

    if (!confirmed) {
      return;
    }

    replaceConstituentsForEtf(normalizedEtfSymbol, previewRecords);
    setSelectedEtfSymbol(normalizedEtfSymbol);
    setPreviewRecords([]);
    setParseErrors([]);
  };

  const handleDelete = (constituent: EtfConstituent) => {
    const confirmed = window.confirm(
      `確定要刪除 ${constituent.etfSymbol} / ${constituent.stockSymbol} ${constituent.stockName} 嗎？`,
    );

    if (confirmed) {
      deleteConstituent(constituent.id);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "確定要重設成範例成分股資料嗎？這會覆蓋目前儲存的 ETF 成分股。",
    );

    if (confirmed) {
      resetConstituents();
      setSelectedEtfSymbol("");
      setPreviewRecords([]);
      setParseErrors([]);
    }
  };

  const handleSaveProviderConfig = () => {
    const normalizedProviderForm = {
      ...providerForm,
      etfSymbol: providerForm.etfSymbol.trim().toUpperCase(),
    };

    if (!normalizedProviderForm.etfSymbol) {
      return;
    }

    upsertProviderConfig(normalizedProviderForm);
    setProviderForm(emptyProviderForm);
  };

  const handleEditProviderConfig = (config: EtfProviderConfig) => {
    setProviderForm(config);
  };

  const handleDeleteProviderConfig = (config: EtfProviderConfig) => {
    const confirmed = window.confirm(
      `確定要刪除 ${config.etfSymbol} 的 ETF 持股來源設定嗎？`,
    );

    if (confirmed) {
      deleteProviderConfig(config.etfSymbol);
    }
  };

  const handleTestProviderConfig = async (config: EtfProviderConfig) => {
    setTestingProviderSymbol(config.etfSymbol);

    try {
      const result = await fetchEtfHoldingsByConfig(config);
      setProviderTestResults((currentResults) => ({
        ...currentResults,
        [config.etfSymbol]: result,
      }));
    } finally {
      setTestingProviderSymbol("");
    }
  };

  const handleCreateYuanta0050Provider = () => {
    const existingConfig = providerConfigs.find(
      (config) => config.etfSymbol === "0050",
    );
    const presetConfig: EtfProviderConfig = {
      etfSymbol: "0050",
      providerType: "issuer",
      sourceUrl: YUANTA_0050_PCF_URL,
      notes: "0050 provider prototype；優先測試官方 PCF，ratio page 作為備援診斷。",
      enabled: true,
    };

    if (existingConfig) {
      setProviderForm(existingConfig);
      return;
    }

    upsertProviderConfig(presetConfig);
    setProviderForm(presetConfig);
  };

  const handleSaveProviderResult = (result: EtfHoldingsFetchResult) => {
    if (!isProviderResultSafeToSave(result)) {
      return;
    }

    const confirmed = window.confirm(
      `確定要用 provider 回傳的 ${result.constituents.length} 筆成分股取代 ${result.etfSymbol} 目前儲存的成分股嗎？`,
    );

    if (!confirmed) {
      return;
    }

    replaceConstituentsForEtf(
      result.etfSymbol,
      result.constituents.map((constituent) => ({
        etfSymbol: constituent.etfSymbol,
        stockSymbol: constituent.stockSymbol,
        stockName: constituent.stockName,
        weightPercent: constituent.weightPercent,
        industry: constituent.industry,
        asOfDate: constituent.asOfDate,
        source: constituent.source,
      })),
    );
    setSelectedEtfSymbol(result.etfSymbol);
  };

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">ETF 成分股資料</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">
              ETF 成分股
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              匯入每檔 ETF 目前使用的成分股清單，並用資料日期與來源標示新鮮度。
            </p>
          </div>
          <button
            className="w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50 sm:w-auto"
            onClick={handleReset}
            type="button"
          >
            重設範例資料
          </button>
        </header>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 text-blue-950">
          <h2 className="text-base font-semibold">資料狀態說明</h2>
          <p className="mt-2 text-sm leading-6">
            第二步：匯入 ETF 成分股資料。若 0050 provider 無法自動抓取，可使用 CSV / 貼上表格匯入。
          </p>
          <p className="mt-2 text-sm leading-6">
            此工具保留每檔 ETF 目前儲存的成分股資料；重新匯入同一檔 ETF 會取代該 ETF 的現有清單。穿透分析預設使用每檔 ETF 最新資料日期的成分股。
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="已儲存資料"
            value={`${summary.constituentCount} 筆`}
            helperText="ETF 成分股資料"
          />
          <StatCard
            label="涵蓋 ETF"
            value={`${summary.etfSymbolCount} 檔`}
            helperText="依 ETF 代號統計"
          />
          <StatCard
            label="不重複股票"
            value={`${summary.uniqueStockCount} 檔`}
            helperText="依股票代號統計"
          />
          <StatCard
            label="選取 ETF 權重合計"
            value={
              summary.selectedWeight === null
                ? "請選取 ETF"
                : formatPercent(summary.selectedWeight)
            }
            helperText={selectedEtfSymbol || "尚未選取"}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionCard
            title="ETF 持股自動來源"
            description="設定每檔 ETF 可能使用的官方來源；目前先做可行性測試與設定保存。"
          >
            <div className="grid gap-5">
              <p className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                ETF 持股自動抓取會依資料來源而異。若官方資料無法從瀏覽器穩定取得，仍建議使用 CSV 匯入作為備援。
              </p>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                <p className="font-semibold">目前正在試作 0050 provider。</p>
                <p>
                  會優先測試官方 PCF 申購買回清單，再以持股比重頁作為診斷備援。若自動來源抓取失敗，請使用 CSV 匯入。CSV 匯入仍是目前最穩定的備援流程。
                </p>
                <div className="mt-2 grid gap-1 text-xs">
                  <p>PCF page：{YUANTA_0050_PCF_URL}</p>
                  <p>ratio page：{YUANTA_0050_HOLDINGS_URL}</p>
                </div>
                <button
                  className="mt-3 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                  onClick={handleCreateYuanta0050Provider}
                  type="button"
                >
                  建立 0050 元大台灣50 provider
                </button>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">
                  台灣 ETF 官方來源能力註記
                </p>
                <div className="mt-3 grid gap-3">
                  {knownTaiwanEtfCapabilities.map((capability) => (
                    <article
                      className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-6"
                      key={capability.etfSymbol}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {capability.etfSymbol} {capability.etfName}
                          </p>
                          <p className="text-slate-600">{capability.issuer}</p>
                        </div>
                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                            capability.status === "ready_for_provider"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {capability.statusLabel}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-1 text-slate-600">
                        {capability.candidateSourceNotes.map((note) => (
                          <p key={note}>- {note}</p>
                        ))}
                      </div>
                      <p className="mt-3 font-medium text-slate-700">
                        {capability.recommendedFallback}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 lg:grid-cols-[1fr_1fr_1.4fr]">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  ETF 代號
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    list="etf-symbol-suggestions"
                    onChange={(event) =>
                      setProviderForm((currentForm) => ({
                        ...currentForm,
                        etfSymbol: event.target.value,
                      }))
                    }
                    placeholder="例如 0050"
                    value={providerForm.etfSymbol}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  provider type
                  <select
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setProviderForm((currentForm) => ({
                        ...currentForm,
                        providerType: event.target.value as EtfHoldingsProviderType,
                      }))
                    }
                    value={providerForm.providerType}
                  >
                    {providerTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  source URL
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setProviderForm((currentForm) => ({
                        ...currentForm,
                        sourceUrl: event.target.value,
                      }))
                    }
                    placeholder="官方資料來源 URL，可留空"
                    value={providerForm.sourceUrl ?? ""}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
                  notes
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) =>
                      setProviderForm((currentForm) => ({
                        ...currentForm,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="例如：官方網站只提供月資料"
                    value={providerForm.notes ?? ""}
                  />
                </label>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    checked={providerForm.enabled}
                    className="h-4 w-4 rounded border-stone-300 text-blue-700 focus:ring-blue-500"
                    onChange={(event) =>
                      setProviderForm((currentForm) => ({
                        ...currentForm,
                        enabled: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  enabled
                </label>

                <div className="flex flex-col gap-2 sm:flex-row lg:col-span-3">
                  <button
                    className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={!providerForm.etfSymbol.trim()}
                    onClick={handleSaveProviderConfig}
                    type="button"
                  >
                    儲存來源設定
                  </button>
                  <button
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50"
                    onClick={() => setProviderForm(emptyProviderForm)}
                    type="button"
                  >
                    清空表單
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-950">可行性說明</p>
                <ul className="mt-2 grid gap-1 text-sm leading-6 text-slate-600">
                  {providerCapabilityNotes.map((note) => (
                    <li key={note}>- {note}</li>
                  ))}
                </ul>
              </div>

              {providerConfigs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-slate-500">
                  尚未設定 ETF 持股自動來源。手動與 CSV 匯入仍是目前可靠備援。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-slate-500">
                        <th className="pb-3 font-medium">ETF 代號</th>
                        <th className="pb-3 font-medium">provider type</th>
                        <th className="pb-3 font-medium">source URL</th>
                        <th className="pb-3 font-medium">enabled</th>
                        <th className="pb-3 font-medium">notes</th>
                        <th className="pb-3 font-medium">status / capability note</th>
                        <th className="pb-3 text-right font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providerConfigs.map((config) => {
                        const testResult = providerTestResults[config.etfSymbol];

                        return (
                          <tr
                            className="border-b border-stone-100 align-top last:border-0"
                            key={config.etfSymbol}
                          >
                            <td className="py-4 font-semibold text-slate-950">
                              {config.etfSymbol}
                            </td>
                            <td className="py-4 text-slate-600">
                              {getProviderTypeLabel(config.providerType)}
                            </td>
                            <td className="max-w-xs break-words py-4 text-slate-600">
                              {config.sourceUrl ?? "-"}
                            </td>
                            <td className="py-4 text-slate-600">
                              {config.enabled ? "是" : "否"}
                            </td>
                            <td className="max-w-xs break-words py-4 text-slate-600">
                              {config.notes ?? "-"}
                            </td>
                            <td className="py-4 text-slate-600">
                              {testResult ? (
                                <div className="grid gap-1">
                                  <p className="font-medium text-slate-950">
                                    {providerStatusLabels[testResult.status]}
                                  </p>
                                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950">
                                    <p className="font-semibold">
                                      0050 provider 實機診斷
                                    </p>
                                    <div className="mt-2 grid gap-1">
                                      <p>
                                        測試時間：
                                        {formatDiagnosticTime(
                                          testResult.runtimeDiagnostics
                                            ?.testedAt ?? testResult.fetchedAt,
                                        )}
                                      </p>
                                      <p>測試來源：{testResult.source}</p>
                                      <p>
                                        執行環境：
                                        {getExecutionEnvironmentLabel(testResult)}
                                      </p>
                                      <p>
                                        結果狀態：
                                        {testResult.supportLevel
                                          ? providerSupportLevelLabels[
                                              testResult.supportLevel
                                            ]
                                          : providerStatusLabels[
                                              testResult.status
                                            ]}
                                      </p>
                                      <p>
                                        取得筆數：
                                        {testResult.constituents.length}
                                      </p>
                                      <p>
                                        權重合計：
                                        {formatPercent(
                                          getProviderResultWeightTotal(
                                            testResult,
                                          ),
                                        )}
                                      </p>
                                      <p>
                                        資料日期：
                                        {testResult.asOfDate ?? "-"}
                                      </p>
                                      <p>
                                        是否可安全儲存：
                                        {isProviderResultSafeToSave(testResult)
                                          ? "是"
                                          : "否"}
                                      </p>
                                      {testResult.supportLevel ===
                                      "blocked_by_cors" ? (
                                        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-950">
                                          瀏覽器端可能受到 CORS 限制，無法直接讀取官方來源。官方資料本身可用，但此 local-first 前端版本可能需要 CSV 匯入或 serverless proxy 才能自動更新。
                                        </p>
                                      ) : null}
                                      {testResult.errors.length > 0 ? (
                                        <div className="text-red-700">
                                          <p className="font-medium">
                                            錯誤訊息
                                          </p>
                                          {testResult.errors.map((error) => (
                                            <p key={error}>{error}</p>
                                          ))}
                                        </div>
                                      ) : null}
                                      <p className="font-medium">
                                        建議下一步：
                                        {getProviderDecisionNote(testResult)}
                                      </p>
                                    </div>
                                    <details className="mt-3 rounded-lg border border-blue-100 bg-white p-3">
                                      <summary className="cursor-pointer font-medium">
                                        debug details
                                      </summary>
                                      <div className="mt-2 grid gap-2 break-words text-xs text-slate-600">
                                        <p>
                                          fetchedAt：
                                          {testResult.fetchedAt}
                                        </p>
                                        <p>
                                          parsed row count：
                                          {testResult.constituents.length}
                                        </p>
                                        {testResult.attemptedSources?.map(
                                          (source) => (
                                            <div
                                              className="rounded border border-stone-200 p-2"
                                              key={`debug-${source.label}-${source.url}`}
                                            >
                                              <p>attempted URL：{source.url}</p>
                                              <p>
                                                source status：
                                                {
                                                  providerSupportLevelLabels[
                                                    source.status
                                                  ]
                                                }
                                              </p>
                                              <p>
                                                raw error name：
                                                {source.errorName ?? "-"}
                                              </p>
                                              <p>
                                                raw error message：
                                                {source.errorMessage ?? "-"}
                                              </p>
                                              <p>
                                                CORS-like：
                                                {source.corsLikeFailure
                                                  ? "yes"
                                                  : "no"}
                                              </p>
                                            </div>
                                          ),
                                        )}
                                        {testResult.warnings.length > 0 ? (
                                          <div>
                                            <p className="font-medium">
                                              warnings
                                            </p>
                                            {testResult.warnings.map(
                                              (warning) => (
                                                <p key={`debug-${warning}`}>
                                                  {warning}
                                                </p>
                                              ),
                                            )}
                                          </div>
                                        ) : null}
                                        {testResult.errors.length > 0 ? (
                                          <div>
                                            <p className="font-medium">
                                              errors
                                            </p>
                                            {testResult.errors.map((error) => (
                                              <p key={`debug-${error}`}>
                                                {error}
                                              </p>
                                            ))}
                                          </div>
                                        ) : null}
                                      </div>
                                    </details>
                                  </div>
                                  <p>
                                    支援等級：
                                    {testResult.supportLevel
                                      ? providerSupportLevelLabels[
                                          testResult.supportLevel
                                        ]
                                      : "-"}
                                  </p>
                                  <p>
                                    可安全儲存：
                                    {isProviderResultSafeToSave(testResult)
                                      ? "是"
                                      : "否，需有有效權重且至少 20 筆 0050 成分股"}
                                  </p>
                                  {testResult.attemptedSources &&
                                  testResult.attemptedSources.length > 0 ? (
                                    <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3">
                                      <p className="font-medium text-slate-700">
                                        嘗試來源
                                      </p>
                                      <div className="mt-2 grid gap-2">
                                        {testResult.attemptedSources.map(
                                          (source) => (
                                            <div
                                              className="break-words"
                                              key={`${source.label}-${source.url}`}
                                            >
                                              <p>
                                                {source.label}：
                                                {
                                                  providerSupportLevelLabels[
                                                    source.status
                                                  ]
                                                }
                                              </p>
                                              <p className="text-xs text-slate-500">
                                                {source.url}
                                              </p>
                                              {source.notes ? (
                                                <p>{source.notes}</p>
                                              ) : null}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                  {testResult.constituents.length > 0 ? (
                                    <p>
                                      回傳 {testResult.constituents.length} 筆成分股；尚未自動覆蓋既有資料。
                                    </p>
                                  ) : null}
                                  {testResult.warnings.map((warning) => (
                                    <p key={warning}>{warning}</p>
                                  ))}
                                  {testResult.errors.map((error) => (
                                    <p className="text-red-700" key={error}>
                                      {error}
                                    </p>
                                  ))}
                                  {testResult.constituents.length > 0 ? (
                                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                                      <div className="grid gap-1">
                                        <p>ETF 代號：{testResult.etfSymbol}</p>
                                        <p>資料日期：{testResult.asOfDate ?? "-"}</p>
                                        <p>資料來源：{testResult.source}</p>
                                        <p>成分股筆數：{testResult.constituents.length}</p>
                                        <p>
                                          權重合計：
                                          {formatPercent(
                                            getProviderResultWeightTotal(testResult),
                                          )}
                                        </p>
                                      </div>
                                      <div className="mt-3 overflow-x-auto">
                                        <table className="w-full min-w-[420px] text-left text-xs">
                                          <thead>
                                            <tr className="border-b border-emerald-200">
                                              <th className="pb-2 font-medium">ETF 代號</th>
                                              <th className="pb-2 font-medium">股票</th>
                                              <th className="pb-2 text-right font-medium">權重</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {testResult.constituents
                                              .slice(0, 10)
                                              .map((constituent) => (
                                                <tr
                                                  className="border-b border-emerald-100 last:border-0"
                                                  key={`${constituent.etfSymbol}-${constituent.stockSymbol}`}
                                                >
                                                  <td className="py-2">{constituent.etfSymbol}</td>
                                                  <td className="py-2">
                                                    {constituent.stockSymbol}{" "}
                                                    {constituent.stockName}
                                                  </td>
                                                  <td className="py-2 text-right">
                                                    {formatPercent(
                                                      constituent.weightPercent,
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      {isProviderResultSafeToSave(testResult) ? (
                                        <button
                                          className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                                          onClick={() =>
                                            handleSaveProviderResult(testResult)
                                          }
                                          type="button"
                                        >
                                          儲存此 provider 結果
                                        </button>
                                      ) : (
                                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                                          目前結果未達 0050 儲存門檻；若少於 20
                                          筆或缺少有效權重，請使用 CSV 匯入完整成分股。
                                        </p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                "尚未測試"
                              )}
                            </td>
                            <td className="py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                  disabled={testingProviderSymbol === config.etfSymbol}
                                  onClick={() => handleTestProviderConfig(config)}
                                  type="button"
                                >
                                  {testingProviderSymbol === config.etfSymbol
                                    ? "測試中..."
                                    : "測試抓取"}
                                </button>
                                <button
                                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50"
                                  onClick={() => handleEditProviderConfig(config)}
                                  type="button"
                                >
                                  編輯
                                </button>
                                <button
                                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                                  onClick={() => handleDeleteProviderConfig(config)}
                                  type="button"
                                >
                                  刪除
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-6">
            <SectionCard
              title="1. 匯入設定"
              description="設定 ETF 代號、資料日期與來源。"
            >
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  ETF 代號
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    list="etf-symbol-suggestions"
                    onChange={(event) => setEtfSymbol(event.target.value)}
                    placeholder="例如 0050"
                    value={etfSymbol}
                  />
                  <datalist id="etf-symbol-suggestions">
                    {etfSymbolSuggestions.map((symbol) => (
                      <option key={symbol} value={symbol} />
                    ))}
                  </datalist>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  資料日期
                  <input
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) => setAsOfDate(event.target.value)}
                    type="date"
                    value={asOfDate}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  資料來源
                  <select
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(event) => setSource(event.target.value)}
                    value={source}
                  >
                    {sourceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </SectionCard>

            <SectionCard
              title="2. 貼上或匯入資料"
              description="支援逗號分隔與從 Excel 複製的 tab 分隔資料。解析後不會立即儲存。"
            >
              <div className="grid gap-4">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-slate-700">
                  <p className="font-semibold text-slate-900">
                    範例格式，非最新真實持股
                  </p>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-white p-3 font-mono text-xs leading-5 text-slate-700">
                    {samplePasteText}
                  </pre>
                </div>
                <textarea
                  className="min-h-64 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm leading-6 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setPasteText(event.target.value)}
                  value={pasteText}
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                    onClick={handleParse}
                    type="button"
                  >
                    解析資料
                  </button>
                  <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:bg-stone-50">
                    匯入 CSV
                    <input
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleCsvFileChange}
                      type="file"
                    />
                  </label>
                </div>

                {parseErrors.length > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                    <p className="font-semibold">解析錯誤</p>
                    <div className="mt-2 grid gap-1">
                      {parseErrors.map((error) => (
                        <p key={error}>{error}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="3. 匯入預覽"
            description="確認資料正確後，再取代這檔 ETF 目前儲存的成分股。"
          >
            {previewRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-6 text-slate-500">
                尚未有預覽資料。請輸入 ETF 代號，貼上資料或匯入 CSV，然後按「解析資料」。
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-200 text-slate-500">
                        <th className="pb-3 font-medium">ETF 代號</th>
                        <th className="pb-3 font-medium">成分股代號</th>
                        <th className="pb-3 font-medium">成分股名稱</th>
                        <th className="pb-3 text-right font-medium">權重</th>
                        <th className="pb-3 font-medium">產業</th>
                        <th className="pb-3 font-medium">資料日期</th>
                        <th className="pb-3 font-medium">資料來源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRecords.map((record, index) => (
                        <tr
                          className="border-b border-stone-100 last:border-0"
                          key={`${record.etfSymbol}-${record.stockSymbol}-${index}`}
                        >
                          <td className="py-4 font-semibold text-slate-950">
                            {record.etfSymbol}
                          </td>
                          <td className="py-4 text-slate-700">
                            {record.stockSymbol}
                          </td>
                          <td className="py-4 text-slate-700">
                            {record.stockName}
                          </td>
                          <td className="py-4 text-right font-medium text-slate-950">
                            {formatPercent(record.weightPercent)}
                          </td>
                          <td className="py-4 text-slate-600">
                            {record.industry ?? "未分類"}
                          </td>
                          <td className="py-4 text-slate-600">
                            {record.asOfDate ?? "-"}
                          </td>
                          <td className="py-4 text-slate-600">
                            {record.source ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-fit"
                  onClick={handleSavePreview}
                  type="button"
                >
                  儲存並取代此 ETF 的成分股
                </button>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          title="ETF 資料狀態"
          description="顯示每檔 ETF 目前可用的最新成分股資料日期與來源。"
        >
          {latestDataStatuses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-slate-500">
              尚未儲存任何 ETF 成分股資料。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-slate-500">
                    <th className="pb-3 font-medium">ETF 代號</th>
                    <th className="pb-3 font-medium">最新資料日期</th>
                    <th className="pb-3 font-medium">來源</th>
                    <th className="pb-3 text-right font-medium">成分股筆數</th>
                    <th className="pb-3 font-medium">資料狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {latestDataStatuses.map((status) => (
                    <tr
                      className="border-b border-stone-100 last:border-0"
                      key={status.etfSymbol}
                    >
                      <td className="py-4 font-semibold text-slate-950">
                        {status.etfSymbol}
                      </td>
                      <td className="py-4 text-slate-600">{status.latestAsOfDate}</td>
                      <td className="py-4 text-slate-600">{status.source ?? "-"}</td>
                      <td className="py-4 text-right text-slate-600">
                        {status.recordCount}
                      </td>
                      <td className="py-4 text-slate-600">
                        {status.hasMissingDate ? "部分資料未指定日期" : "已標示日期"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {dataQualityWarnings.length > 0 ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-base font-semibold">資料品質提醒</h2>
            <div className="mt-3 grid gap-2 text-sm leading-6">
              {dataQualityWarnings.map((warning) => (
                <p key={warning.id}>{warning.message}</p>
              ))}
            </div>
          </section>
        ) : null}

        <SectionCard
          title="4. 目前已儲存資料"
          description="這些資料儲存在瀏覽器 localStorage。"
        >
          <div className="mb-4 flex flex-col gap-2 sm:max-w-xs">
            <label className="text-sm font-medium text-slate-700" htmlFor="etf-filter">
              篩選 ETF
            </label>
            <select
              className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              id="etf-filter"
              onChange={(event) => setSelectedEtfSymbol(event.target.value)}
              value={selectedEtfSymbol}
            >
              <option value="">全部 ETF</option>
              {etfSymbolSuggestions.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredConstituents.map((constituent) => (
              <article
                className="rounded-lg border border-stone-200 bg-stone-50 p-4"
                key={constituent.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-blue-700">
                      {constituent.etfSymbol}
                    </p>
                    <h3 className="mt-1 font-semibold text-slate-950">
                      {constituent.stockSymbol} {constituent.stockName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {constituent.industry ?? "未分類"}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-stone-200">
                    {formatPercent(constituent.weightPercent)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {constituent.asOfDate ?? "未指定日期"} /{" "}
                  {constituent.source ?? "未指定來源"}
                </p>
                <button
                  className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  onClick={() => handleDelete(constituent)}
                  type="button"
                >
                  刪除
                </button>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-slate-500">
                  <th className="pb-3 font-medium">ETF</th>
                  <th className="pb-3 font-medium">成分股</th>
                  <th className="pb-3 text-right font-medium">權重</th>
                  <th className="pb-3 font-medium">產業</th>
                  <th className="pb-3 font-medium">日期</th>
                  <th className="pb-3 font-medium">來源</th>
                  <th className="pb-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredConstituents.map((constituent) => (
                  <tr
                    className="border-b border-stone-100 last:border-0"
                    key={constituent.id}
                  >
                    <td className="py-4 font-semibold text-slate-950">
                      {constituent.etfSymbol}
                    </td>
                    <td className="py-4">
                      <div className="font-medium text-slate-950">
                        {constituent.stockSymbol}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {constituent.stockName}
                      </div>
                    </td>
                    <td className="py-4 text-right font-medium text-slate-950">
                      {formatPercent(constituent.weightPercent)}
                    </td>
                    <td className="py-4 text-slate-600">
                      {constituent.industry ?? "未分類"}
                    </td>
                    <td className="py-4 text-slate-600">
                      {constituent.asOfDate ?? "-"}
                    </td>
                    <td className="py-4 text-slate-600">
                      {constituent.source ?? "-"}
                    </td>
                    <td className="py-4">
                      <div className="flex justify-end">
                        <button
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                          onClick={() => handleDelete(constituent)}
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
    </main>
  );
}
