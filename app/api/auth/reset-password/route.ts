import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie, signToken } from '@/lib/auth'
import { findUserByEmail, toAuthPayload, touchLastLogin, updatePassword, validatePassword, verifyOtp } from '@/lib/users'

const REASON_MESSAGE: Record<string, string> = {
  missing: 'That code has expired or was already used. Request a new one.',
  expired: 'That code has expired. Request a new one.',
  'too-many-attempts': 'Too many incorrect attempts. Request a new code.',
  mismatch: 'That code is not correct.',
}

/**
 * Step 2 of a password reset: the emailed code proves the address, so it sets
 * the new password and signs the account in. An account that only ever used
 * Google gains a password here, the same as setting one in settings.
 */
export async function POST(request: NextRequest) {
  try {
    const { email = '', code = '', newPassword = '' } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })
    }
    // Checked before the code, so a weak password doesn't burn the code.
    const weak = validatePassword(String(newPassword))
    if (weak) return NextResponse.json({ error: weak }, { status: 400 })

    const result = await verifyOtp(email, 'reset', code)
    if (!result.ok) {
      const status = result.reason === 'mismatch' ? 400 : 410
      return NextResponse.json({ error: REASON_MESSAGE[result.reason] }, { status })
    }

    const user = await findUserByEmail(email)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    await updatePassword(user._id, await bcrypt.hash(String(newPassword), 10))
    await touchLastLogin(user._id)

    const payload = toAuthPayload(user)
    const response = NextResponse.json({ success: true, user: payload })
    return setSessionCookie(response, signToken(payload))
  } catch (err) {
    console.error('Resetting the password failed:', err)
    return NextResponse.json({ error: 'Could not reset your password. Please try again.' }, { status: 500 })
  }
}
