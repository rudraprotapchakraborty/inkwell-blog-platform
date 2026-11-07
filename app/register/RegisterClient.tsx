"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useT } from "@/lib/i18n"
import { authMessages } from "@/lib/i18n/messages/auth"
import { AuthError, AuthNotice, AuthShell, AuthSubmit } from "@/components/auth/auth-shell"
import { AuthField } from "@/components/auth/auth-field"
import { AuthDivider, GoogleButton } from "@/components/auth/google-button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

const RESEND_COOLDOWN_SECONDS = 60

function RegisterFlow() {
  const t = useT(authMessages)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("from") || "/account"

  // "details" collects the account, "code" confirms the email. The account is
  // only created once the code checks out on the server.
  const [step, setStep] = useState<"details" | "code">("details")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")

  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleDetails(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setNotice("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setStep("code")
        setCooldown(RESEND_COOLDOWN_SECONDS)
      } else {
        setError(data.error || t("genericError"))
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds)
      }
    } catch {
      setError(t("genericError"))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setNotice("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      })

      if (res.ok) {
        router.push(redirect)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || t("genericError"))
        setCode("")
      }
    } catch {
      setError(t("genericError"))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError("")
    setNotice("")

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        setNotice(t("resent"))
        setCooldown(RESEND_COOLDOWN_SECONDS)
      } else {
        setError(data.error || t("genericError"))
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds)
      }
    } catch {
      setError(t("genericError"))
    }
  }

  if (step === "code") {
    return (
      <AuthShell
        step={t("panel.steps.verify")}
        trail={[{ label: t("panel.steps.register") }]}
        title={t("otpTitle")}
        subtitle={t("otpSubtitle", { email })}
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("details")
              setCode("")
              setError("")
              setNotice("")
            }}
            className="font-semibold text-brand underline underline-offset-4"
          >
            {t("changeEmail")}
          </button>
        }
      >
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label htmlFor="otp-code" className="mb-3 block text-[13px] font-semibold tracking-[-0.005em] text-ink">
              {t("otpLabel")}
            </label>
            <div>
              <InputOTP id="otp-code" maxLength={6} value={code} onChange={setCode} autoFocus>
                <InputOTPGroup className="gap-2 sm:gap-2.5">
                  {[0, 1, 2, 3, 4, 5].map(index => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className="h-14 w-12 rounded-[10px] border border-ink/15 bg-surface text-xl font-semibold tabular-nums text-ink ring-brand ring-offset-0 first:rounded-[10px] first:border-l last:rounded-[10px] sm:w-[3.25rem]"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <AuthError message={error} />
          <AuthNotice message={notice} />

          <AuthSubmit loading={loading} label={t("verify")} loadingLabel={t("verifying")} />

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="mx-auto block rounded-sm text-sm font-semibold text-muted transition-colors hover:text-brand disabled:cursor-default disabled:text-muted disabled:hover:text-muted"
          >
            {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
          </button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      step={t("panel.steps.register")}
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <span>
          {t("haveAccount")}{" "}
          <Link
            href={`/login${redirect !== "/account" ? `?from=${encodeURIComponent(redirect)}` : ""}`}
            className="font-semibold text-brand underline underline-offset-4"
          >
            {t("signInLink")}
          </Link>
        </span>
      }
    >
      <GoogleButton label={t("googleContinue")} from={redirect} />
      <AuthDivider label={t("orDivider")} />

      <form onSubmit={handleDetails} className="space-y-4">
        <AuthField
          label={t("name")}
          value={name}
          onChange={setName}
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          required={false}
        />
        <AuthField
          label={t("email")}
          value={email}
          onChange={setEmail}
          type="email"
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
        />
        <AuthField
          label={t("choosePassword")}
          value={password}
          onChange={setPassword}
          type="password"
          placeholder={t("choosePasswordPlaceholder")}
          autoComplete="new-password"
          hint={t("passwordHint")}
        />

        <AuthError message={error} />

        <AuthSubmit loading={loading} label={t("createAccount")} loadingLabel={t("creatingAccount")} />
      </form>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterFlow />
    </Suspense>
  )
}
