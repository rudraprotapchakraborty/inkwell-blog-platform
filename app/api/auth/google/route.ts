import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { OAUTH_STATE_COOKIE, buildConsentUrl, isGoogleConfigured } from '@/lib/google-oauth'

/** Starts the Google sign-in flow by redirecting to Google's consent screen. */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL('/login?error=google_unavailable', request.nextUrl.origin))
  }

  // Where to land after a successful sign-in. Only same-site paths, so an
  // attacker cannot use the callback as an open redirect.
  const requested = request.nextUrl.searchParams.get('from') || '/account'
  const from = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/account'

  // The state is echoed back by Google and compared against the cookie, which
  // is what stops a cross-site request from completing someone else's sign-in.
  const state = `${randomBytes(16).toString('hex')}:${Buffer.from(from).toString('base64url')}`

  const response = NextResponse.redirect(buildConsentUrl(request, state))
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })
  return response
}
