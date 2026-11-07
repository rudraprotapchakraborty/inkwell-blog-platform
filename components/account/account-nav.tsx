"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings, UserRound, Users } from "lucide-react"

/** Tab bar shared by the account pages. Admins also get People. */
export function AccountNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const tabs = [
    { href: "/account", label: "Account", icon: UserRound },
    { href: "/account/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ href: "/account/people", label: "People", icon: Users }] : []),
  ]

  return (
    <nav aria-label="Account" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line pb-3">
      {tabs.map(t => {
        const on = pathname === t.href
        const Icon = t.icon
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              on ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" /> {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
