"use client"

import type { ReactNode } from "react"
import { motion, useReducedMotion } from "@/lib/motion"
import { Check } from "lucide-react"
import { useT } from "@/lib/i18n"
import { authMessages } from "@/lib/i18n/messages/auth"
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs"

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** A seamless thin swell, two panels wide, so it can drift and loop unseen. */
const SWELL = (() => {
  let d = "M0,30"
  for (let x = 10; x <= 2000; x += 10) d += ` L${x},${(30 + Math.sin((x / 2000) * Math.PI * 8) * 9).toFixed(1)}`
  return d
})()

/**
 * The editorial panel beside the form: what an account is for, on the deep
 * band the homepage uses for its other side of the business. Wide screens
 * only — on a phone it would push the form below the fold, and the form is
 * the point.
 *
 * It floats as an inset panel below the navbar rather than running to the
 * top edge, so the bar's dark logo never sits on dark ground.
 */
function AccountPanel() {
  const t = useT(authMessages)
  const perks = t.list("panel.perks")

  return (
    <aside className="relative hidden overflow-hidden rounded-xl bg-brand-soft text-ink lg:col-span-5 lg:my-3 lg:ml-3 lg:mt-3 lg:flex lg:flex-col lg:justify-between">
      <div className="px-10 pt-12 xl:px-14 xl:pt-16">
        <p className="eyeline flex items-center gap-3 text-ink/60">
          <span aria-hidden className="h-px w-6 bg-current opacity-50" />
          {t("panel.label")}
        </p>
        <p
          className="cs-display mt-8 max-w-[22rem]"
          style={{ fontSize: "clamp(2.25rem, 3.6vw, 3.5rem)", lineHeight: 0.98, letterSpacing: "-0.045em" }}
        >
          {t("panel.headline")} <span className="cs-accent text-cs-cyan">{t("panel.headlineAccent")}</span>
        </p>
        <ul className="mt-12 max-w-[24rem] border-t border-ink/15">
          {perks.map(perk => (
            <li key={perk} className="flex items-start gap-3 border-b border-ink/15 py-4 text-[15px] leading-snug text-ink/80">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-cs-cyan" strokeWidth={2.5} />
              {perk}
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden className="relative">
        <div className="h-10 overflow-hidden">
          <svg viewBox="0 0 2000 60" preserveAspectRatio="none" className="cs-swell-slow h-full w-[200%]">
            <path d={SWELL} fill="none" stroke="rgb(var(--cs-cyan) / 0.45)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
        <p
          className="select-none whitespace-nowrap px-8 font-extrabold leading-[0.8] text-ink/[0.07]"
          style={{ fontSize: "clamp(3rem, 5.9vw, 6.25rem)", letterSpacing: "-0.055em", transform: "translateY(0.16em)" }}
        >
          Inkwell
        </p>
      </div>
    </aside>
  )
}

/**
 * The frame shared by the sign-in, registration and verification screens, so
 * all three read as one flow: the account panel on the left, the form on the
 * paper on the right, opened by a breadcrumb ending at this step and the display
 * heading the rest of the site uses.
 */
export function AuthShell({
  step,
  trail,
  title,
  subtitle,
  footer,
  children,
}: {
  /** Which step of the flow this is: the last level of the breadcrumb. */
  step: string
  /** Levels between Home and the step, when the step sits inside another page's flow. */
  trail?: Crumb[]
  title: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
}) {
  const still = useReducedMotion() ?? false

  return (
    <div className="grid min-h-[100svh] bg-paper text-ink lg:grid-cols-12">
      <AccountPanel />

      <div className="flex items-center justify-center px-5 pb-16 pt-28 sm:px-8 lg:col-span-7 lg:pt-32">
        <motion.div
          initial={still ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="w-full max-w-[26rem]"
        >
          <div className="eyeline text-muted">
            <Breadcrumbs structuredData={false} items={[...(trail ?? []), { label: step }]} />
          </div>
          <h1
            className="cs-display mt-6 text-ink"
            style={{ fontSize: "clamp(2.4rem, 4.2vw, 3.5rem)", lineHeight: 0.98, letterSpacing: "-0.045em" }}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-4 text-[15px] leading-relaxed text-muted">{subtitle}</p>}

          <div className="mt-10">{children}</div>

          {footer && <div className="mt-10 border-t border-ink/10 pt-6 text-sm text-muted">{footer}</div>}
        </motion.div>
      </div>
    </div>
  )
}

/** Inline validation / server error. Announced as soon as it appears. */
export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 rounded-[10px] bg-red-500/[0.08] px-4 py-3 text-sm leading-snug text-red-700 ring-1 ring-inset ring-red-500/20 dark:text-red-300"
    >
      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {message}
    </motion.p>
  )
}

/** Success / informational message, same shape as {@link AuthError}. */
export function AuthNotice({ message }: { message: string }) {
  if (!message) return null
  return (
    <motion.p
      role="status"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 rounded-[10px] bg-brand/[0.07] px-4 py-3 text-sm leading-snug text-brand ring-1 ring-inset ring-brand/20"
    >
      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {message}
    </motion.p>
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
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading || undefined}
      className="mt-2 flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-brand text-[15px] font-semibold tracking-[-0.01em] text-on-brand transition-[background-color,opacity] duration-200 hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70"
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
      )}
      {loading ? loadingLabel : label}
    </button>
  )
}
