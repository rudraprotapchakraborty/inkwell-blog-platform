"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "@/lib/motion"
import { useT } from "@/lib/i18n"
import { authMessages } from "@/lib/i18n/messages/auth"
import type { AuthPayload } from "@/lib/auth"
import { AuthField } from "@/components/auth/auth-field"
import { AuthError, AuthNotice } from "@/components/auth/auth-shell"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Avatar } from "@/components/auth/user-menu"

const RESEND_COOLDOWN_SECONDS = 60

/** Profile photos are shown small, so they're shrunk in the browser before upload. */
const AVATAR_MAX_SIDE = 512

/** Reads an image file and returns a JPEG data URL no larger than AVATAR_MAX_SIDE on its long side. */
function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("no canvas"))
      // JPEG has no transparency: paint white under it so a PNG doesn't turn black.
      ctx.fillStyle = "#fff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.88))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("unreadable image"))
    }
    img.src = url
  })
}

/** One line of the sign-in methods list: the method, and whether it's on. */
function MethodRow({ label, on, onLabel, offLabel }: { label: string; on: boolean; onLabel: string; offLabel: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <span className="text-[15px] font-medium text-ink">{label}</span>
      <span
        className={`eyeline rounded-full px-2.5 py-1 ${
          on ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-ink/[0.06] text-muted"
        }`}
      >
        {on ? onLabel : offLabel}
      </span>
    </li>
  )
}

/** The form's own action: compact, with a busy state that keeps its width. */
function SaveButton({ busy, label, busyLabel, disabled }: { busy: boolean; label: string; busyLabel: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />}
      {busy ? busyLabel : label}
    </button>
  )
}

/** One setting: title and what it does in the rail; the form beside it. */
function SettingsSection({
  title,
  hint,
  id,
  children,
}: {
  title: string
  hint: string
  id: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="grid gap-y-4 border-t border-ink/10 py-6 lg:grid-cols-12 lg:gap-x-8 lg:py-7">
      <div className="lg:col-span-4">
        <h2 id={id} className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
          {title}
        </h2>
        <p className="mt-1 max-w-[22rem] text-[13px] leading-relaxed text-muted">{hint}</p>
      </div>
      <div className="max-w-[30rem] lg:col-span-6 lg:col-start-6">{children}</div>
    </section>
  )
}

