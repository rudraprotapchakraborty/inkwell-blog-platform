import { cache } from "react"
import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { normalizeKeyTakeaways, pickBlogSeoFields, type BlogSeoFields } from "@/lib/blog-types"
import { adminAvatarsByName } from "@/lib/blog-writers"

export interface BlogRecord {
  _id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  category: string
  tags: string[]
  /** Display line kept for cards, metadata and the post meta row (all writers joined). */
  author: string
  /** One entry per writer; falls back to `[author]` for posts saved before multi-writer support. */
  authors: string[]
  /** Pictures for writers who are admin accounts, by name — public post lookups only. */
  writerAvatars?: Record<string, string>
  readTime: string
  /** Short bullet summary rendered in the highlight card above the article body. */
  keyTakeaways: string[]
  published: boolean
  createdAt: string
  updatedAt?: string
  metaDescription: string
  inboundLinks: BlogSeoFields["inboundLinks"]
  outboundLinks: BlogSeoFields["outboundLinks"]
}

function serializeBlog(doc: Record<string, unknown>): BlogRecord {
  const seo = pickBlogSeoFields(doc as Partial<BlogSeoFields>)
  const author = String(doc.author ?? "Inkwell")
  const authors = Array.isArray(doc.authors)
    ? doc.authors.map(String).map(a => a.trim()).filter(Boolean)
    : []
  return {
    _id: String(doc._id),
    title: String(doc.title ?? ""),
    slug: String(doc.slug ?? ""),
    excerpt: String(doc.excerpt ?? ""),
    content: String(doc.content ?? ""),
    coverImage: String(doc.coverImage ?? ""),
    category: String(doc.category ?? "General"),
    tags: Array.isArray(doc.tags) ? doc.tags.map(String) : [],
    author,
    authors: authors.length ? authors : [author],
    readTime: String(doc.readTime ?? "5 min read"),
    keyTakeaways: normalizeKeyTakeaways(doc.keyTakeaways),
    published: Boolean(doc.published),
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as string | Date).toISOString() : undefined,
    metaDescription: seo.metaDescription,
    inboundLinks: seo.inboundLinks,
    outboundLinks: seo.outboundLinks,
  }
}

function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null
}

/** Gives each writer who is an admin account their profile picture. */
async function withWriterAvatars(db: Awaited<ReturnType<typeof getDb>>, blog: BlogRecord): Promise<BlogRecord> {
  const avatars = await adminAvatarsByName(db)
  const writerAvatars = Object.fromEntries(
    blog.authors.flatMap(name => (avatars.has(name) ? [[name, avatars.get(name)!]] : []))
  )
  return { ...blog, writerAvatars }
}

export const getBlogBySlug = cache(async (slug: string): Promise<BlogRecord | null> => {
  const db = await getDb()
  const doc = await db.collection("blogs").findOne({ slug, published: true })
  return doc ? withWriterAvatars(db, serializeBlog(doc as Record<string, unknown>)) : null
})

export async function getBlogByIdOrSlug(id: string): Promise<BlogRecord | null> {
  const db = await getDb()
  const oid = toObjectId(id)
  const doc = await db.collection("blogs").findOne(
    oid ? { $or: [{ slug: id }, { _id: oid }] } : { slug: id }
  )
  return doc ? serializeBlog(doc as Record<string, unknown>) : null
}

let blogIndexes: Promise<unknown> | null = null

/** Makes slugs unique at the database, which is what turns a duplicate into a 409 rather than two posts. */
export function ensureBlogIndexes() {
  if (!blogIndexes) {
    blogIndexes = getDb()
      .then(db => db.collection("blogs").createIndex({ slug: 1 }, { unique: true }))
      .catch(err => {
        blogIndexes = null
        throw err
      })
  }
  return blogIndexes
}
