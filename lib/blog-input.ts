import {
  normalizeKeyTakeaways,
  pickBlogSeoFields,
  sanitizeBlogSeoLinks,
  type BlogSeoFields,
} from "@/lib/blog-types"

export function slugifyBlogTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/** Every field a writer is allowed to set through the API. */
export interface BlogInput {
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  category: string
  tags: string[]
  authors: string[]
  author: string
  readTime: string
  keyTakeaways: string[]
  published: boolean
  metaDescription: string
  inboundLinks: BlogSeoFields["inboundLinks"]
  outboundLinks: BlogSeoFields["outboundLinks"]
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map(v => String(v).trim()).filter(Boolean))]
}

/**
 * Builds the document body from a request payload.
 *
 * This is an allow-list on purpose: now that any signed-in account can post,
 * spreading the raw JSON would let a caller set `authorId` to somebody else,
 * forge `createdAt`, or overwrite `_id`. Ownership and timestamps are stamped
 * by the route from the session, never from the body.
 */
export function sanitizeBlogInput(raw: unknown): BlogInput {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const seo = pickBlogSeoFields(data as Partial<BlogSeoFields>)

  const title = str(data.title)
  const authors = strList(data.authors)
  const legacyAuthor = str(data.author)
  const authorList = authors.length
    ? authors
    : legacyAuthor
      ? legacyAuthor.split(",").map(a => a.trim()).filter(Boolean)
      : ["Inkwell"]

  return {
    title,
    slug: str(data.slug) || slugifyBlogTitle(title),
    excerpt: str(data.excerpt),
    content: typeof data.content === "string" ? data.content : "",
    coverImage: str(data.coverImage),
    category: str(data.category) || "General",
    tags: strList(data.tags),
    authors: authorList,
    author: authorList.join(", "),
    readTime: str(data.readTime) || "5 min read",
    keyTakeaways: normalizeKeyTakeaways(data.keyTakeaways),
    published: data.published !== false,
    metaDescription: seo.metaDescription,
    inboundLinks: sanitizeBlogSeoLinks(seo.inboundLinks),
    outboundLinks: sanitizeBlogSeoLinks(seo.outboundLinks),
  }
}

/** Shared 400 message so the routes agree on what a usable post needs. */
export function validateBlogInput(input: BlogInput): string | null {
  if (!input.title) return "Title is required"
  if (!input.slug) return "Slug is required"
  if (!input.content.trim()) return "Content is required"
  return null
}
