export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);

export const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 2,
  }).format(value)}%`;

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 2,
  }).format(value);

export const formatShares = (value: number) =>
  new Intl.NumberFormat("zh-TW", {
    maximumFractionDigits: 3,
  }).format(value);
