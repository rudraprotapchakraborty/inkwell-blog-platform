import Link from "next/link"
import { ChevronRight } from "lucide-react"

export type Crumb = { label: string; href?: string }

/** A quiet trail back through the site. `structuredData` is accepted for call-site parity. */
export function Breadcrumbs({ items }: { items: Crumb[]; structuredData?: boolean; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="transition-colors hover:text-ink">Home</Link>
        </li>
        {items.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            <ChevronRight aria-hidden className="h-3 w-3 shrink-0 opacity-60" />
            {c.href ? (
              <Link href={c.href} className="transition-colors hover:text-ink">{c.label}</Link>
            ) : (
              <span aria-current="page" className="truncate text-ink">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
