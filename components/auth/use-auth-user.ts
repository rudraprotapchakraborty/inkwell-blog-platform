"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import type { AuthPayload } from "@/lib/auth"

export interface AuthState {
  user: AuthPayload | null
  /** True until the first `/api/auth/me` response lands. */
  loading: boolean
}

/**
 * Client-side view of the session, for chrome that has to look different when
 * signed in. Re-checks on navigation so the navbar catches up right after a
 * sign-in or sign-out without a full reload.
 */
export function useAuthUser(): AuthState {
  const pathname = usePathname()
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    let active = true

    fetch("/api/auth/me")
      .then(res => res.json())
      .then((data: { authenticated?: boolean; user?: AuthPayload }) => {
        if (!active) return
        setState({ user: data.authenticated ? data.user ?? null : null, loading: false })
      })
      .catch(() => {
        if (active) setState({ user: null, loading: false })
      })

    return () => {
      active = false
    }
  }, [pathname])

  return state
}
