"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, PenLine, Settings, UserRound } from "lucide-react"
import toast from "react-hot-toast"
import type { AuthPayload } from "@/lib/auth"

/**
 * Google's profile picture when there is one, otherwise the initial on the
 * brand tint. Plain `img` rather than `next/image` because the Google CDN
 * host would otherwise need whitelisting.
 */
export function Avatar({ user, size = 32 }: { user: AuthPayload; size?: number }) {
  const [failed, setFailed] = React.useState(false)
  const label = user.name || user.email || "?"

  return user.avatar && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="rounded-full object-cover ring-1 ring-line"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="grid select-none place-items-center rounded-full bg-brand-soft font-bold text-brand ring-1 ring-line"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {label.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** The account dropdown in the navbar. */
export function UserMenu({ user }: { user: AuthPayload }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const router = useRouter()

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    setOpen(false)
    toast.success("Signed out")
    router.push("/")
    router.refresh()
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-brand-soft hover:text-ink"

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-10 w-10 place-items-center rounded-full transition-transform hover:scale-105"
      >
        <Avatar user={user} size={34} />
      </button>
      {open && (
        <div role="menu" className="animate-pop absolute right-0 top-12 z-50 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-soft">
          <div className="border-b border-line px-3 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold text-ink">{user.name || "Account"}</p>
            {user.email && <p className="truncate text-xs text-muted">{user.email}</p>}
            {user.role === "admin" && <span className="chip mt-1.5 bg-brand-soft text-brand">Writer · admin</span>}
          </div>
          <div className="pt-1.5">
            {user.role === "admin" && (
              <Link href="/blogs/new" role="menuitem" onClick={() => setOpen(false)} className={item}>
                <PenLine className="h-4 w-4" /> Write a post
              </Link>
            )}
            <Link href="/account" role="menuitem" onClick={() => setOpen(false)} className={item}>
              <UserRound className="h-4 w-4" /> Account
            </Link>
            <Link href="/account/settings" role="menuitem" onClick={() => setOpen(false)} className={item}>
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <button type="button" role="menuitem" onClick={logout} className={item}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