async function send(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

export function AccountSettings({ initialUser }: { initialUser: AuthPayload }) {
  const t = useT(authMessages)
  const router = useRouter()
  const [user, setUser] = useState(initialUser)

  // Which ways the account signs in decides what the password form asks for.
  const [providers, setProviders] = useState<string[] | null>(null)
  useEffect(() => {
    let active = true
    fetch("/api/account")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (active && d?.profile) setProviders(d.profile.providers) })
      .catch(() => {})
    return () => { active = false }
  }, [])
  const hasPassword = providers === null ? true : providers.includes("password")
  const usesGoogle = providers?.includes("google") ?? false

  /* ---- Name ---- */
  const [name, setName] = useState(user.name || "")
  const [nameState, setNameState] = useState<{ busy: boolean; error: string; notice: string }>({ busy: false, error: "", notice: "" })
  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    setNameState({ busy: true, error: "", notice: "" })
    try {
      const { ok, data } = await send("/api/account", "PATCH", { name })
      if (ok) {
        setUser(data.user)
        setNameState({ busy: false, error: "", notice: t("settings.name.saved") })
        router.refresh()
      } else setNameState({ busy: false, error: data.error || t("genericError"), notice: "" })
    } catch {
      setNameState({ busy: false, error: t("genericError"), notice: "" })
    }
  }

  /* ---- Profile photo ---- */
  const [photoState, setPhotoState] = useState<{ busy: "" | "upload" | "remove"; error: string }>({ busy: "", error: "" })

  async function uploadPhoto(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setPhotoState({ busy: "", error: t("settings.photo.wrongType") })
      return
    }
    setPhotoState({ busy: "upload", error: "" })
    try {
      const image = await shrinkImage(file)
      const { ok, data } = await send("/api/account/avatar", "POST", { image })
      if (ok) {
        setUser(data.user)
        setPhotoState({ busy: "", error: "" })
        router.refresh()
      } else setPhotoState({ busy: "", error: data.error || t("genericError") })
    } catch {
      setPhotoState({ busy: "", error: t("settings.photo.wrongType") })
    }
  }

  async function removePhoto() {
    setPhotoState({ busy: "remove", error: "" })
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setUser(data.user)
        setPhotoState({ busy: "", error: "" })
        router.refresh()
      } else setPhotoState({ busy: "", error: data.error || t("genericError") })
    } catch {
      setPhotoState({ busy: "", error: t("genericError") })
    }
  }

  /* ---- Email: request a code, then confirm it ---- */
  const [newEmail, setNewEmail] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [emailStep, setEmailStep] = useState<"request" | "confirm">("request")
  const [code, setCode] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const [emailState, setEmailState] = useState<{ busy: boolean; error: string; notice: string }>({ busy: false, error: "", notice: "" })

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  async function requestEmailCode(e?: React.FormEvent) {
    e?.preventDefault()
    setEmailState({ busy: true, error: "", notice: "" })
    try {
      const { ok, data } = await send("/api/account/email", "POST", { email: newEmail, currentPassword: emailPassword })
      if (ok) {
        setEmailStep("confirm")
        setCode("")
        setCooldown(RESEND_COOLDOWN_SECONDS)
        setEmailState({ busy: false, error: "", notice: t("settings.email.sent", { email: newEmail.trim() }) })
      } else {
        if (data.retryAfterSeconds) setCooldown(data.retryAfterSeconds)
        setEmailState({ busy: false, error: data.error || t("genericError"), notice: "" })
      }
    } catch {
      setEmailState({ busy: false, error: t("genericError"), notice: "" })
    }
  }

  async function confirmEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailState(s => ({ ...s, busy: true, error: "" }))
    try {
      const { ok, data } = await send("/api/account/email", "PUT", { email: newEmail, code })
      if (ok) {
        setUser(data.user)
        // The change unlinked Google; reflect it without a reload.
        setProviders(p => (p ? p.filter(x => x !== "google") : p))
        setEmailStep("request")
        setNewEmail("")
        setEmailPassword("")
        setCode("")
        setEmailState({ busy: false, error: "", notice: t("settings.email.changed", { email: data.user.email }) })
        router.refresh()
      } else {
        setCode("")
        setEmailState({ busy: false, error: data.error || t("genericError"), notice: "" })
      }
    } catch {
      setEmailState({ busy: false, error: t("genericError"), notice: "" })
    }
  }

  function restartEmail() {
    setEmailStep("request")
    setCode("")
    setEmailState({ busy: false, error: "", notice: "" })
  }

  /* ---- Delete: a deliberate second step, then proof ---- */
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteProof, setDeleteProof] = useState("")
  const [deleteState, setDeleteState] = useState<{ busy: boolean; error: string }>({ busy: false, error: "" })

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault()
    setDeleteState({ busy: true, error: "" })
    try {
      const { ok, data } = await send(
        "/api/account",
        "DELETE",
        { confirmEmail: deleteProof },
      )
      if (ok) {
        // The session is already cleared server-side; leave the account area.
        router.replace("/")
        router.refresh()
        return
      }
      setDeleteState({ busy: false, error: data.error || t("genericError") })
    } catch {
      setDeleteState({ busy: false, error: t("genericError") })
    }
  }

  /* ---- Password ---- */
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordState, setPasswordState] = useState<{ busy: boolean; error: string; notice: string }>({ busy: false, error: "", notice: "" })

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordState({ busy: false, error: t("settings.password.mismatch"), notice: "" })
      return
    }
    setPasswordState({ busy: true, error: "", notice: "" })
    try {
      const { ok, data } = await send("/api/account/password", "POST", { currentPassword, newPassword })
      if (ok) {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setProviders(p => (p && !p.includes("password") ? [...p, "password"] : p))
        setPasswordState({ busy: false, error: "", notice: t("settings.password.saved") })
      } else setPasswordState({ busy: false, error: data.error || t("genericError"), notice: "" })
    } catch {
      setPasswordState({ busy: false, error: t("genericError"), notice: "" })
    }
  }

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="frame"
      >
        <div className="pb-6 pt-6 sm:pt-8">
          <h1 className="text-[1.625rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[1.875rem]">
            {t("settings.title")}
          </h1>
          <p className="mt-1 max-w-[34rem] text-sm text-muted">{t("settings.subtitle")}</p>
        </div>
      </motion.header>

      <div className="frame">
        {/* Profile: photo and name */}
        <SettingsSection id="settings-name" title={t("settings.profile.title")} hint={t("settings.profile.hint")}>
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <Avatar user={user} size={56} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label
                  className={`inline-flex h-10 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-brand cursor-pointer items-center gap-2 rounded-[10px] px-4 text-sm font-semibold ring-1 ring-inset ring-ink/15 transition-colors hover:ring-ink/30 ${
                    photoState.busy ? "pointer-events-none opacity-60" : "text-ink"
                  }`}
                >
                  {photoState.busy === "upload" && (
                    <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                  )}
                  {photoState.busy === "upload"
                    ? t("settings.photo.uploading")
                    : user.avatar
                      ? t("settings.photo.change")
                      : t("settings.photo.upload")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    disabled={Boolean(photoState.busy)}
                    onChange={e => {
                      uploadPhoto(e.target.files)
                      e.target.value = ""
                    }}
                  />
                </label>
                {user.avatar && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    disabled={Boolean(photoState.busy)}
                    className="rounded-sm text-sm font-semibold text-muted transition-colors hover:text-red-600 disabled:opacity-60"
                  >
                    {photoState.busy === "remove" ? t("settings.photo.removing") : t("settings.photo.remove")}
                  </button>
                )}
              </div>
              <p className="text-[13px] leading-snug text-muted">{t("settings.photo.hint")}</p>
            </div>
          </div>
          <AuthError message={photoState.error} />

          <form onSubmit={saveName} className="space-y-5">
            <AuthField label={t("settings.name.label")} value={name} onChange={setName} autoComplete="name" />
            <AuthError message={nameState.error} />
            <AuthNotice message={nameState.notice} />
            <SaveButton
              busy={nameState.busy}
              label={t("settings.name.save")}
              busyLabel={t("saving")}
              disabled={!name.trim() || name.trim() === (user.name || "")}
            />
          </form>
        </SettingsSection>

        {/* Email */}
        <SettingsSection id="settings-email" title={t("settings.email.title")} hint={t("settings.email.hint")}>
          <dl className="mb-6 border-y border-ink/10 py-3">
            <dt className="eyeline text-muted">{t("settings.email.current")}</dt>
            <dd className="mt-1 break-all text-[15px] font-medium text-ink">{user.email}</dd>
          </dl>

          {!hasPassword ? (
            // The change disconnects Google, so a password-less account would be locked out.
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-muted">{t("settings.email.needsPassword")}</p>
              <a href="#settings-password" className="cs-underline inline-block rounded-sm text-sm font-semibold text-brand">
                {t("settings.email.needsPasswordLink")}
              </a>
            </div>
          ) : emailStep === "request" ? (
            <form onSubmit={requestEmailCode} className="space-y-5">
              <AuthField label={t("settings.email.next")} type="email" value={newEmail} onChange={setNewEmail} autoComplete="email" />
              <AuthField
                label={t("settings.email.password")}
                type="password"
                value={emailPassword}
                onChange={setEmailPassword}
                autoComplete="current-password"
              />
              {usesGoogle && <p className="text-[13px] leading-snug text-muted">{t("settings.email.googleNote")}</p>}
              <AuthError message={emailState.error} />
              <AuthNotice message={emailState.notice} />
              <SaveButton
                busy={emailState.busy}
                label={t("settings.email.send")}
                busyLabel={t("saving")}
                disabled={!newEmail.trim() || !emailPassword || cooldown > 0}
              />
            </form>
          ) : (
            <form onSubmit={confirmEmail} className="space-y-5">
              <AuthNotice message={emailState.notice} />
              <div>
                <label htmlFor="email-code" className="mb-3 block text-[13px] font-semibold tracking-[-0.005em] text-ink">
                  {t("settings.email.code")}
                </label>
                <InputOTP id="email-code" maxLength={6} value={code} onChange={setCode} autoFocus>
                  <InputOTPGroup className="gap-2">
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-14 w-12 rounded-[10px] border border-ink/15 bg-surface text-xl font-semibold tabular-nums text-ink ring-brand ring-offset-0 first:rounded-[10px] first:border-l last:rounded-[10px]"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <AuthError message={emailState.error} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <SaveButton busy={emailState.busy} label={t("settings.email.confirm")} busyLabel={t("verifying")} disabled={code.length < 6} />
                <button
                  type="button"
                  onClick={() => requestEmailCode()}
                  disabled={cooldown > 0 || emailState.busy}
                  className="rounded-sm text-sm font-semibold text-muted transition-colors hover:text-brand disabled:cursor-default disabled:text-muted"
                >
                  {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resend")}
                </button>
                <button
                  type="button"
                  onClick={restartEmail}
                  className="rounded-sm text-sm font-semibold text-muted transition-colors hover:text-brand"
                >
                  {t("settings.email.restart")}
                </button>
              </div>
            </form>
          )}
        </SettingsSection>

        {/* Password */}
        <SettingsSection
          id="settings-password"
          title={t("settings.password.title")}
          hint={hasPassword ? t("settings.password.hint") : t("settings.password.setHint")}
        >
          <form onSubmit={savePassword} className="space-y-5">
            {/* Lets password managers file the change under the right account. */}
            <input type="email" name="username" autoComplete="username" value={user.email || ""} readOnly hidden />
            {hasPassword && (
              <div>
                <AuthField
                  label={t("settings.password.current")}
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />
                {/* Forgotten it? The emailed-code reset works signed in too. */}
                <Link
                  href={`/forgot-password?email=${encodeURIComponent(user.email || "")}&from=/account/settings`}
                  className="cs-underline mt-2 inline-block rounded-sm text-[13px] font-semibold text-muted transition-colors hover:text-brand"
                >
                  {t("settings.password.forgot")}
                </Link>
              </div>
            )}
            <AuthField
              label={t("settings.password.next")}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              hint={hasPassword ? undefined : t("settings.password.hint")}
            />
            <AuthField
              label={t("settings.password.confirm")}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            <AuthError message={passwordState.error} />
            <AuthNotice message={passwordState.notice} />
            <SaveButton
              busy={passwordState.busy}
              label={hasPassword ? t("settings.password.save") : t("settings.password.set")}
              busyLabel={t("saving")}
              disabled={!newPassword || !confirmPassword || (hasPassword && !currentPassword)}
            />
          </form>
        </SettingsSection>

        {/* Sign-in methods: which ways into this account are switched on. */}
        <SettingsSection id="settings-signin" title={t("settings.signin.title")} hint={t("settings.signin.hint")}>
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            <MethodRow
              label={t("settings.signin.password")}
              on={hasPassword}
              onLabel={t("settings.signin.on")}
              offLabel={t("settings.signin.notSet")}
            />
            <MethodRow
              label={t("settings.signin.google")}
              on={usesGoogle}
              onLabel={t("settings.signin.connected")}
              offLabel={t("settings.signin.notConnected")}
            />
          </ul>
          {!usesGoogle && (
            <p className="mt-4 text-[13px] leading-snug text-muted">
              {t("settings.signin.connectHint", { email: user.email || "" })}
            </p>
          )}
          {!hasPassword && (
            <a href="#settings-password" className="cs-underline mt-4 inline-block rounded-sm text-sm font-semibold text-brand">
              {t("settings.email.needsPasswordLink")}
            </a>
          )}
        </SettingsSection>

        {/* Delete account: set apart, and in the one place red is used. */}
        <SettingsSection id="settings-delete" title={t("settings.delete.title")} hint={t("settings.delete.hint")}>
          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex h-11 items-center rounded-[10px] px-5 text-sm font-semibold text-red-600 ring-1 ring-inset ring-red-500/40 transition-colors hover:bg-red-500/[0.06] dark:text-red-400"
            >
              {t("settings.delete.start")}
            </button>
          ) : (
            <form
              onSubmit={deleteAccount}
              className="space-y-5 rounded-lg bg-red-500/[0.04] p-5 ring-1 ring-inset ring-red-500/25 sm:p-6"
            >
              <div>
                <p className="text-[1.125rem] font-medium tracking-[-0.02em] text-ink">{t("settings.delete.confirmTitle")}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{t("settings.delete.confirmBody")}</p>
              </div>
              <AuthField
                label={t("settings.delete.email", { email: user.email || "" })}
                type="email"
                value={deleteProof}
                onChange={setDeleteProof}
                autoComplete="off"
              />
              <AuthError message={deleteState.error} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  type="submit"
                  disabled={deleteState.busy || deleteProof.trim().toLowerCase() !== (user.email || "").toLowerCase()}
                  aria-busy={deleteState.busy || undefined}
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteState.busy && (
                    <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                  )}
                  {deleteState.busy ? t("settings.delete.deleting") : t("settings.delete.confirm")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteOpen(false)
                    setDeleteProof("")
                    setDeleteState({ busy: false, error: "" })
                  }}
                  className="rounded-sm text-sm font-semibold text-muted transition-colors hover:text-ink"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          )}
        </SettingsSection>
      </div>
    </>
  )
}
