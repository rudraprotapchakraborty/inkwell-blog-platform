import type { Metadata } from "next"

const TITLES: Record<string, string> = {
  newPost: "Write a post",
  editPost: "Edit post",
  login: "Sign in",
  register: "Create account",
  forgotPassword: "Reset password",
  accountSettings: "Settings",
  account: "Account",
}

/** Title + canonical for a page, optionally kept out of search results. */
export function pageMetadata(key: string, path: string, opts: { noIndex?: boolean } = {}): Metadata {
  return {
    title: TITLES[key] ?? "Inkwell",
    alternates: { canonical: path },
    ...(opts.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
