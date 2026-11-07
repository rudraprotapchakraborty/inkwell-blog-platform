import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { isMailConfigured, otpEmailTemplate, sendMail } from '@/lib/mailer'
import {
  clearOtp,
  findUserByEmail,
  isValidEmail,
  issueOtp,
  normaliseEmail,
  validatePassword,
} from '@/lib/users'

/**
 * Step 1 of registration: validate, then email a one-time code. The account is
 * not created here — `/api/auth/verify-otp` creates it once the code is
 * confirmed, so an unverified address never occupies an email.
 */
export async function POST(request: NextRequest) {
  try {
    const { name = '', email = '', password = '' } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const weak = validatePassword(password)
    if (weak) return NextResponse.json({ error: weak }, { status: 400 })

    if (!isMailConfigured()) {
      return NextResponse.json(
        { error: 'Email delivery is not configured on the server, so codes cannot be sent.' },
        { status: 503 },
      )
    }

    const existing = await findUserByEmail(email)
    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email already exists. Try signing in instead.' },
        { status: 409 },
      )
    }

    const { code, retryAfterMs } = await issueOtp(email, 'verify', {
      name: String(name),
      password: await bcrypt.hash(password, 10),
    })

    if (retryAfterMs) {
      return NextResponse.json(
        {
          error: `A code was just sent. Please wait ${Math.ceil(retryAfterMs / 1000)}s before requesting another.`,
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        },
        { status: 429 },
      )
    }

    const mail = otpEmailTemplate(code, 'verify')
    try {
      await sendMail({ to: normaliseEmail(email), ...mail })
    } catch (mailErr) {
      // Drop the code we just issued, otherwise the retry hits the cooldown for
      // a message that was never delivered.
      await clearOtp(email, 'verify')
      throw mailErr
    }

    return NextResponse.json({ success: true, email: normaliseEmail(email) })
  } catch (err) {
    console.error('Registration failed:', err)
    return NextResponse.json({ error: 'Could not start registration. Please try again.' }, { status: 500 })
  }
}
