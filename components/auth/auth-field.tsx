"use client"

import { useId, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
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
}

/**
 * A labelled input on the paper: the label above in the grotesk, a plain
 * field with a hairline that turns the action colour on focus. Passwords get
 * a reveal toggle that is a real, labelled, reachable button.
 */
export function AuthField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
  hint,
}: AuthFieldProps) {
  const t = useT(authMessages)
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === "password"
  const inputType = isPassword && revealed ? "text" : type

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold tracking-[-0.005em] text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`h-12 w-full rounded-[10px] bg-surface pl-4 ${isPassword ? "pr-12" : "pr-4"} text-[15px] text-ink outline-none ring-1 ring-inset ring-ink/15 transition-shadow duration-200 placeholder:text-muted/70 hover:ring-ink/30 focus:ring-2 focus:ring-brand`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed(v => !v)}
            aria-label={revealed ? t("hidePassword") : t("showPassword")}
            aria-pressed={revealed}
            className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:text-ink"
          >
            {revealed ? <EyeOff aria-hidden size={16} /> : <Eye aria-hidden size={16} />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-2 text-[13px] leading-snug text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
