import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ImgbbError, uploadToImgbb } from '@/lib/imgbb'

/**
 * Uploads an image to ImgBB and returns the hosted URL.
 *
 * The client sends a base64 data URL; the hosted URL that comes back is what
 * gets stored in the database, just like a normal URL. The API key stays on the
 * server — see `lib/imgbb.ts`.
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request)
  if (denied) return denied

  try {
    const { image, name } = await request.json()
    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const { url, displayUrl } = await uploadToImgbb(image, typeof name === 'string' ? name : undefined)
    return NextResponse.json({ url, displayUrl })
  } catch (err) {
    if (err instanceof ImgbbError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }
}
