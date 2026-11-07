"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useT } from "@/lib/i18n"
import { authMessages } from "@/lib/i18n/messages/auth"
import { AuthError, AuthShell, AuthSubmit } from "@/components/auth/auth-shell"
import { AuthField } from "@/components/auth/auth-field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { useAuthUser } from "@/components/auth/use-auth-user"

const RESEND_COOLDOWN_SECONDS = 60

/**
 * Password reset, in two steps on one page: the email gets a code, then the
 * code and a new password set it and sign the account in. Reached from the
 * login form and from account settings (which pre-fills the address).
 */
function ResetFlow() {
  const t = useT(authMessages)
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get("from") || "/account"
  // Signed in (arriving from settings), "Remembered it? Sign in" makes no sense.
  const { user } = useAuthUser()

  const [step, setStep] = useState<"email" | "reset">("email")
  const [email, setEmail] = useState(params.get("email") || "")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStep("reset")
        setCode("")
        setCooldown(RESEND_COOLDOWN_SECONDS)
        setNotice(t("forgot.sent", { email: email.trim() }))
      } else {
        setError(data.error || t("genericError"))
      }
    } catch {
      setError(t("genericError"))
    } finally {
      setLoading(false)
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError(t("forgot.mismatch"))
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        router.push(redirect)
        router.refresh()
      } else {
        setError(data.error || t("genericError"))
        setCode("")
      }
    } catch {
      setError(t("genericError"))
    } finally {
      setLoading(false)
    }
  }

  const backToLogin = (
    <span>
      {t("forgot.remembered")}{" "}
      <Link href="/login" className="font-semibold text-brand underline underline-offset-4">
        {t("signInLink")}
      </Link>
    </span>
  )

  // Reached from sign-in, or from settings by someone already signed in.
  const trail = user
    ? [{ label: t("settings.nav"), href: "/account/settings" }]
    : [{ label: t("panel.steps.signIn"), href: "/login" }]

  if (step === "reset") {
    return (
      <AuthShell
        step={t("panel.steps.reset")}
        trail={trail}
        title={t("forgot.sentTitle")}
        subtitle={notice}
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("email")
              setError("")
              setCode("")
            }}
            className="font-semibold text-brand underline underline-offset-4"
          >
            {t("forgot.differentEmail")}
          </button>
        }
      >
        <form onSubmit={reset} className="space-y-5">
          {/* Lets password managers file the new password under this address. */}
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <div>
            <label htmlFor="reset-code" className="mb-3 block text-[13px] font-semibold tracking-[-0.005em] text-ink">
              {t("otpLabel")}
            </label>
            <InputOTP id="reset-code" maxLength={6} value={code} onChange={setCode} autoFocus>
              <InputOTPGroup className="gap-2 sm:gap-2.5">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-14 w-12 rounded-[10px] border border-ink/15 bg-surface text-xl font-semibold tabular-nums text-ink ring-brand ring-offset-0 first:rounded-[10px] first:border-l last:rounded-[10px] sm:w-[3.25rem]"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <AuthField
            label={t("forgot.newPassword")}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint={t("passwordHint")}
          />
          <AuthField
            label={t("forgot.confirmPassword")}
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          <AuthError message={error} />
          <AuthSubmit loading={loading} label={t("forgot.save")} loadingLabel={t("forgot.saving")} />
          <button
            type="button"
            onClick={() => sendCode()}
            disabled={cooldown > 0 || loading}
            className="mx-auto block rounded-sm text-sm font-semibold text-muted transition-colors hover:text-brand disabled:cursor-default disabled:text-muted disabled:hover:text-muted"
          >
            {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
          </button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell step={t("panel.steps.reset")} trail={trail} title={t("forgot.title")} subtitle={t("forgot.subtitle")} footer={user ? undefined : backToLogin}>
      <form onSubmit={sendCode} className="space-y-4">
        <AuthField
          label={t("email")}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
        />
        <AuthError message={error} />
        <AuthSubmit loading={loading} label={t("forgot.send")} loadingLabel={t("forgot.sending")} />
      </form>
    </AuthShell>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetFlow />
    </Suspense>
  )
}
