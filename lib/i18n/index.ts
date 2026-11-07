import { useMemo } from "react"
import { createTranslator, type Translator } from "./translator"
import type { Dict, Messages } from "./types"
import type { Locale } from "./config"

export { formatDateForLocale, formatNumber, type Locale } from "./config"
export { createTranslator, type Translator } from "./translator"
export { defineMessages, type Dict, type DictValue, type Messages } from "./types"

export function useLocale(): Locale {
  return "en"
}

/** Looks copy up in a message namespace. */
export function useT<T extends Dict>(messages: Messages<T>): Translator<T> {
  return useMemo(() => createTranslator(messages, "en"), [messages])
}
