import Link from "next/link"

export default function NotFound() {
  return (
    <section className="frame grid min-h-[60vh] place-items-center py-24 text-center">
      <div>
        <p className="eyeline justify-center">404</p>
        <h1 className="display mt-4 text-5xl sm:text-6xl">
          This page <span className="accent text-6xl sm:text-7xl">wandered off</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted">The page you are looking for does not exist or has been moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">Back home</Link>
          <Link href="/blogs" className="btn btn-ghost">Read the blog</Link>
        </div>
      </div>
    </section>
  )
}
