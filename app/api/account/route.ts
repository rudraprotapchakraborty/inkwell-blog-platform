import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, getAuth, setSessionCookie, signToken } from '@/lib/auth'
import {
  countAdmins,
  deleteUser,
  findUserByAuth,
  normaliseEmail,
  toAuthPayload,
  updateName,
  validateName,
} from '@/lib/users'

/**
 * The signed-in account's own profile.
 *
 * The session token carries only what the navbar needs, so joining date and
 * sign-in providers have to come from the account record — the profile page
 * shows both, and until now they were reachable only through the admin
 * directory.
 */
export async function GET(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    // Explicit field list: the record holds a password hash.
    return NextResponse.json({
      profile: {
        createdAt: user.createdAt?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        providers: user.providers ?? ['password'],
        emailVerified: Boolean(user.emailVerified),
      },
    })
  } catch (err) {
    console.error('Loading the profile failed:', err)
    return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 })
  }
}

/** Updates the signed-in account's own display name. Any role may do this. */
export async function PATCH(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name } = await request.json()

    const invalid = validateName(name)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    await updateName(user._id, name)

    // The name lives in the token, so re-issue it — otherwise the navbar and
    // dashboard keep showing the old name until the cookie expires.
    const payload = toAuthPayload({ ...user, name: name.trim() })
    const response = NextResponse.json({ success: true, user: payload })
    return setSessionCookie(response, signToken(payload))
  } catch (err) {
    console.error('Updating the profile failed:', err)
    return NextResponse.json({ error: 'Could not save your changes. Please try again.' }, { status: 500 })
  }
}

/**
 * Deletes the signed-in account — the same cleanup the admin
 * directory performs. Posts it published stay up. It is confirmed by typing
 * the account's email address. The last administrator cannot delete
 * themselves, or the site would be left with nobody able to manage it.
 */
export async function DELETE(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { confirmEmail = '' } = await request.json().catch(() => ({}))

    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    // Typing the address is the confirmation, for every account: it can't be
    // done by a stray click, and it doesn't lock out anyone without a password.
    if (normaliseEmail(String(confirmEmail)) !== user.email) {
      return NextResponse.json({ error: 'Type your email address exactly to confirm.' }, { status: 403 })
    }

    if (user.role === 'admin' && (await countAdmins()) <= 1) {
      return NextResponse.json(
        { error: 'You are the only administrator. Make someone else an admin first.' },
        { status: 400 },
      )
    }

    const ok = await deleteUser(user._id)
    if (!ok) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    // Signed out on the spot: the session belonged to an account that no longer exists.
    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('Deleting the account failed:', err)
    return NextResponse.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 })
  }
}
