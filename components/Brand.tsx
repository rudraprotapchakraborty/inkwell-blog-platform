import Link from "next/link"

/** A quill nib on an ink tile. */
export function LogoMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="13" fill="#1b1e2b" />
      <path d="M34.5 10.5c-9.6.9-15.8 6.4-17.6 14.6l-2.4 8.4 2.8-.9c1.2 1.3 3 1.9 5.2 1.5 7.4-1.4 12.1-8.3 12-23.6z" fill="#f0a083" />
      <path d="M15 37.5c3-5.5 7.4-10.3 14-14.6" fill="none" stroke="#1b1e2b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Inkwell home" className={`inline-flex w-fit items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="whitespace-nowrap text-[20px] font-bold leading-none tracking-[-0.045em] text-ink sm:text-[22px]">
        Ink<span className="accent text-[26px]">well</span>
      </span>
    </Link>
  )
}
