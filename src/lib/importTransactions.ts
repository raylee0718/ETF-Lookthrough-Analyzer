import type { TransactionRecord, TransactionType } from "../types/transactions";

export type TransactionImportInput = Omit<TransactionRecord, "id">;

export type TransactionImportRow = {
  rowNumber: number;
  raw: Record<string, string>;
  input: TransactionImportInput;
  errors: string[];
  isValid: boolean;
};

export type TransactionImportResult = {
  rows: TransactionImportRow[];
  error?: string;
};

const headerAliases = new Map<string, keyof TransactionImportInput>([
  ["日期", "date"],
  ["date", "date"],
  ["代號", "symbol"],
  ["symbol", "symbol"],
  ["名稱", "name"],
  ["name", "name"],
  ["類別", "category"],
  ["category", "category"],
  ["買賣", "type"],
  ["type", "type"],
  ["股數", "shares"],
  ["shares", "shares"],
  ["成交價", "price"],
  ["price", "price"],
  ["手續費", "fee"],
  ["fee", "fee"],
  ["交易稅", "tax"],
  ["tax", "tax"],
  ["備註", "note"],
  ["note", "note"],
]);

const requiredFields: Array<keyof TransactionImportInput> = [
  "date",
  "symbol",
  "type",
  "shares",
  "price",
];

const fixedOrderFields: Array<keyof TransactionImportInput> = [
  "date",
  "symbol",
  "name",
  "category",
  "type",
  "shares",
  "price",
  "fee",
  "tax",
  "note",
];

const parseTransactionType = (value: string): TransactionType | undefined => {
  const normalizedValue = value.trim();

  if (normalizedValue === "買進") {
    return "buy";
  }

  if (normalizedValue === "賣出") {
    return "sell";
  }

  return undefined;
};

const isValidDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
};

const parseNumber = (value: string) => {
  const normalizedValue = value.trim().replace(/,/g, "");

  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const parseDelimitedLine = (line: string, delimiter: "," | "\t") => {
  const cells: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === delimiter && !inQuotes) {
      cells.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  cells.push(currentCell.trim());
  return cells;
};

const parseDelimitedText = (text: string) => {
  const normalizedText = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalizedText.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], delimiter: "," as const };
  }

  const headerLine = lines[0];
  const delimiter = (headerLine.split("\t").length > headerLine.split(",").length
    ? "\t"
    : ",") as "," | "\t";

  return {
    delimiter,
    rows: lines.map((line) => parseDelimitedLine(line, delimiter)),
  };
};

const mapHeaders = (headers: string[]) =>
  headers.map((header) => headerAliases.get(header.trim()) ?? null);

const isHeaderRow = (row: string[]) => {
  const mappedHeaders = mapHeaders(row);
  return mappedHeaders.some((field) => field !== null);
};

export const parseTransactionsImportText = (text: string): TransactionImportResult => {
  const parsedText = parseDelimitedText(text);

  if (parsedText.rows.length === 0) {
    return { rows: [], error: "請先貼上 CSV 或表格資料。" };
  }

  const [firstRow, ...remainingRows] = parsedText.rows;
  const hasHeader = isHeaderRow(firstRow);
  const mappedHeaders = hasHeader
    ? mapHeaders(firstRow)
    : fixedOrderFields;
  const dataRows = hasHeader ? remainingRows : parsedText.rows;
  const missingFields = requiredFields.filter((field) => !mappedHeaders.includes(field));

  if (dataRows.length === 0) {
    return { rows: [], error: "沒有找到可匯入的交易資料。" };
  }

  const rows = dataRows.map((dataRow, index) => {
    const raw: Record<string, string> = {};

    mappedHeaders.forEach((field, cellIndex) => {
      if (!field) return;
      raw[field] = dataRow[cellIndex]?.trim() ?? "";
    });

    const type = parseTransactionType(raw.type ?? "");
    const shares = parseNumber(raw.shares ?? "");
    const price = parseNumber(raw.price ?? "");
    const fee = parseNumber(raw.fee ?? "");
    const tax = parseNumber(raw.tax ?? "");
    const errors: string[] = [];

    missingFields.forEach((field) => {
      const labels: Record<keyof TransactionImportInput, string> = {
        date: "日期",
        symbol: "代號",
        name: "名稱",
        category: "類別",
        type: "買賣",
        shares: "股數",
        price: "成交價",
        fee: "手續費",
        tax: "交易稅",
        note: "備註",
      };
      errors.push(`缺少必要欄位：${labels[field]}`);
    });

    if (!raw.date?.trim()) {
      errors.push("日期必填");
    } else if (!isValidDate(raw.date.trim())) {
      errors.push("日期格式必須是 YYYY-MM-DD");
    }
    if (!raw.symbol?.trim()) errors.push("代號必填");
    if (!type) errors.push("買賣必須是買進或賣出");
    if (shares === undefined || Number.isNaN(shares) || shares <= 0) {
      errors.push("股數必須大於 0");
    }
    if (price === undefined || Number.isNaN(price) || price <= 0) {
      errors.push("成交價必須大於 0");
    }
    if (fee !== undefined && (Number.isNaN(fee) || fee < 0)) {
      errors.push("手續費必須大於或等於 0");
    }
    if (tax !== undefined && (Number.isNaN(tax) || tax < 0)) {
      errors.push("交易稅必須大於或等於 0");
    }

    const input: TransactionImportInput = {
      date: raw.date?.trim() ?? "",
      symbol: raw.symbol?.trim().toUpperCase() ?? "",
      name: raw.name?.trim() ?? "",
      category: raw.category?.trim() ?? "",
      type: type ?? "buy",
      shares: shares ?? 0,
      price: price ?? 0,
      fee: fee && fee > 0 ? fee : undefined,
      tax: tax && tax > 0 ? tax : undefined,
      note: raw.note?.trim() || undefined,
    };
    const isValid = errors.length === 0;

    return {
      rowNumber: hasHeader ? index + 2 : index + 1,
      raw,
      input,
      errors,
      isValid,
    };
  });

  return { rows };
};
