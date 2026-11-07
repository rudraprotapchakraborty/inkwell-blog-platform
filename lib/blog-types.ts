export interface BlogSeoLink {
  label: string
  url: string
}

export interface BlogSeoFields {
  metaDescription: string
  inboundLinks: BlogSeoLink[]
  outboundLinks: BlogSeoLink[]
}

export const DEFAULT_BLOG_SEO: BlogSeoFields = {
  metaDescription: "",
  inboundLinks: [],
  outboundLinks: [],
}

export function normalizeBlogSeoLink(raw: unknown): BlogSeoLink | null {
  if (!raw || typeof raw !== "object") return null
  const { label, url } = raw as { label?: unknown; url?: unknown }
  const cleanLabel = typeof label === "string" ? label.trim() : ""
  const cleanUrl = typeof url === "string" ? url.trim() : ""
  if (!cleanLabel || !cleanUrl) return null
  return { label: cleanLabel, url: cleanUrl }
}

export function normalizeBlogSeoLinks(raw: unknown): BlogSeoLink[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeBlogSeoLink).filter((link): link is BlogSeoLink => link !== null)
}

export function pickBlogSeoFields(data: Partial<BlogSeoFields>): BlogSeoFields {
  return {
    metaDescription: typeof data.metaDescription === "string" ? data.metaDescription : "",
    inboundLinks: normalizeBlogSeoLinks(data.inboundLinks),
    outboundLinks: normalizeBlogSeoLinks(data.outboundLinks),
  }
}

export interface BlogLinkFieldError {
  list: "inbound" | "outbound"
  index: number
  field: "label" | "url"
  message: string
}

function isLinkRowStarted(link: BlogSeoLink) {
  return Boolean(link.label.trim() || link.url.trim())
}

export function getBlogLinkFieldErrors(
  inboundLinks: BlogSeoLink[],
  outboundLinks: BlogSeoLink[]
): BlogLinkFieldError[] {
  const errors: BlogLinkFieldError[] = []

  const check = (links: BlogSeoLink[], list: "inbound" | "outbound") => {
    links.forEach((link, index) => {
      if (!isLinkRowStarted(link)) return
      const hasLabel = Boolean(link.label.trim())
      const hasUrl = Boolean(link.url.trim())
      if (!hasLabel) {
        errors.push({
          list,
          index,
          field: "label",
          message: "Label is required.",
        })
      }
      if (!hasUrl) {
        errors.push({
          list,
          index,
          field: "url",
          message: "URL is required.",
        })
      }
    })
  }

  check(inboundLinks, "inbound")
  check(outboundLinks, "outbound")
  return errors
}

export function getBlogLinkValidationMessage(
  inboundLinks: BlogSeoLink[],
  outboundLinks: BlogSeoLink[]
): string | null {
  return getBlogLinkFieldErrors(inboundLinks, outboundLinks)[0]?.message ?? null
}

export function sanitizeBlogSeoLinks(links: BlogSeoLink[]): BlogSeoLink[] {
  return links
    .filter(isLinkRowStarted)
    .map(link => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter(link => link.label && link.url)
}

/** Upper bound on the takeaway card so it stays a summary, not a second article. */
export const MAX_KEY_TAKEAWAYS = 6

/**
 * Key takeaways are the short bullet summary shown in a highlight card just
 * under the post header. Accepts raw API/DB values and drops blank rows, so it
 * doubles as the save-time sanitizer for the editor's in-progress list.
 */
export function normalizeKeyTakeaways(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, MAX_KEY_TAKEAWAYS)
}
