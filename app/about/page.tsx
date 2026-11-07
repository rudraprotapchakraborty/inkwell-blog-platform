import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "About",
  description: "How Inkwell works: who can write, who can read, and what comes with every post.",
}

const STEPS = [
  { n: "01", title: "Write", text: "Writers open the editor and compose in rich text: headings, lists, tables, images, links and call-to-action buttons." },
  { n: "02", title: "Shape", text: "Add a cover image, a short excerpt, key takeaways, tags, a meta description and the people credited for the piece." },
  { n: "03", title: "Publish", text: "Save as a draft while you work, then publish. Edit or delete a post whenever you need to." },
  { n: "04", title: "Read and react", text: "Readers browse by topic, like and share posts, and comment once they have signed in." },
]

export default function About() {
  return (
    <>
      <section className="frame pb-10 pt-14">
        <p className="eyeline">About Inkwell</p>
        <h1 className="display mt-5 max-w-3xl text-[clamp(2.6rem,6vw,4.8rem)]">
          A blog platform with <span className="accent text-[clamp(3rem,7vw,5.6rem)]">room to think.</span>
        </h1>
        <p className="lede mt-6 max-w-2xl text-muted">
          Inkwell keeps the loop between writing and reading short. Writers get a focused editor and a preview of the
          real page; readers get a fast, readable site that works in light and dark and on any screen.
        </p>
      </section>

      <section className="frame grid gap-5 py-10 sm:grid-cols-2">
        {STEPS.map(s => (
          <div key={s.n} className="card p-7" data-reveal>
            <p className="eyeline text-brand">{s.n}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      <section className="frame py-10" data-reveal>
        <div className="grid-panel rounded-[28px] border border-line p-8 sm:p-12">
          <h2 className="display text-3xl sm:text-4xl">Who can do what</h2>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="font-semibold">Writers</dt>
              <dd className="mt-1 text-muted">Create, edit, publish and delete posts, and manage who else may write.</dd>
            </div>
            <div>
              <dt className="font-semibold">Members</dt>
              <dd className="mt-1 text-muted">Read everything, like and share, and comment with an account (email or Google).</dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/blogs" className="btn btn-primary">Read the blog</Link>
            <Link href="/register" className="btn btn-ghost">Create an account</Link>
          </div>
        </div>
      </section>
    </>
  )
}
