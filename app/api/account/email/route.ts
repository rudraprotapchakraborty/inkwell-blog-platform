import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth, setSessionCookie, signToken } from '@/lib/auth'
import { isMailConfigured, otpEmailTemplate, sendMail } from '@/lib/mailer'
import {
  clearOtp,
  findUserByAuth,
  findUserByEmail,
  isValidEmail,
  issueOtp,
  normaliseEmail,
  toAuthPayload,
  updateEmail,
  verifyOtp,
} from '@/lib/users'

/**
 * Changing the sign-in email is two steps, because the address is the
 * account's key: POST sends a code to the new address, PUT confirms it.
 * Nothing changes until the new address has proved it can receive mail.
 *
 * The account must re-enter its password to request the change, so a session
 * left open on a shared machine can't be used to take it over. The change
 * also disconnects Google sign-in and frees the old address, so an account
 * without a password is asked to set one first.
 */

const REASON_MESSAGE: Record<string, string> = {
  missing: 'That code has expired or was already used. Request a new one.',
  expired: 'That code has expired. Request a new one.',
  'too-many-attempts': 'Too many incorrect attempts. Request a new code.',
  mismatch: 'That code is not correct.',
}

/** Step 1: send a code to the new address. */
export async function POST(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { email = '', currentPassword = '' } = await request.json()

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    const next = normaliseEmail(email)
    if (next === user.email) {
      return NextResponse.json({ error: 'That is already your email address.' }, { status: 400 })
    }
    // The change disconnects Google (the old address is freed), so an account
    // with no password would be left with no way to sign in.
    if (!user.password) {
      return NextResponse.json(
        { error: 'Set a password first — changing your email disconnects Google sign-in.', needsPassword: true },
        { status: 409 },
      )
    }
    if (!(await bcrypt.compare(String(currentPassword), user.password))) {
      return NextResponse.json({ error: 'Your current password is not correct.' }, { status: 403 })
    }
    if (await findUserByEmail(next)) {
      return NextResponse.json({ error: 'Another account already uses that email.' }, { status: 409 })
    }
    if (!isMailConfigured()) {
      return NextResponse.json(
        { error: 'Email delivery is not configured on the server, so codes cannot be sent.' },
        { status: 503 },
      )
    }

    const { code, retryAfterMs } = await issueOtp(next, 'email-change', undefined, auth.sub)
    if (retryAfterMs) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      return NextResponse.json(
        { error: `Please wait ${seconds}s before requesting another code.`, retryAfterSeconds: seconds },
        { status: 429 },
      )
    }

    try {
      await sendMail({ to: next, ...otpEmailTemplate(code, 'email-change') })
    } catch (mailErr) {
      // A code that never arrived shouldn't hold them in a resend cooldown.
      await clearOtp(next, 'email-change')
      throw mailErr
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Starting the email change failed:', err)
    return NextResponse.json({ error: 'Could not send the code. Please try again.' }, { status: 500 })
  }
}

/** Step 2: confirm the code and move the account to the new address. */
export async function PUT(request: NextRequest) {
  const auth = getAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { email = '', code = '' } = await request.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 })
    }

    const result = await verifyOtp(email, 'email-change', code)
    if (!result.ok) {
      const status = result.reason === 'mismatch' ? 400 : 410
      return NextResponse.json({ error: REASON_MESSAGE[result.reason] }, { status })
    }
    // The code is bound to the account that asked for it.
    if (result.accountId !== auth.sub) {
      return NextResponse.json({ error: 'That code was not issued to this account.' }, { status: 403 })
    }

    const next = normaliseEmail(email)
    // Guards the race where someone else registered the address meanwhile.
    const taken = await findUserByEmail(next)
    if (taken && taken._id.toString() !== auth.sub) {
      return NextResponse.json({ error: 'Another account already uses that email.' }, { status: 409 })
    }

    const user = await findUserByAuth(auth.sub)
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })

    await updateEmail(user._id, next)

    // The email lives in the token, so re-issue it.
    const payload = toAuthPayload({ ...user, email: next })
    const response = NextResponse.json({ success: true, user: payload })
    return setSessionCookie(response, signToken(payload))
  } catch (err) {
    console.error('Confirming the email change failed:', err)
    return NextResponse.json({ error: 'Could not change your email. Please try again.' }, { status: 500 })
  }
}
