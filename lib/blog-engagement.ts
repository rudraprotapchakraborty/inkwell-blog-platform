import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import {
  MAX_BATCH_IDS,
  isValidVisitorId,
  type BlogComment,
  type CommentViewer,
  type BlogEngagement,
  type ShareNetwork,
} from "@/lib/blog-engagement-shared"

export * from "@/lib/blog-engagement-shared"

export const LIKES_COLLECTION = "blog_likes"
export const COMMENTS_COLLECTION = "blog_comments"
export const SHARES_COLLECTION = "blog_shares"
/** Views are a single counter doc per post — one row per view would not scale. */
export const VIEWS_COLLECTION = "blog_views"

export function toBlogObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) ? new ObjectId(id) : null
}

let indexesReady: Promise<void> | null = null

/**
 * Ensures the indexes engagement queries rely on. The unique like index is what
 * actually enforces one like per visitor, so a duplicate insert races safely.
 */
export function ensureEngagementIndexes(): Promise<void> {
  if (!indexesReady) {
    indexesReady = (async () => {
      const db = await getDb()
      await Promise.all([
        db.collection(LIKES_COLLECTION).createIndex({ blogId: 1, visitorId: 1 }, { unique: true }),
        db.collection(COMMENTS_COLLECTION).createIndex({ blogId: 1, createdAt: -1 }),
        db.collection(SHARES_COLLECTION).createIndex({ blogId: 1 }),
        db.collection(VIEWS_COLLECTION).createIndex({ blogId: 1 }, { unique: true }),
      ])
    })().catch(err => {
      // Let a later request retry rather than caching the failure forever.
      indexesReady = null
      throw err
    })
  }
  return indexesReady
}

/** Counts likes and comments for many posts at once, plus the caller's like state. */
export async function getEngagementForBlogs(
  blogIds: string[],
  visitorId?: string
): Promise<Record<string, BlogEngagement>> {
  const ids = Array.from(new Set(blogIds.filter(id => ObjectId.isValid(id)))).slice(0, MAX_BATCH_IDS)
  const result: Record<string, BlogEngagement> = {}
  if (ids.length === 0) return result

  for (const id of ids) result[id] = { likes: 0, comments: 0, shares: 0, views: 0, liked: false }

  const db = await getDb()
  const groupByBlog = [
    { $match: { blogId: { $in: ids } } },
    { $group: { _id: "$blogId", count: { $sum: 1 } } },
  ]

  const [likeCounts, commentCounts, shareCounts, viewCounts, myLikes] = await Promise.all([
    db.collection(LIKES_COLLECTION).aggregate<{ _id: string; count: number }>(groupByBlog).toArray(),
    db.collection(COMMENTS_COLLECTION).aggregate<{ _id: string; count: number }>(groupByBlog).toArray(),
    db.collection(SHARES_COLLECTION).aggregate<{ _id: string; count: number }>(groupByBlog).toArray(),
    db.collection(VIEWS_COLLECTION).find({ blogId: { $in: ids } }).toArray(),
    isValidVisitorId(visitorId)
      ? db.collection(LIKES_COLLECTION).find({ blogId: { $in: ids }, visitorId }).project({ blogId: 1 }).toArray()
      : Promise.resolve([]),
  ])

  for (const { _id, count } of likeCounts) if (result[_id]) result[_id].likes = count
  for (const { _id, count } of commentCounts) if (result[_id]) result[_id].comments = count
  for (const { _id, count } of shareCounts) if (result[_id]) result[_id].shares = count
  for (const doc of viewCounts) {
    const blogId = String((doc as { blogId?: unknown }).blogId ?? "")
    if (result[blogId]) result[blogId].views = Number((doc as { count?: unknown }).count ?? 0)
  }
  for (const doc of myLikes) {
    const blogId = String((doc as { blogId?: unknown }).blogId ?? "")
    if (result[blogId]) result[blogId].liked = true
  }

  return result
}

/** Adds or removes this visitor's like and returns the resulting state. */
export async function toggleBlogLike(
  blogId: string,
  visitorId: string
): Promise<{ likes: number; liked: boolean }> {
  await ensureEngagementIndexes()
  const db = await getDb()
  const likes = db.collection(LIKES_COLLECTION)

  const removed = await likes.deleteOne({ blogId, visitorId })
  if (removed.deletedCount === 0) {
    try {
      await likes.insertOne({ blogId, visitorId, createdAt: new Date() })
    } catch (err: unknown) {
      // 11000 = another tab liked the same post first; the like already exists.
      if ((err as { code?: number }).code !== 11000) throw err
    }
  }

  const count = await likes.countDocuments({ blogId })
  return { likes: count, liked: removed.deletedCount === 0 }
}

