import type { Locale } from "./config";

/** A translation value can be a string, a list, or a nested group of either. */
export type DictValue = string | number | DictValue[] | { [key: string]: DictValue };

export type Dict = { [key: string]: DictValue };

/**
 * The shape a translation must have: the English copy's structure, with any
 * key allowed to be missing (it falls back to English, key by key).
 */
export type PartialCopy<T> = T extends readonly (infer U)[]
  ? PartialCopy<U>[]
  : T extends object
    ? { [K in keyof T]?: PartialCopy<T[K]> }
    : T;

/**
 * A namespace of messages: its English copy, which ships with the code that
 * uses it, plus an `id` that names the namespace in each other language's
 * bundle (lib/i18n/locales/<locale>.ts). Those bundles are loaded on demand,
 * so English visitors download English only. English also doubles as the
 * per-key fallback for anything a translation has not caught up with yet.
 */
export type Messages<T extends Dict = Dict> = { id: string; en: T };

/**
 * Declares a namespace. The `id` must be unique and match the key used for
 * this namespace in every locale bundle (by convention, the file's name).
 */
export function defineMessages<T extends Dict>(id: string, messages: { en: T }): Messages<T> {
  return { id, en: messages.en };
}
