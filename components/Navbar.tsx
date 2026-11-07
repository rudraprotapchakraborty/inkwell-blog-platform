"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, PenLine, X } from "lucide-react"
import Brand from "./Brand"
import ThemeToggle from "./ThemeToggle"
import { useAuthUser } from "./auth/use-auth-user"
import { UserMenu } from "./auth/user-menu"

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/blogs", label: "Read" },
  { href: "/about", label: "About" },
]

export default function Navbar() {
  const pathname = usePathname()
  const { user, loading } = useAuthUser()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href))

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled || open ? "border-b border-line bg-paper/90 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="frame flex h-[68px] items-center justify-between gap-4">
        <Brand />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
                active(l.href) ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {user?.role === "admin" && (
            <Link href="/blogs/new" className="btn btn-primary btn-sm hidden sm:inline-flex">
              <PenLine className="h-4 w-4" /> Write
            </Link>
          )}
          <ThemeToggle />
          {loading ? (
            <span className="skeleton h-9 w-9 rounded-full" aria-hidden />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Link href="/login" className="rounded-full px-4 py-2 text-[15px] font-medium text-muted transition-colors hover:text-ink">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-ink btn-sm">Join free</Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-line md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="site-nav-panel frame pb-5 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-2">
            {LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-xl px-4 py-3 text-base font-medium ${active(l.href) ? "bg-brand-soft text-brand" : "text-ink"}`}
              >
                {l.label}
              </Link>
            ))}
            {user?.role === "admin" && (
              <Link href="/blogs/new" className="rounded-xl px-4 py-3 text-base font-medium text-ink">Write a post</Link>
            )}
            {!user && !loading && (
              <div className="mt-1 flex gap-2 border-t border-line p-2 pt-3">
                <Link href="/login" className="btn btn-ghost btn-sm flex-1">Sign in</Link>
                <Link href="/register" className="btn btn-ink btn-sm flex-1">Join free</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
