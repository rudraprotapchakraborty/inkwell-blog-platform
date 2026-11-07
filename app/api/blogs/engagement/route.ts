import { NextRequest, NextResponse } from "next/server"
import { getEngagementForBlogs } from "@/lib/blog-engagement"

/**
 * Batch like/comment counts for the blog grid, so the listing needs one request
 * instead of one per card. `visitorId` is optional and only fills in `liked`.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = (searchParams.get("ids") ?? "").split(",").map(s => s.trim()).filter(Boolean)
    const visitorId = searchParams.get("visitorId") ?? undefined

    return NextResponse.json(await getEngagementForBlogs(ids, visitorId))
  } catch {
    return NextResponse.json({ error: "Failed to load engagement" }, { status: 500 })
  }
}
