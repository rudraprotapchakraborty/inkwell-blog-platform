"use client"

import { useId, useState } from "react"
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react"
import { useT } from "@/lib/i18n"
import { authMessages } from "@/lib/i18n/messages/auth"

interface AuthFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "email" | "password"
  placeholder?: string
  autoComplete?: string
  required?: boolean
  hint?: string
  /** Defaults from the type: mail for email-like fields, lock for passwords. */
  icon?: "mail" | "lock" | "user" | null
}

const ICONS = { mail: Mail, lock: Lock, user: UserRound }

/** Labelled input with a leading icon; password inputs get a show/hide toggle. */
export function AuthField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
  hint,
  icon,
}: AuthFieldProps) {
  const t = useT(authMessages)
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === "password"
  const inputType = isPassword && revealed ? "text" : type
  const iconKey = icon === undefined ? (isPassword ? "lock" : type === "email" || autoComplete === "username" || autoComplete === "email" ? "mail" : null) : icon
  const Icon = iconKey ? ICONS[iconKey] : null

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="group relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand" />
        )}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`input ${Icon ? "pl-11" : ""} ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            aria-label={revealed ? t("hidePassword") : t("showPassword")}
            aria-pressed={revealed}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:text-ink"
          >
            {revealed ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
