import { NextRequest, NextResponse } from 'next/server'
import { isMailConfigured, otpEmailTemplate, sendMail } from '@/lib/mailer'
import { allowOtpRetry, findUserByEmail, isValidEmail, issueOtp, normaliseEmail } from '@/lib/users'

/**
 * Re-sends the verification code for a signup already in progress. The pending
 * signup details are carried over by `issueOtp`, so no password is needed again.
 */
export async function POST(request: NextRequest) {
  try {
    const { email = '' } = await request.json()

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (!isMailConfigured()) {
      return NextResponse.json(
        { error: 'Email delivery is not configured on the server, so codes cannot be sent.' },
        { status: 503 },
      )
    }

    // Nothing to verify if the account already exists.
    if (await findUserByEmail(email)) {
      return NextResponse.json(
        { error: 'That email is already registered. Try signing in instead.' },
        { status: 409 },
      )
    }

    const { code, retryAfterMs } = await issueOtp(email, 'verify')
    if (retryAfterMs) {
      return NextResponse.json(
        {
          error: `Please wait ${Math.ceil(retryAfterMs / 1000)}s before requesting another code.`,
          retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        },
        { status: 429 },
      )
    }

    const mail = otpEmailTemplate(code, 'verify')
    try {
      await sendMail({ to: normaliseEmail(email), ...mail })
    } catch (mailErr) {
      // Let them press resend again straight away, keeping the pending signup.
      await allowOtpRetry(email, 'verify')
      throw mailErr
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Resending the code failed:', err)
    return NextResponse.json({ error: 'Could not resend the code. Please try again.' }, { status: 500 })
  }
}
