import Link from "next/link"
import { ArrowRight, Heart, MessageCircle, PenLine, Share2, Sparkles, Type } from "lucide-react"
import { listPublishedBlogs } from "@/lib/blogs-feed"
import { Monogram } from "@/app/blogs/JournalParts"

export const dynamic = "force-dynamic"

type Post = {
  _id: string
  slug: string
  title: string
  excerpt: string
  category: string
  author: string
  authorAvatar?: string
  coverImage?: string
  readTime: string
}

const FEATURES = [
  { icon: Type, title: "A clean rich-text editor", text: "Headings, lists, tables, images, links and buttons, with a live preview of the page readers will see." },
  { icon: PenLine, title: "Draft, then publish", text: "Keep a post as a draft while you work on it and publish it with one click when it is ready." },
  { icon: Sparkles, title: "Made to be found", text: "Slugs, meta descriptions, key takeaways, in-links and out-links, plus share previews for every story." },
  { icon: MessageCircle, title: "Readers join in", text: "Anyone can like and share; readers with an account can comment, edit and delete their own words." },
]

export default async function Home() {
  const posts = (await listPublishedBlogs().catch(() => [])) as unknown as Post[]
  const latest = posts.slice(0, 3)

  return (
    <>
      {/* Hero */}
      <section className="frame grid items-center gap-12 pb-16 pt-14 lg:grid-cols-12 lg:pt-20">
        <div className="hero-stagger lg:col-span-7">
          <p className="eyeline">A blog writing platform</p>
          <h1 className="display mt-5 text-[clamp(2.8rem,7vw,5.6rem)]">
            Write it down. <span className="accent text-[clamp(3.2rem,8vw,6.4rem)]">Publish it well.</span>
          </h1>
          <p className="lede mt-6 max-w-xl text-muted">
            Inkwell is a quiet place to write, edit and publish stories, and a good-looking place to read them.
            Open the editor, put down the words, and let the page do the rest.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/blogs" className="btn btn-primary">
              Start reading <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/register" className="btn btn-ghost">Create a free account</Link>
          </div>
        </div>

        <div className="lg:col-span-5" aria-hidden>
          <div className="grid-panel relative rounded-[28px] border border-line p-6 sm:p-8">
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <p className="eyeline">New post</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">The quiet joy of a first draft</p>
              <div className="mt-4 space-y-2">
                <div className="h-2.5 w-full rounded-full bg-line" />
                <div className="h-2.5 w-11/12 rounded-full bg-line" />
                <div className="h-2.5 w-3/4 rounded-full bg-line" />
              </div>
              <div className="mt-5 flex items-center gap-3 text-muted">
                <Heart className="h-4 w-4" /> <MessageCircle className="h-4 w-4" /> <Share2 className="h-4 w-4" />
                <span className="ml-auto rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-brand">Publish</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest posts */}
      <section className="frame py-12" data-reveal>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyeline">Fresh on Inkwell</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">
              Latest <span className="accent text-5xl sm:text-6xl">stories</span>
            </h2>
          </div>
          <Link href="/blogs" className="hidden items-center gap-1.5 text-sm font-semibold text-brand sm:inline-flex">
            All posts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="card mt-8 p-10 text-center">
            <p className="text-lg font-semibold">No stories yet</p>
            <p className="mt-1 text-muted">The first post will show up here as soon as it is published.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {latest.map(p => (
              <article key={p._id} data-reveal className="group flex flex-col">
                <Link href={`/blogs/${p.slug}`} className="block aspect-[16/10] overflow-hidden rounded-2xl bg-brand-soft ring-1 ring-line">
                  {p.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.coverImage}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center p-6 text-center font-serif text-3xl italic text-brand">{p.title}</span>
                  )}
                </Link>
                <p className="eyeline mt-5 text-brand">{p.category}</p>
                <h3 className="mt-2 line-clamp-2 text-2xl font-semibold leading-tight tracking-tight">
                  <Link href={`/blogs/${p.slug}`} className="hover:text-brand">{p.title}</Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-muted">{p.excerpt}</p>
                <p className="mt-4 flex items-center gap-2.5 text-sm font-medium">
                  <Monogram name={p.author} src={p.authorAvatar} size={26} />
                  <span className="truncate">{p.author}</span>
                  <span className="eyeline ml-auto shrink-0">{p.readTime}</span>
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Features */}
      <section className="frame py-12">
        <p className="eyeline" data-reveal>Everything a blog needs</p>
        <h2 className="display mt-3 max-w-2xl text-4xl sm:text-5xl" data-reveal>
          Small tools, <span className="accent text-5xl sm:text-6xl">done properly</span>
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-7" data-reveal>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="frame py-12" data-reveal>
        <div className="rounded-[32px] bg-ink px-6 py-14 text-center text-paper sm:px-12">
          <h2 className="display text-4xl sm:text-5xl">
            Ready to <span className="font-serif text-5xl font-normal italic text-brand sm:text-6xl">begin?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-paper/70">
            Create a free account to comment and keep up with the stories you like.
          </p>
          <Link href="/register" className="btn btn-primary mt-8">Join Inkwell</Link>
        </div>
      </section>
    </>
  )
}
