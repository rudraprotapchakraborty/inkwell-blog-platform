import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/mongodb"
import { getAuth, isAdmin, requireUser, type AuthPayload } from "@/lib/auth"
import {
  COMMENTS_COLLECTION,
  MAX_COMMENT_LENGTH,
  MAX_NAME_LENGTH,
  ensureEngagementIndexes,
  serializeComment,
  toBlogObjectId,
  type CommentViewer,
} from "@/lib/blog-engagement"

const MAX_COMMENTS_RETURNED = 100

/** The caller, for resolving who may delete what. Null when signed out. */
function viewerFrom(request: NextRequest): CommentViewer | null {
  const auth = getAuth(request)
  return auth ? { userId: auth.sub, isAdmin: isAdmin(auth) } : null
}

/**
 * The name a comment is published under.
 *
 * `toAuthPayload` falls back to the email address when an account has no name,
 * and a comment thread is public — so an email is reduced to its local part
 * rather than printed in full next to someone's opinion.
 */
function displayName(auth: AuthPayload): string {
  const candidate = (auth.name || auth.email || "").trim()
  if (!candidate) return "Reader"
  const at = candidate.indexOf("@")
  return (at > 0 ? candidate.slice(0, at) : candidate).slice(0, MAX_NAME_LENGTH)
}

/** Newest-first comments for one post. Public to read; posting needs an account. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!toBlogObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const db = await getDb()
    const docs = await db
      .collection(COMMENTS_COLLECTION)
      .find({ blogId: id })
      .sort({ createdAt: -1 })
      .limit(MAX_COMMENTS_RETURNED)
      .toArray()

    const viewer = viewerFrom(request)
    return NextResponse.json(docs.map(d => serializeComment(d as Record<string, unknown>, viewer)))
  } catch {
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = requireUser(request)
  if ("denied" in guard) return guard.denied
  const { auth } = guard

  try {
    const { id } = await params
    const oid = toBlogObjectId(id)
    if (!oid) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const text = String(body.text ?? "").trim().slice(0, MAX_COMMENT_LENGTH)
    if (!text) return NextResponse.json({ error: "Comment is required" }, { status: 400 })

    const db = await getDb()
    // Reject comments on posts that do not exist or are not public yet, in
    // either blog: engagement is keyed by post id, which no two blogs share.
    const published = { _id: oid, published: true }
    const exists = await Promise.all(
      ["blogs"].map(name =>
        db.collection(name).countDocuments(published, { limit: 1 })
      )
    )
    if (!exists.some(Boolean)) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await ensureEngagementIndexes()
    // Name and avatar are denormalised so rendering a thread never joins users.
    const doc = {
      blogId: id,
      userId: auth.sub,
      name: displayName(auth),
      avatar: auth.avatar ?? "",
      text,
      createdAt: new Date(),
    }
    const result = await db.collection(COMMENTS_COLLECTION).insertOne(doc)

    return NextResponse.json(
      serializeComment({ ...doc, _id: result.insertedId }, { userId: auth.sub, isAdmin: isAdmin(auth) }),
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 })
  }
}
