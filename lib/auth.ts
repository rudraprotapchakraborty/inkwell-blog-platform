import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-prod'
export const COOKIE_NAME = 'ink-auth-token'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export type Role = 'admin' | 'user'

export interface AuthPayload {
  /** The account's Mongo `_id`. */
  sub: string
  role: Role
  email?: string
  name?: string
  /** Google profile picture, carried in the token so the navbar avatar needs no extra request. */
  avatar?: string
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Verifies a session token.
 *
 * Every token this app signs carries a subject and a role, so one that does not
 * is not a token of ours and is refused rather than assigned a role by guesswork.
 * Being treated as signed out is the safe failure: the visitor signs in again.
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const raw = jwt.verify(token, JWT_SECRET) as Partial<AuthPayload>

    if (!raw.sub) return null
    if (raw.role !== 'admin' && raw.role !== 'user') return null

    return {
      sub: raw.sub,
      role: raw.role,
      email: raw.email,
      name: raw.name,
      avatar: raw.avatar,
    }
  } catch {
    return null
  }
}

/** Reads the session cookie off a request. Returns null when signed out or invalid. */
export function getAuth(request: NextRequest): AuthPayload | null {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function isAdmin(payload: AuthPayload | null): boolean {
  return payload?.role === 'admin'
}

/**
 * Guard for admin-only API routes. Returns a response to send back when the
 * caller is not an admin, or `null` when the request may proceed.
 *
 * Signed-in non-admins get 403 rather than 401 so the client can tell "log in"
 * apart from "your account cannot do this".
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isAdmin(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

/**
 * Guard for routes any signed-in account may use, such as creating a post.
 * Returns the caller when allowed, or a 401 response to send back.
 */
export function requireUser(request: NextRequest): { auth: AuthPayload } | { denied: NextResponse } {
  const auth = getAuth(request)
  if (!auth) return { denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { auth }
}

/**
 * Who may edit or delete a post: any admin, whoever wrote it. Only admins can
 * post at all, so ownership decides whose name a post carries, not who may
 * change it.
 */
export function canManageBlog(
  auth: AuthPayload | null,
  blog: Record<string, unknown> | null
): boolean {
  return !!blog && isAdmin(auth)
}

/** Attaches the session cookie to a response. */
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}

/**
 * A post-sign-in destination taken from the query string, kept on this site:
 * only a path ("/account"), never "//elsewhere" or a full URL — otherwise a
 * crafted link could bounce someone to another domain.
 */
export function safeRedirectPath(from: string | undefined | null, fallback = '/account'): string {
  // "/\" is treated like "//" by browsers, so it is refused too.
  if (!from || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) return fallback
  return from
}
