import { ArrowUpRight, Heart } from "lucide-react"
import Link from "next/link"
import Brand from "./Brand"

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="frame grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Brand />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            A calm place to write and read. Draft in a clean editor, publish when it is ready, and let readers like, comment and share.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:col-span-7 md:justify-items-end">
          <div className="space-y-3 text-sm">
            <p className="eyeline">Read</p>
            <Link href="/blogs" className="block text-ink hover:text-brand">All posts</Link>
            <Link href="/about" className="block text-ink hover:text-brand">About Inkwell</Link>
          </div>
          <div className="space-y-3 text-sm">
            <p className="eyeline">Account</p>
            <Link href="/login" className="block text-ink hover:text-brand">Sign in</Link>
            <Link href="/register" className="block text-ink hover:text-brand">Create account</Link>
          </div>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="frame flex flex-col items-center justify-between gap-3 py-5 sm:flex-row">
          <p className="text-xs text-muted">© {new Date().getFullYear()} Inkwell. Built with Next.js, Tailwind CSS and MongoDB.</p>
          <a
            href="https://rudraprotapchakraborty.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Made by Rudra Protap Chakraborty (opens his portfolio)"
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-3 pr-3.5 text-xs font-medium text-muted shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-ink"
          >
            <Heart aria-hidden className="h-3.5 w-3.5 fill-brand text-brand transition-transform duration-200 group-hover:scale-125" />
            <span>
              Made by <span className="font-semibold text-ink">Rudra Protap Chakraborty</span>
            </span>
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5 opacity-60 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </footer>
  )
}
