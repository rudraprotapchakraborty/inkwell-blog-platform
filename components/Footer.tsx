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
        <p className="frame py-5 text-xs text-muted">© {new Date().getFullYear()} Inkwell. Built with Next.js, Tailwind CSS and MongoDB.</p>
      </div>
    </footer>
  )
}
