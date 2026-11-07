import { NextRequest, NextResponse } from 'next/server'
import { isMailConfigured, otpEmailTemplate, sendMail } from '@/lib/mailer'
import { clearOtp, findUserByEmail, isValidEmail, issueOtp, normaliseEmail } from '@/lib/users'

/**
 * Step 1 of a password reset: email a code to the account's address.
 *
 * The answer is the same whether or not an account exists — otherwise this
 * form would tell anyone which addresses are registered. Only a malformed
 * address or a server without mail gets a different reply.
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

    const address = normaliseEmail(email)
    const user = await findUserByEmail(address)

    if (user) {
      const { code, retryAfterMs } = await issueOtp(address, 'reset')
      // Inside the cooldown the earlier code is still valid; say nothing new.
      if (!retryAfterMs) {
        try {
          await sendMail({ to: address, ...otpEmailTemplate(code, 'reset') })
        } catch (mailErr) {
          // A code that never arrived shouldn't hold them in a resend cooldown.
          await clearOtp(address, 'reset')
          throw mailErr
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Sending the reset code failed:', err)
    return NextResponse.json({ error: 'Could not send the code. Please try again.' }, { status: 500 })
  }
}
