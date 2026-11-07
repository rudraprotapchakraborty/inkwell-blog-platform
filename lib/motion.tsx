"use client"

import { createElement, Fragment, forwardRef, type ReactNode } from "react"

/**
 * A tiny stand-in for the animation props the ported components pass
 * (initial / animate / exit / layout ...). Elements render plainly and enter
 * with the site's CSS `page-enter` animation, which honours reduced motion.
 */
const STRIP = new Set([
  "initial", "animate", "exit", "transition", "layout", "layoutId",
  "whileHover", "whileTap", "whileInView", "variants", "viewport",
])

function make(tag: string) {
  return forwardRef<HTMLElement, Record<string, unknown>>(function Motion(props, ref) {
    const rest: Record<string, unknown> = {}
    for (const k of Object.keys(props)) if (!STRIP.has(k)) rest[k] = props[k]
    if (props.initial) {
      const cls = typeof rest.className === "string" ? rest.className : ""
      rest.className = `${cls} page-enter`.trim()
    }
    return createElement(tag, { ...rest, ref })
  })
}

const cache = new Map<string, ReturnType<typeof make>>()

export const motion = new Proxy({} as Record<string, ReturnType<typeof make>>, {
  get(_t, tag: string) {
    if (!cache.has(tag)) cache.set(tag, make(tag))
    return cache.get(tag)!
  },
})

export function AnimatePresence({ children }: { children?: ReactNode; initial?: boolean; mode?: string }) {
  return createElement(Fragment, null, children)
}

export function useReducedMotion(): boolean | null {
  return false
}
