import { NextRequest, NextResponse } from "next/server"
import { isValidVisitorId, toBlogObjectId, toggleBlogLike } from "@/lib/blog-engagement"

/** Toggles the calling visitor's like. No account needed — likes are keyed by visitor id. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!toBlogObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const { visitorId } = await request.json().catch(() => ({}))
    if (!isValidVisitorId(visitorId)) {
      return NextResponse.json({ error: "Invalid visitor id" }, { status: 400 })
    }

    return NextResponse.json(await toggleBlogLike(id, visitorId))
  } catch {
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 })
  }
}
