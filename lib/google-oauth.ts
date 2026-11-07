import type { NextRequest } from 'next/server'

/**
 * Minimal Google OAuth 2.0 (authorization code) client.
 *
 * Hand-rolled rather than pulled from a library so it slots into the JWT cookie
 * session this app already uses. Google charges nothing for sign-in; the only
 * setup is an OAuth client in Google Cloud Console.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo'

export const OAUTH_STATE_COOKIE = 'ink-oauth-state'

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

/**
 * The callback URL registered in Google Cloud Console. Derived from the request
 * so localhost and production both work; override with NEXT_PUBLIC_SITE_URL when
 * the app sits behind a proxy that rewrites the host.
 */
export function redirectUri(request: NextRequest): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || request.nextUrl.origin
  return `${base}/api/auth/google/callback`
}

export function buildConsentUrl(request: NextRequest, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: redirectUri(request),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export interface GoogleProfile {
  googleId: string
  email: string
  emailVerified: boolean
  name?: string
  picture?: string
}

export async function exchangeCodeForProfile(request: NextRequest, code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: redirectUri(request),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${await tokenRes.text().catch(() => '')}`)
  }

  const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string }
  if (!accessToken) throw new Error('Google token response contained no access token')

  const userRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!userRes.ok) {
    throw new Error(`Google userinfo request failed (${userRes.status})`)
  }

  const profile = (await userRes.json()) as {
    sub: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }

  if (!profile.email) throw new Error('Google account returned no email address')

  return {
    googleId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified !== false,
    name: profile.name,
    picture: profile.picture,
  }
}
