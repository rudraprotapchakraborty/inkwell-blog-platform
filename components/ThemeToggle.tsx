"use client"

import { Moon, Sun } from "lucide-react"

/**
 * Switches the `dark` class on <html> and remembers the choice. The icons are
 * swapped with CSS, so the button needs no state. The initial class is applied
 * by the inline script in the layout before the first paint.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = () => {
    const root = document.documentElement
    root.classList.add("theme-switching")
    window.setTimeout(() => root.classList.remove("theme-switching"), 450)
    const dark = root.classList.toggle("dark")
    try {
      localStorage.setItem("ink_theme", dark ? "dark" : "light")
    } catch {
      /* storage unavailable: the theme still applies for this visit */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Toggle theme"
      className={`grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-line hover:text-ink ${className}`}
    >
      <Moon className="h-[18px] w-[18px] dark:hidden" />
      <Sun className="hidden h-[18px] w-[18px] dark:block" />
    </button>
  )
}
