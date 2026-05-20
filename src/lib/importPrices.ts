import type { PriceRecord } from "../types/prices";

export type PriceImportInput = Omit<PriceRecord, "id">;

export type PriceImportRow = {
  rowNumber: number;
  input: PriceImportInput;
  errors: string[];
  isValid: boolean;
  isDuplicate: boolean;
};

export type PriceImportResult = {
  rows: PriceImportRow[];
  error?: string;
};

const headerAliases = {
  date: ["日期", "date"],
  symbol: ["代號", "symbol"],
  name: ["名稱", "name"],
  price: ["收盤價", "close", "price"],
  source: ["來源", "source"],
  note: ["備註", "note"],
} as const;

type HeaderKey = keyof typeof headerAliases;

const normalizeHeader = (value: string) => value.trim().toLowerCase();

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

const getDelimiter = (line: string): "," | "\t" =>
  line.includes("\t") ? "\t" : ",";

const mapHeaders = (headers: string[]) => {
  const columnMap = new Map<HeaderKey, number>();

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header);

    (Object.keys(headerAliases) as HeaderKey[]).forEach((key) => {
      if (columnMap.has(key)) {
        return;
      }

      const aliases = headerAliases[key].map(normalizeHeader);

      if (aliases.includes(normalizedHeader)) {
        columnMap.set(key, index);
      }
    });
  });

  return columnMap;
};

const getCell = (
  cells: string[],
  columnMap: Map<HeaderKey, number>,
  key: HeaderKey,
) => {
  const index = columnMap.get(key);
  return index === undefined ? "" : cells[index]?.trim() ?? "";
};

const normalizePrice = (value: string) =>
  Number(value.replace(/,/g, "").trim());

export function parseDailyPriceImportText(
  rawText: string,
  existingPriceRecords: PriceRecord[] = [],
): PriceImportResult {
  const lines = rawText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], error: "請貼上含有標題列的價格資料。" };
  }

  const headerDelimiter = getDelimiter(lines[0]);
  const headers = splitDelimitedLine(lines[0], headerDelimiter);
  const columnMap = mapHeaders(headers);

  if (!columnMap.has("date") || !columnMap.has("symbol") || !columnMap.has("price")) {
    return {
      rows: [],
      error: "標題列需包含日期、代號、收盤價或其英文欄位名稱。",
    };
  }

  const existingKeys = new Set(
    existingPriceRecords.map(
      (record) => `${record.date}::${record.symbol.toUpperCase()}`,
    ),
  );

  const rows = lines.slice(1).map<PriceImportRow>((line, index) => {
    const delimiter = getDelimiter(line);
    const cells = splitDelimitedLine(line, delimiter);
    const date = getCell(cells, columnMap, "date");
    const symbol = getCell(cells, columnMap, "symbol").toUpperCase();
    const name = getCell(cells, columnMap, "name");
    const priceText = getCell(cells, columnMap, "price");
    const price = normalizePrice(priceText);
    const source = getCell(cells, columnMap, "source");
    const note = getCell(cells, columnMap, "note");
    const errors: string[] = [];

    if (!date) {
      errors.push("日期為必填。");
    }

    if (!symbol) {
      errors.push("代號為必填。");
    }

    if (!Number.isFinite(price) || price <= 0) {
      errors.push("收盤價必須大於 0。");
    }

    const duplicateKey = `${date}::${symbol}`;
    const isDuplicate = Boolean(date && symbol && existingKeys.has(duplicateKey));

    return {
      rowNumber: index + 2,
      input: {
        date,
        symbol,
        name: name || undefined,
        price: Number.isFinite(price) ? price : 0,
        sourceType: "csv",
        source: source || "CSV 匯入",
        fetchedAt: new Date().toISOString(),
        note: note || undefined,
      },
      errors,
      isValid: errors.length === 0,
      isDuplicate,
    };
  });

  return { rows };
}
