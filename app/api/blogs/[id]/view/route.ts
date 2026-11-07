import { NextRequest, NextResponse } from "next/server"
import { getBlogViews, recordBlogView, toBlogObjectId } from "@/lib/blog-engagement"

/**
 * Whether the request came in on a local development host. The dev server
 * talks to the live database, so without this every page refresh while
 * working on the site would count as a reader's view.
 */
function isLocalRequest(request: NextRequest): boolean {
  const host = (request.headers.get("host") ?? "").toLowerCase()
  const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0]
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  )
}

/** Counts one open of a blog post. Called by the post page on mount. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!toBlogObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    if (isLocalRequest(request)) return NextResponse.json(await getBlogViews(id))
    return NextResponse.json(await recordBlogView(id))
  } catch {
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 })
  }
}
