const STORAGE_KEY = "ink-visitor-id"

function mint(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * A stable per-browser id used to de-duplicate blog likes without requiring an
 * account. Returns "" during SSR; callers should read it inside an effect.
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") return ""
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const fresh = mint()
    window.localStorage.setItem(STORAGE_KEY, fresh)
    return fresh
  } catch {
    // Private mode / storage disabled — likes still work, they just won't persist.
    return mint()
  }
}
