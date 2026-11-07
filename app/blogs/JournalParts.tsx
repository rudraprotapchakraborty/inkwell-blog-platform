"use client"

import { useState } from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

/** Initials for a byline, e.g. "Inkwell" → "CS". */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "CS"
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase()
}

/**
 * A byline's mark: the account's profile picture when it has one, otherwise
 * its initials, ink on paper — the same mark the testimonials use. A picture
 * that fails to load falls back to the initials rather than a broken image.
 */
export function Monogram({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      // Plain img: Google's avatar host isn't whitelisted for next/image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover ring-1 ring-ink/10"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-ink font-semibold tracking-wide text-paper"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initialsOf(name)}
    </span>
  )
}

/** A seamless thin swell for the typographic covers. */
const SWELL = (() => {
  let d = "M0,30"
  for (let x = 10; x <= 800; x += 10) d += ` L${x},${(30 + Math.sin((x / 800) * Math.PI * 6) * 8).toFixed(1)}`
  return d
})()

/**
 * The cover for a post that has no image: its title, set in the serif on the
 * deep-water surface, instead of a stock gradient.
 */
export function JournalCover({ title, brand }: { title: string; brand: string }) {
  return (
    <span className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-cs-deep p-5 text-ink sm:p-6">
      <span className="eyeline text-ink/55">{brand}</span>
      <span
        className="cs-accent relative z-[1] line-clamp-3 max-w-[92%] text-ink"
        style={{ fontSize: "clamp(1.5rem, 2.3vw, 2.1rem)", lineHeight: 1.02, textWrap: "balance" }}
      >
        {title}
      </span>
      <svg
        aria-hidden
        viewBox="0 0 800 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-[20%] h-10 w-full"
      >
        <path d={SWELL} fill="none" stroke="rgb(var(--cs-cyan) / 0.35)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  )
}

/** Placeholder entries shaped like the real ones, so the page doesn't jump when posts land. */
export function FeedSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      {[0, 1, 2].map(i => (
        <div key={i} className="grid gap-6 border-t border-ink/10 py-10 md:grid-cols-[1fr_0.85fr] md:gap-8">
          <div>
            <div className="h-2.5 w-40 rounded-full bg-ink/[0.07]" />
            <div className="mt-6 h-7 w-11/12 rounded-md bg-ink/[0.08]" />
            <div className="mt-3 h-7 w-2/3 rounded-md bg-ink/[0.08]" />
            <div className="mt-6 h-3 w-full rounded-full bg-ink/[0.06]" />
            <div className="mt-2.5 h-3 w-4/5 rounded-full bg-ink/[0.06]" />
          </div>
          <div className="aspect-[16/10] rounded-lg bg-ink/[0.06]" />
        </div>
      ))}
    </div>
  )
}

/**
 * An admin's Edit / Delete icons, pinned over the top-right of a card's
 * picture. Solid chips so they read on any cover; the label is in the tooltip.
 */
export function PostActions({
  editHref,
  onDelete,
  deleting,
  labels,
  className = "",
}: {
  editHref: string
  onDelete: () => void
  deleting: boolean
  labels: { edit: string; delete: string }
  className?: string
}) {
  const chip =
    "grid h-8 w-8 place-items-center rounded-full bg-surface/90 shadow-[0_4px_14px_-6px_rgb(0_0_0/0.45)] ring-1 ring-ink/10 backdrop-blur transition-colors"
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Link
        href={editHref}
        title={labels.edit}
        aria-label={labels.edit}
        className={`${chip} hover:bg-surface`}
        style={{ color: "rgb(var(--accent-1))" }}
      >
        <Pencil aria-hidden size={14} />
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        aria-busy={deleting || undefined}
        title={labels.delete}
        aria-label={labels.delete}
        className={`${chip} hover:bg-surface disabled:opacity-50`}
        style={{ color: "rgb(239 68 68)" }}
      >
        <Trash2 aria-hidden size={14} />
      </button>
    </div>
  )
}
