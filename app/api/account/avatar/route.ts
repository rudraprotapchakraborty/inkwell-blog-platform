import { NextRequest, NextResponse } from 'next/server'
import { getAuth, setSessionCookie, signToken } from '@/lib/auth'
import { ImgbbError, isUploadableImage, uploadToImgbb } from '@/lib/imgbb'
import { findUserByAuth, toAuthPayload, updateAvatar } from '@/lib/users'

export const runtime = 'nodejs'

/**
 * The signed-in account's profile photo. The browser shrinks the picture
 * before sending it as a data URL; it is hosted on ImgBB like other uploads.
 * The photo also lives in the session token (the navbar shows it), so both
 * routes re-issue the cookie.
 */
export async function POST(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { image } = await request.json().catch(() => ({}))
    if (!isUploadableImage(image)) {
      return NextResponse.json({ error: 'Choose a PNG, JPG, WebP or GIF image.' }, { status: 400 })
    }

    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    const { displayUrl } = await uploadToImgbb(image, `${user.name || 'account'} photo`)
    await updateAvatar(user._id, displayUrl)

    const payload = toAuthPayload({ ...user, avatar: displayUrl })
    return setSessionCookie(NextResponse.json({ success: true, user: payload }), signToken(payload))
  } catch (err) {
    if (err instanceof ImgbbError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Uploading the profile photo failed:', err)
    return NextResponse.json({ error: 'Could not upload your photo. Please try again.' }, { status: 500 })
  }
}

/** Removes the photo; the initials show instead. */
export async function DELETE(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    await updateAvatar(user._id, null)

    const payload = toAuthPayload({ ...user, avatar: undefined })
    return setSessionCookie(NextResponse.json({ success: true, user: payload }), signToken(payload))
  } catch (err) {
    console.error('Removing the profile photo failed:', err)
    return NextResponse.json({ error: 'Could not remove your photo. Please try again.' }, { status: 500 })
  }
}
