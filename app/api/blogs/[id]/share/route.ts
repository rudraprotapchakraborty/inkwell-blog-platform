import { NextRequest, NextResponse } from "next/server"
import { isShareNetwork, recordBlogShare, toBlogObjectId } from "@/lib/blog-engagement"

/** Records a share so the card can show a persisted share count. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!toBlogObjectId(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    const { network } = await request.json().catch(() => ({}))
    if (!isShareNetwork(network)) {
      return NextResponse.json({ error: "Invalid network" }, { status: 400 })
    }

    return NextResponse.json(await recordBlogShare(id, network))
  } catch {
    return NextResponse.json({ error: "Failed to record share" }, { status: 500 })
  }
}
