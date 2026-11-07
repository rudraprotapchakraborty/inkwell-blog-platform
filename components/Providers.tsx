"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { Toaster } from "react-hot-toast"

/**
 * Scroll-reveal for every [data-reveal] element: marks <html> with `js` (so
 * nothing stays hidden without JavaScript) and adds `in-view` as each element
 * scrolls into view. Re-scans on navigation and when content is added.
 */
function Reveal() {
  const pathname = usePathname()

  useEffect(() => {
    document.documentElement.classList.add("js")
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in-view")
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    )
    const scan = () => {
      document.querySelectorAll("[data-reveal]:not(.in-view)").forEach(el => io.observe(el))
    }
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
    }
  }, [pathname])

  return null
}

export default function Providers() {
  return (
    <>
      <Reveal />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: "var(--surface)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: "14px",
            fontSize: "14px",
            fontWeight: 500,
            boxShadow: "var(--shadow)",
          },
          success: { iconTheme: { primary: "#0f8a5f", secondary: "#ffffff" } },
          error: { iconTheme: { primary: "#c2294d", secondary: "#ffffff" } },
        }}
      />
    </>
  )
}
