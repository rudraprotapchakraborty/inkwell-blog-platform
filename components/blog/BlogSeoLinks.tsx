import Link from "next/link"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import type { BlogSeoLink } from "@/lib/blog-types"

interface BlogSeoLinksProps {
  inboundLinks?: BlogSeoLink[]
  outboundLinks?: BlogSeoLink[]
  accentColor?: string
  inboundTitle?: string
  outboundTitle?: string
}

function validLinks(links?: BlogSeoLink[]) {
  return (links ?? []).filter(link => link.label.trim() && link.url.trim())
}

// `creativesurf.com` predates the move to `.agency` and is kept so links already
// written into published posts still resolve as internal.
const SAME_SITE_HOSTS = new Set(["inkwell.blog", "creativesurf.com", "localhost"])

function sameSitePath(url: string): string | null {
  const trimmed = url.trim()
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed
  try {
    const parsed = new URL(trimmed)
    const host = parsed.hostname.replace(/^www\./, "")
    if (SAME_SITE_HOSTS.has(host)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    return null
  }
  return null
}

function LinkLabel({ label, url }: { label: string; url: string }) {
  return (
    <span className="break-words">
      {label}{" "}
      <span style={{ color: "rgb(var(--flow-text-soft))", fontWeight: 400 }}>
        ({url})
      </span>
    </span>
  )
}

function SeoLinkRow({
  link,
  accentColor,
  external,
}: {
  link: BlogSeoLink
  accentColor: string
  external: boolean
}) {
  const href = link.url.trim()
  const clientPath = !external ? sameSitePath(href) : null
  const className =
    "inline-flex items-start gap-2 text-sm font-medium leading-relaxed transition-opacity hover:opacity-75 underline-offset-2 hover:underline"

  const content = (
    <>
      {external ? <ArrowUpRight size={14} className="shrink-0 mt-0.5" /> : <ArrowDownLeft size={14} className="shrink-0 mt-0.5" />}
      <LinkLabel label={link.label} url={href} />
    </>
  )

  if (!external && clientPath) {
    return (
      <Link href={clientPath} className={className} style={{ color: accentColor }}>
        {content}
      </Link>
    )
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
      style={{ color: accentColor }}
    >
      {content}
    </a>
  )
}

export default function BlogSeoLinks({
  inboundLinks,
  outboundLinks,
  accentColor = "rgb(var(--accent-1))",
  inboundTitle = "Related on Inkwell",
  outboundTitle = "External Resources",
}: BlogSeoLinksProps) {
  const inbound = validLinks(inboundLinks)
  const outbound = validLinks(outboundLinks)

  if (!inbound.length && !outbound.length) return null

  return (
    <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 space-y-6" style={{ borderTop: "1px solid var(--flow-border)" }}>
      {inbound.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgb(var(--flow-text-soft))" }}>
            {inboundTitle}
          </h2>
          <ul className="space-y-2.5">
            {inbound.map((link, i) => (
              <li key={`in-${i}`}>
                <SeoLinkRow link={link} accentColor={accentColor} external={false} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {outbound.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgb(var(--flow-text-soft))" }}>
            {outboundTitle}
          </h2>
          <ul className="space-y-2.5">
            {outbound.map((link, i) => (
              <li key={`out-${i}`}>
                <SeoLinkRow link={link} accentColor={accentColor} external />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}