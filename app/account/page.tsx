import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight, FileText, MessageCircle, PenLine } from "lucide-react"
import { requireAccountPage } from "@/lib/account-page"
import { getDb } from "@/lib/mongodb"
import { Avatar } from "@/components/auth/user-menu"

export const metadata: Metadata = { title: "Account", robots: { index: false } }

async function stats(userId: string, admin: boolean) {
  try {
    const db = await getDb()
    const [comments, posts, drafts] = await Promise.all([
      db.collection("blog_comments").countDocuments({ userId }),
      admin ? db.collection("blogs").countDocuments({ published: true }) : Promise.resolve(0),
      admin ? db.collection("blogs").countDocuments({ published: false }) : Promise.resolve(0),
    ])
    const draftList = admin
      ? (await db.collection("blogs").find({ published: false }).sort({ updatedAt: -1 }).limit(10).project({ title: 1, slug: 1 }).toArray()).map(d => ({ title: String(d.title || "Untitled"), slug: String(d.slug) }))
      : []
    return { comments, posts, drafts, draftList }
  } catch {
    return { comments: 0, posts: 0, drafts: 0, draftList: [] as { title: string; slug: string }[] }
  }
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const me = await requireAccountPage("/account")
  const { denied } = await searchParams
  const admin = me.role === "admin"
  const s = await stats(me.sub, admin)

  const cards = [
    ...(admin
      ? [
          { label: "Published posts", value: s.posts, icon: FileText },
          { label: "Drafts", value: s.drafts, icon: PenLine },
        ]
      : []),
    { label: "Your comments", value: s.comments, icon: MessageCircle },
  ]

  return (
    <section className="frame pt-8">
      {denied && (
        <p role="alert" className="mb-6 rounded-2xl border border-line bg-danger-soft px-4 py-3 text-sm text-danger">
          That page is for administrators only.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-5">
        <Avatar user={me} size={72} />
        <div className="min-w-0">
          <p className="eyeline">{admin ? "Writer" : "Reader"}</p>
          <h1 className="display mt-1 truncate text-4xl sm:text-5xl">
            Hello, <span className="accent text-5xl sm:text-6xl">{(me.name || "friend").split(" ")[0]}</span>
          </h1>
          {me.email && <p className="mt-1 truncate text-sm text-muted">{me.email}</p>}
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3" data-reveal>
        {cards.map(c => (
          <div key={c.label} className="card p-6">
            <c.icon className="h-5 w-5 text-brand" />
            <p className="display mt-4 text-4xl">{c.value}</p>
            <p className="mt-1 text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3" data-reveal>
        {admin && (
          <Link href="/blogs/new" className="btn btn-primary">
            <PenLine className="h-4 w-4" /> Write a post
          </Link>
        )}
        <Link href="/blogs" className="btn btn-ghost">
          Read the blog <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/account/settings" className="btn btn-ghost">Profile and sign-in settings</Link>
      </div>

      {admin && s.draftList.length > 0 && (
        <div className="mt-10" data-reveal>
          <p className="eyeline">Your drafts</p>
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
            {s.draftList.map(d => (
              <li key={d.slug}>
                <Link href={`/blogs/edit/${d.slug}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-brand-soft">
                  <span className="truncate font-medium">{d.title}</span>
                  <span className="chip shrink-0 bg-line text-muted">Continue editing</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!admin && (
        <p className="mt-8 max-w-xl text-sm leading-relaxed text-muted">
          Your account can like, comment and share. Publishing is limited to writers; an existing administrator can promote you from the People tab.
        </p>
      )}
    </section>
  )
}
