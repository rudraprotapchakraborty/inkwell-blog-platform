import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie, signToken } from '@/lib/auth'
import { createVerifiedUser, findUserByEmail, toAuthPayload, verifyOtp } from '@/lib/users'

const REASON_MESSAGE: Record<string, string> = {
  missing: 'That code has expired or was already used. Request a new one.',
  expired: 'That code has expired. Request a new one.',
  'too-many-attempts': 'Too many incorrect attempts. Request a new code.',
  mismatch: 'That code is not correct.',
}

/** Step 2 of registration: confirm the code, create the account, sign the user in. */
export async function POST(request: NextRequest) {
  try {
    const { email = '', code = '' } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })
    }

    const result = await verifyOtp(email, 'verify', code)
    if (!result.ok) {
      const status = result.reason === 'mismatch' ? 400 : 410
      return NextResponse.json({ error: REASON_MESSAGE[result.reason] }, { status })
    }

    if (!result.pending) {
      return NextResponse.json(
        { error: 'This registration is no longer pending. Please sign up again.' },
        { status: 410 },
      )
    }

    // Guards the race where the same email registered twice before verifying.
    const existing = await findUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists. Try signing in instead.' },
        { status: 409 },
      )
    }

    const user = await createVerifiedUser({
      email,
      name: result.pending.name,
      password: result.pending.password,
    })

    const payload = toAuthPayload(user)
    const response = NextResponse.json({ success: true, user: payload })
    return setSessionCookie(response, signToken(payload))
  } catch (err) {
    console.error('OTP verification failed:', err)
    return NextResponse.json({ error: 'Could not verify the code. Please try again.' }, { status: 500 })
  }
}
