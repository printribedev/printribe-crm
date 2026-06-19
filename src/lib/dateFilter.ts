export type FilterPreset =
  | "7d" | "1m" | "3m" | "6m" | "cfy" | "lfy" | "ytd" | "custom";

export type DateFilter = {
  preset: FilterPreset;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

const STORAGE_KEY = "printribe_date_filter";

function fyBounds(year: number) {
  // FY runs Apr 1 – Mar 31
  return {
    from: `${year}-04-01`,
    to: `${year + 1}-03-31`,
  };
}

export function presetToRange(preset: FilterPreset, customFrom = "", customTo = ""): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  function daysAgo(n: number) {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function monthsAgo(n: number) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0, 10);
  }

  const m = now.getMonth(); // 0-indexed
  const y = now.getFullYear();
  const fyStart = m >= 3 ? y : y - 1; // April = month 3

  switch (preset) {
    case "7d":     return { from: daysAgo(7), to: today };
    case "1m":     return { from: monthsAgo(1), to: today };
    case "3m":     return { from: monthsAgo(3), to: today };
    case "6m":     return { from: monthsAgo(6), to: today };
    case "cfy":    return fyBounds(fyStart);
    case "lfy":    return fyBounds(fyStart - 1);
    case "ytd":    return { from: `${y}-01-01`, to: today };
    case "custom": return { from: customFrom, to: customTo };
  }
}

export const PRESET_LABELS: Record<FilterPreset, string> = {
  "7d":     "Last 7 days",
  "1m":     "Last month",
  "3m":     "Last 3 months",
  "6m":     "Last 6 months",
  "cfy":    "Current FY",
  "lfy":    "Last FY",
  "ytd":    "Year till date",
  "custom": "Custom",
};

export function loadFilter(): DateFilter {
  if (typeof window === "undefined") return defaultFilter();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DateFilter;
  } catch { /* ignore */ }
  return defaultFilter();
}

export function saveFilter(f: DateFilter) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
}

function defaultFilter(): DateFilter {
  const { from, to } = presetToRange("cfy");
  return { preset: "cfy", from, to };
}

export function applyDateFilter<T extends { date: string }>(items: T[], f: DateFilter): T[] {
  if (!f.from && !f.to) return items;
  const from = f.from ? new Date(f.from).getTime() : -Infinity;
  const to = f.to ? new Date(f.to + "T23:59:59").getTime() : Infinity;
  return items.filter(o => {
    const t = new Date(o.date).getTime();
    return t >= from && t <= to;
  });
}