/**
 * Records one share and returns the new total. Unlike likes these are not
 * de-duplicated — sharing a post twice is two real shares, which is also how
 * the count reads on social platforms.
 */
export async function recordBlogShare(
  blogId: string,
  network: ShareNetwork
): Promise<{ shares: number }> {
  await ensureEngagementIndexes()
  const db = await getDb()
  const shares = db.collection(SHARES_COLLECTION)

  await shares.insertOne({ blogId, network, createdAt: new Date() })
  return { shares: await shares.countDocuments({ blogId }) }
}

/** The post's view count, without adding to it. */
export async function getBlogViews(blogId: string): Promise<{ views: number }> {
  const db = await getDb()
  const doc = await db.collection(VIEWS_COLLECTION).findOne({ blogId })
  return { views: Number(doc?.count ?? 0) }
}

/** Increments the post's view counter and returns the new total. */
export async function recordBlogView(blogId: string): Promise<{ views: number }> {
  await ensureEngagementIndexes()
  const db = await getDb()

  const doc = await db.collection(VIEWS_COLLECTION).findOneAndUpdate(
    { blogId },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" }
  )

  return { views: Number(doc?.count ?? 1) }
}

export function serializeComment(
  doc: Record<string, unknown>,
  viewer?: CommentViewer | null
): BlogComment {
  const userId = String(doc.userId ?? "")
  return {
    _id: String(doc._id),
    name: String(doc.name ?? ""),
    avatar: String(doc.avatar ?? ""),
    text: String(doc.text ?? ""),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string | Date).toISOString()
      : new Date().toISOString(),
    editedAt: doc.editedAt ? new Date(doc.editedAt as string | Date).toISOString() : "",
    canDelete: Boolean(viewer && (viewer.isAdmin || (userId !== "" && userId === viewer.userId))),
    canEdit: Boolean(viewer && userId !== "" && userId === viewer.userId),
  }
}

export type CommentDeleteResult = "deleted" | "forbidden" | "not_found"

/**
 * Removes a comment on behalf of the given viewer.
 *
 * Ownership lives in the delete filter rather than in a preceding check, so
 * another account's comment simply does not match — there is no window between
 * deciding and writing. The follow-up existence check exists only to tell
 * "not yours" apart from "already gone" for the status code.
 */
export async function deleteBlogComment(
  commentId: string,
  viewer: CommentViewer
): Promise<CommentDeleteResult> {
  const oid = toBlogObjectId(commentId)
  if (!oid) return "not_found"

  const db = await getDb()
  const comments = db.collection(COMMENTS_COLLECTION)

  const filter = viewer.isAdmin ? { _id: oid } : { _id: oid, userId: viewer.userId }
  const result = await comments.deleteOne(filter)
  if (result.deletedCount === 1) return "deleted"

  const stillThere = await comments.countDocuments({ _id: oid }, { limit: 1 })
  return stillThere > 0 ? "forbidden" : "not_found"
}

export type CommentUpdateResult =
  | { status: "updated"; comment: BlogComment }
  | { status: "forbidden" }
  | { status: "not_found" }

/**
 * Rewrites a comment's text on behalf of its author.
 *
 * Unlike deletion there is no admin branch: ownership is the whole condition,
 * so the update filter carries it and nobody can edit words they did not write.
 */
export async function updateBlogComment(
  commentId: string,
  viewer: CommentViewer,
  text: string
): Promise<CommentUpdateResult> {
  const oid = toBlogObjectId(commentId)
  if (!oid) return { status: "not_found" }

  const db = await getDb()
  const comments = db.collection(COMMENTS_COLLECTION)

  const updated = await comments.findOneAndUpdate(
    { _id: oid, userId: viewer.userId },
    { $set: { text, editedAt: new Date() } },
    { returnDocument: "after" }
  )

  if (updated) {
    return { status: "updated", comment: serializeComment(updated as Record<string, unknown>, viewer) }
  }

  const stillThere = await comments.countDocuments({ _id: oid }, { limit: 1 })
  return { status: stillThere > 0 ? "forbidden" : "not_found" }
}
