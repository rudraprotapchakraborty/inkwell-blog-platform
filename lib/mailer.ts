import nodemailer from 'nodemailer'

/**
 * Single outbound-mail helper shared by the auth flows.
 *
 * Two transports, both free at the volumes this site sends:
 *   1. SMTP (nodemailer) — set SMTP_HOST / SMTP_USER / SMTP_PASS. A Gmail
 *      account with an app password works and needs no domain.
 *   2. Resend HTTP API  — set RESEND_API_KEY and MAIL_FROM.
 *
 * SMTP is tried first: configuring it is a deliberate act, whereas
 * RESEND_API_KEY may already be present for unrelated features (the contact
 * form uses it). Letting Resend win would hijack an explicit SMTP setup.
 *
 * Resend only accepts senders on a domain verified in its dashboard, and its
 * shared `onboarding@resend.dev` address reaches nobody but the account owner
 * — neither can carry OTPs to real visitors, so both are treated as unusable
 * here rather than silently dropping the mail.
 */

export interface MailInput {
  to: string
  subject: string
  html: string
  text?: string
}

const RESEND_SANDBOX_SENDER = 'resend.dev'

function resendSender(): string | null {
  const from = process.env.MAIL_FROM
  if (!process.env.RESEND_API_KEY || !from) return null
  // A sandbox sender cannot reach arbitrary recipients — treat it as unavailable.
  if (from.includes(RESEND_SANDBOX_SENDER)) return null
  return from
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

/** True when at least one transport can actually deliver to an arbitrary address. */
export function isMailConfigured(): boolean {
  return Boolean(resendSender()) || smtpConfigured()
}

export async function sendMail({ to, subject, html, text }: MailInput): Promise<void> {
  if (smtpConfigured()) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })

    await transporter.sendMail({
      from: process.env.MAIL_FROM || `"Inkwell" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    })
    return
  }

  const from = resendSender()
  if (from) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Resend rejected the message (${res.status}): ${detail}`)
    }
    return
  }

  throw new Error(
    'No mail transport configured. Set SMTP_HOST / SMTP_USER / SMTP_PASS, or MAIL_FROM + RESEND_API_KEY on a domain verified with Resend.',
  )
}

/** Branded wrapper for the one-time codes. */
export function otpEmailTemplate(
  code: string,
  purpose: 'verify' | 'reset' | 'email-change',
): { subject: string; html: string; text: string } {
  const heading =
    purpose === 'verify' ? 'Confirm your email' : purpose === 'reset' ? 'Reset your password' : 'Confirm your new email'
  const lead =
    purpose === 'verify'
      ? 'Use this code to finish creating your Inkwell account.'
      : purpose === 'reset'
        ? 'Use this code to set a new password for your Inkwell account.'
        : 'Use this code to move your Inkwell account to this address.'

  return {
    subject: `${code} is your Inkwell verification code`,
    text: `${lead}\n\nYour code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #111;">
        <h2 style="margin: 0 0 4px;">🌊 ${heading}</h2>
        <p style="color: #666; font-size: 14px; margin: 0 0 24px;">${lead}</p>
        <div style="font-size: 34px; font-weight: 700; letter-spacing: 10px; text-align: center; padding: 20px; background: #f5f7fa; border-radius: 12px;">
          ${code}
        </div>
        <p style="color: #666; font-size: 13px; margin: 24px 0 0;">This code expires in 10 minutes.</p>
        <p style="color: #999; font-size: 12px; margin: 8px 0 0;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  }
}
