"use client"

import { motion } from "@/lib/motion"

/**
 * A titled block of account content: a ruled section rather than a box, so
 * the dashboard reads like the rest of the site — a hairline, a heading, the
 * content beneath — instead of a stack of cards.
 */
export function Panel({
  title,
  subtitle,
  icon,
  action,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="border-t border-ink/10 pt-5"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink">
            {icon && <span className="text-muted">{icon}</span>}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  )
}
