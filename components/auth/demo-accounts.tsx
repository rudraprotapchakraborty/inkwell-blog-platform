"use client"

import { useState } from "react"
import { ArrowUpLeft, PenLine, BookOpen } from "lucide-react"
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts"

const icons = { Writer: PenLine, Reader: BookOpen }

/** "Try a test account": lists the demo logins and fills the sign-in form with the chosen one. */
export default function DemoAccounts({ onChoose }: { onChoose: (a: { email: string; password: string }) => void }) {
  const [chosen, setChosen] = useState("")

  return (
    <section aria-label="Test accounts" className="grid-panel rounded-[28px] border border-line p-5 sm:p-9">
      <span className="eyeline">Test accounts</span>
      <h2 className="display mt-4 text-3xl">
        Try a <span className="accent">test account</span>
      </h2>
      <p className="mt-2 text-sm text-muted">Pick a role to fill in the sign-in form. No sign-up needed.</p>

      <ul className="mt-6 space-y-3">
        {DEMO_ACCOUNTS.map(a => {
          const Icon = icons[a.label]
          return (
            <li key={a.email} className="card flex items-center gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{a.label}</p>
                <p className="truncate font-mono text-xs text-muted">{a.email}</p>
                <p className="text-xs text-muted">{a.blurb}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChoose(a)
                  setChosen(a.email)
                  document.querySelector<HTMLInputElement>('input[type="email"], input[autocomplete="username"]')?.focus()
                }}
                aria-label={`Use the ${a.label} test account`}
                className="btn btn-ghost btn-sm shrink-0"
              >
                {chosen === a.email ? "Filled in" : "Use login"}
                <ArrowUpLeft className="h-3.5 w-3.5" />
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-5 font-mono text-xs text-muted">
        Password for both: <span className="font-semibold text-ink">{DEMO_PASSWORD}</span>
      </p>
    </section>
  )
}
