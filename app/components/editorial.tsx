import Link from "next/link"

/** The easing curve shared by the page animations. */
export const EASE = [0.16, 1, 0.3, 1] as const

/** A small mono caption. */
export function Meta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`eyeline ${className}`}>{children}</p>
}

/** A primary call-to-action link. */
export function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn btn-primary">
      {children}
    </Link>
  )
}
