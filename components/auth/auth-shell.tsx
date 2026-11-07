"use client"

import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import Brand from "@/components/Brand"
import ThemeToggle from "@/components/ThemeToggle"
import AuthArt from "./auth-art"
import type { Crumb } from "@/components/Breadcrumbs"

/**
 * Two column auth layout, the same as the other projects: the form on the
 * left, an illustration (or the test accounts) on the right. The page brings
 * its own header, so the site navbar is hidden on these routes.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  /** Kept for call-site parity with the flow's steps; the layout does not show a breadcrumb. */
  step?: string
  trail?: Crumb[]
  title: string
  subtitle?: string
  footer?: ReactNode
  /** A custom panel (the test accounts) shows on every screen size; the art is desktop-only. */
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="frame flex min-h-[72px] items-center justify-between">
        <Brand />
        <ThemeToggle />
      </header>

      <div className="frame grid items-center gap-12 pb-16 pt-4 lg:min-h-[calc(100vh-150px)] grid-cols-[minmax(0,1fr)] lg:grid-cols-2 lg:gap-24">
        <div className="mx-auto w-full max-w-[420px]">
          <h1 className="display page-enter text-[clamp(38px,4.4vw,56px)]">
            {title}
            <span className="accent">.</span>
          </h1>
          {subtitle && <p className="mt-3 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
        </div>

        <aside className={`mx-auto w-full ${aside ? "max-w-[420px] lg:max-w-[560px]" : "hidden max-w-[560px] lg:block"}`}>
          {aside ?? <AuthArt />}
        </aside>
      </div>
    </div>
  )
}

/** Inline validation / server error. Announced as soon as it appears. */
export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" className="animate-pop flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-relaxed">{message}</p>
    </div>
  )
}

/** Success / informational message, same shape as {@link AuthError}. */
export function AuthNotice({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="status" className="animate-pop flex items-start gap-3 rounded-xl border border-done/30 bg-brand-soft p-3.5 text-sm text-done">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-relaxed">{message}</p>
    </div>
  )
}

/** The form's one primary action, with a busy state that holds its size. */
export function AuthSubmit({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean
  label: string
  loadingLabel: string
}) {
  return (
    <button type="submit" disabled={loading} aria-busy={loading || undefined} className="btn btn-primary w-full py-3.5">
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        label
      )}
    </button>
  )
}
