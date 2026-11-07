import { ObjectId } from "mongodb"
import { getDb } from "@/lib/mongodb"
import { adminAvatarsByName, writersOf } from "@/lib/blog-writers"

/**
 * A blog's published feed, newest first. Each post's byline is its writers as
 * the editor lists them (starting with the admin who posted it), pictured by
 * the first writer's account picture, or the owner's when that writer has none. Shared by GET /api/blogs and the
 * server-rendered /blogs and /real-estate/blogs pages, so each arrives with
 * its posts already in the HTML.
 *
 * Returned as plain JSON values (ids and dates as strings), the same shape the
 * API has always sent, so it can be handed straight to a client component.
 */
export async function listPublishedBlogs(collection: "blogs" = "blogs") {
  const db = await getDb()
  const blogs = await db.collection(collection).find({ published: true }).sort({ createdAt: -1 }).toArray()

  // One query for the whole feed's owners, projected to the avatar alone so no
  // other account field is exposed.
  const ownerIds = Array.from(
    new Set(blogs.map((b) => b.authorId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))
  )
  const owners = ownerIds.length
    ? await db
        .collection("users")
        .find({ _id: { $in: ownerIds.map((id) => new ObjectId(id)) } }, { projection: { avatar: 1 } })
        .toArray()
    : []
  const ownerAvatars = new Map(owners.filter((o) => o.avatar).map((o) => [o._id.toString(), String(o.avatar)]))
  const writerAvatars = await adminAvatarsByName(db)

  const feed = blogs.map((b) => {
    const first = writersOf(b)[0]
    const avatar =
      (first && writerAvatars.get(first)) || (typeof b.authorId === "string" && ownerAvatars.get(b.authorId)) || undefined
    return { ...b, authorAvatar: avatar }
  })
  // Through JSON, exactly as the API response does: ObjectId and Date become strings.
  return JSON.parse(JSON.stringify(feed)) as Record<string, unknown>[]
}
