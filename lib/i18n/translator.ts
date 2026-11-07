import { formatNumber, type Locale } from "./config";
import type { Dict, DictValue, Messages } from "./types";

/**
 * Pure translation lookup — deliberately kept out of any "use client" module so
 * both server components and the client provider can import it.
 */

/** Walks a dotted path (`"cards.0.title"`) through a message tree. */
function lookup(source: DictValue | undefined, path: string): DictValue | undefined {
  if (source == null) return undefined;
  let current: DictValue | undefined = source;
  for (const segment of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, DictValue>)[segment];
  }
  return current;
}

/**
 * Substitutes `{name}` placeholders, rendering each value in the locale's own
 * numerals. Only the value is converted, never the surrounding template, so a
 * message keeps whatever digits it was written with — "Magento 2", "$15,000".
 */
function interpolate(
  template: string,
  locale: Locale,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? formatNumber(vars[key], locale) : match
  );
}

export type Translator<T extends Dict = Dict> = {
  /** Resolves a key to a string, falling back to English then to the key itself. */
  (path: string, vars?: Record<string, string | number>): string;
  /** Resolves a key to whatever it holds — used for lists and object groups. */
  raw: <R = DictValue>(path: string, fallback?: R) => R;
  /** Resolves a key to a string array (empty array when missing). */
  list: (path: string) => string[];
  locale: Locale;
  dict: T;
};

/**
 * `bundle` is the active locale's loaded bundle (see ./load.ts); without it,
 * or for English, the namespace's English copy is used.
 */
export function createTranslator<T extends Dict>(
  messages: Messages<T>,
  locale: Locale,
  bundle?: Record<string, Dict>
): Translator<T> {
  const active = ((locale !== "en" && bundle?.[messages.id]) || messages.en) as T;
  const fallback = messages.en as T;

  const resolve = (path: string): DictValue | undefined => {
    const hit = lookup(active, path);
    if (hit !== undefined) return hit;
    return lookup(fallback, path);
  };

  const t = ((path: string, vars?: Record<string, string | number>) => {
    const value = resolve(path);
    if (typeof value === "string") return interpolate(value, locale, vars);
    if (typeof value === "number") return formatNumber(value, locale);
    // Missing keys surface as the key itself, which is obvious in review but
    // never breaks a render.
    return path;
  }) as Translator<T>;

  t.raw = <R = DictValue>(path: string, fallbackValue?: R): R => {
    const value = resolve(path);
    return value === undefined ? (fallbackValue as R) : (value as unknown as R);
  };

  t.list = (path: string): string[] => {
    const value = resolve(path);
    return Array.isArray(value) ? (value as DictValue[]).map((entry) => String(entry)) : [];
  };

  t.locale = locale;
  t.dict = active;

  return t;
}
