import { NextRequest, NextResponse } from "next/server"
import { isAdmin, requireUser } from "@/lib/auth"
import { MAX_COMMENT_LENGTH, deleteBlogComment, updateBlogComment } from "@/lib/blog-engagement"

/**
 * Deletes one comment. The author may remove their own; an admin may remove
 * anyone's. The rule is enforced in the database filter, not here — see
 * `deleteBlogComment`.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const guard = requireUser(request)
  if ("denied" in guard) return guard.denied
  const { auth } = guard

  try {
    const { commentId } = await params
    const outcome = await deleteBlogComment(commentId, {
      userId: auth.sub,
      isAdmin: isAdmin(auth),
    })

    if (outcome === "forbidden") {
      return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 })
    }
    if (outcome === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 })
  }
}

/**
 * Rewrites one comment. Authors only — an admin may remove a comment but not
 * put different words in someone else's mouth.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const guard = requireUser(request)
  if ("denied" in guard) return guard.denied
  const { auth } = guard

  try {
    const { commentId } = await params

    const body = await request.json().catch(() => ({}))
    const text = String(body.text ?? "").trim().slice(0, MAX_COMMENT_LENGTH)
    if (!text) return NextResponse.json({ error: "Comment is required" }, { status: 400 })

    const outcome = await updateBlogComment(
      commentId,
      { userId: auth.sub, isAdmin: isAdmin(auth) },
      text
    )

    if (outcome.status === "forbidden") {
      return NextResponse.json({ error: "You can only edit your own comments." }, { status: 403 })
    }
    if (outcome.status === "not_found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(outcome.comment)
  } catch {
    return NextResponse.json({ error: "Failed to edit comment" }, { status: 500 })
  }
}
