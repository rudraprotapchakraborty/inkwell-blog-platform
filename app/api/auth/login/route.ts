import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { setSessionCookie, signToken } from '@/lib/auth'
import { findUserByIdentifier, toAuthPayload, touchLastLogin } from '@/lib/users'

/** Password sign-in. Accounts are identified by email. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const identifier: string = body.identifier || body.email || ''
    const password: string = body.password || ''

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await findUserByIdentifier(identifier)

    // Accounts created through Google have no password to compare against.
    if (user && !user.password) {
      return NextResponse.json(
        { error: 'This account signs in with Google. Use the “Continue with Google” button.' },
        { status: 400 },
      )
    }

    if (!user || !(await bcrypt.compare(password, user.password as string))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    await touchLastLogin(user._id)

    const payload = toAuthPayload(user)
    const response = NextResponse.json({ success: true, user: payload })
    return setSessionCookie(response, signToken(payload))
  } catch (err) {
    console.error('Login failed:', err)
    return NextResponse.json({ error: 'Could not sign in. Please try again.' }, { status: 500 })
  }
}
