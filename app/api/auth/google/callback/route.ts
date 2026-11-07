import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { setSessionCookie, signToken } from '@/lib/auth'
import { OAUTH_STATE_COOKIE, exchangeCodeForProfile, isGoogleConfigured } from '@/lib/google-oauth'
import { toAuthPayload, upsertGoogleUser } from '@/lib/users'

function equals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

function failure(request: NextRequest, reason: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${reason}`, request.nextUrl.origin))
  response.cookies.delete(OAUTH_STATE_COOKIE)
  return response
}

/** Completes the Google flow: verify state, swap the code for a profile, sign in. */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) return failure(request, 'google_unavailable')

  const params = request.nextUrl.searchParams
  if (params.get('error')) return failure(request, 'google_denied')

  const code = params.get('code')
  const state = params.get('state')
  const expected = request.cookies.get(OAUTH_STATE_COOKIE)?.value

  if (!code || !state || !expected || !equals(state, expected)) {
    return failure(request, 'google_state')
  }

  try {
    const profile = await exchangeCodeForProfile(request, code)
    if (!profile.emailVerified) return failure(request, 'google_unverified')

    const user = await upsertGoogleUser({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    })

    // The destination was packed into the state when the flow started.
    const encoded = state.split(':')[1] ?? ''
    let destination = '/account'
    try {
      const decoded = Buffer.from(encoded, 'base64url').toString()
      if (decoded.startsWith('/') && !decoded.startsWith('//')) destination = decoded
    } catch {
      /* keep the default */
    }

    const payload = toAuthPayload(user)
    const response = NextResponse.redirect(new URL(destination, request.nextUrl.origin))
    response.cookies.delete(OAUTH_STATE_COOKIE)
    return setSessionCookie(response, signToken(payload))
  } catch (err) {
    console.error('Google sign-in failed:', err)
    return failure(request, 'google_failed')
  }
}
