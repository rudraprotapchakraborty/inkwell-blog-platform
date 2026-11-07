/** Inkwell is English only; the copy lives next to the code that uses it. */
export type Locale = "en"
export const DEFAULT_LOCALE: Locale = "en"

export function formatNumber(value: string | number, _locale: Locale = "en"): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : String(value)
}

export function formatDateForLocale(
  dateStr: string,
  _locale: Locale = "en",
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" },
): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", options).format(date)
}
