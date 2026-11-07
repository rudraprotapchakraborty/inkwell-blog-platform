"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useT, useLocale, formatDateForLocale, type Locale } from "@/lib/i18n"
import { blogsMessages } from "@/lib/i18n/messages/blogs"
import { commonMessages } from "@/lib/i18n/messages/common"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { motion, AnimatePresence, useReducedMotion } from "@/lib/motion"
import Link from "next/link"
import { Clock, Plus } from "lucide-react"
import BlogCardActions from "@/components/blog/BlogCardActions"
import BlogComments from "@/components/blog/BlogComments"
import { EMPTY_ENGAGEMENT, type BlogEngagement } from "@/lib/blog-engagement-shared"
import { getVisitorId } from "@/lib/visitor-id"
import { cn } from "@/lib/utils"
import ConfirmDialog from "@/components/ConfirmDialog"
import toast from "react-hot-toast"
import { ButtonLink, EASE, Meta } from "@/app/components/editorial"
import { JournalCover, Monogram, PostActions } from "./JournalParts"

export interface Blog {
  _id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string
  category: string
  tags: string[]
  author: string
  readTime: string
  published: boolean
  createdAt: string
  /** Account that wrote the post. Absent on posts saved before ownership existed. */
  authorId?: string
  /** The owner's profile picture, attached by the API when the account has one. */
  authorAvatar?: string
}

/** How many posts render before the scroll sentinel pulls in the next batch. */
const PAGE_SIZE = 9

/**
 * How many columns the feed shows: 1, 2 from md, 3 from lg — Tailwind's
 * breakpoints, matching the grid classes. Null until mounted, as the server
 * can't know the viewport.
 */
function useColumnCount(): number | null {
  const [columns, setColumns] = useState<number | null>(null)
  useEffect(() => {
    const md = window.matchMedia("(min-width: 768px)")
    const lg = window.matchMedia("(min-width: 1024px)")
    const update = () => setColumns(lg.matches ? 3 : md.matches ? 2 : 1)
    update()
    // Resize too: not every browser fires the media-query change events, and
    // setting the same count again doesn't re-render.
    md.addEventListener("change", update)
    lg.addEventListener("change", update)
    window.addEventListener("resize", update)
    return () => {
      md.removeEventListener("change", update)
      lg.removeEventListener("change", update)
      window.removeEventListener("resize", update)
    }
  }, [])
  return columns
}

function formatDate(dateStr: string, locale: Locale) {
  return formatDateForLocale(dateStr, locale, { month: "short", day: "numeric", year: "numeric" })
}

/**
 * The blog as a journal: a masthead, one ruled row of topics, and the posts
 * as a three-up grid of cards, picture over words. Everything the feed did
 * still works in place: likes, shares, the inline comment thread, owners'
 * edit and delete, and the next batch arriving as you near the end.
 */
/** Who is reading, as the session cookie says on the server. */
export type BlogViewer = { sub: string; name: string; avatar?: string }

/**
 * The two blogs share this page; real estate differs in where its posts live
 * and in its colour, from the `cs-theme-re` wrapper, which turns the page's
 * blue and cyan to gold. On both, only admins write — and any admin may edit
 * or delete any post — so readers get no "write a post" prompt.
 */
const cfg = { base: "/blogs", api: "/api/blogs", site: "inkwell" } as const

export default function BlogsClient({
  initialBlogs,
  initialViewer,
  initialIsAdmin,
}: {
  /** The feed, rendered on the server so posts are in the first paint. */
  initialBlogs: Blog[]
  initialViewer: BlogViewer | null
  initialIsAdmin: boolean
}) {
  const t = useT(blogsMessages)
  const tc = useT(commonMessages)
  const locale = useLocale()
  const still = useReducedMotion() ?? false
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs)
  const [engagement, setEngagement] = useState<Record<string, BlogEngagement>>({})
  const [visitorId, setVisitorId] = useState("")
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin)
  /** Signed-in account, or null when logged out. */
  const [viewer, setViewer] = useState<BlogViewer | null>(initialViewer)
  const [activeCategory, setActiveCategory] = useState("All")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  /**
   * Compact age ("3h", "2d"). Anything older than about a month reads better
   * as a real date than as an ever-growing week count.
   */
  const relativeTime = useCallback(
    (dateStr: string) => {
      const diffMs = Date.now() - new Date(dateStr).getTime()
      if (Number.isNaN(diffMs)) return formatDate(dateStr, locale)
      const mins = Math.floor(diffMs / 60000)
      if (mins < 1) return t("timeJustNow")
      if (mins < 60) return t("timeMinutes", { count: mins })
      const hours = Math.floor(mins / 60)
      if (hours < 24) return t("timeHours", { count: hours })
      const days = Math.floor(hours / 24)
      if (days < 7) return t("timeDays", { count: days })
      const weeks = Math.floor(days / 7)
      if (weeks < 5) return t("timeWeeks", { count: weeks })
      return formatDate(dateStr, locale)
    },
    [locale, t]
  )

  // The feed arrives from the server, already in the HTML. The session it was
  // rendered for is confirmed here, in case it has changed since.
  useEffect(() => {
    setVisitorId(getVisitorId())
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.authenticated) return
      if (d.role === "admin") setIsAdmin(true)
      setViewer({ sub: d.user?.sub ?? "", name: d.username || d.user?.name || "", avatar: d.user?.avatar })
    }).catch(() => {})
  }, [])

  /**
   * Mirrors `canManageBlog` on the server: any admin, any post. The API is the
   * real gate — this only decides whether the menu is worth showing.
   */
  const canManage = useCallback((_blog: Blog) => isAdmin, [isAdmin])

  // One batched request for every post's like/comment counts, re-run once the
  // visitor id is known so the heart can render in its "already liked" state.
  useEffect(() => {
    if (blogs.length === 0) return
    const ids = blogs.map(b => b._id).join(",")
    const query = new URLSearchParams({ ids })
    if (visitorId) query.set("visitorId", visitorId)

    let cancelled = false
    fetch(`/api/blogs/engagement?${query}`)
      .then(r => (r.ok ? r.json() : {}))
      .then(data => { if (!cancelled) setEngagement(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [blogs, visitorId])

  const handleEngagementChange = useCallback((blogId: string, next: BlogEngagement) => {
    setEngagement(prev => ({ ...prev, [blogId]: next }))
  }, [])

  /**
   * Keeps the summary row honest when a comment is posted inline. Returns the
   * previous state untouched when the count already matches, so the thread
   * reporting its count on open cannot churn a re-render of the whole feed.
   */
  const handleCommentCount = useCallback((blogId: string, count: number) => {
    setEngagement(prev => {
      const current = prev[blogId] ?? EMPTY_ENGAGEMENT
      if (current.comments === count) return prev
      return { ...prev, [blogId]: { ...current, comments: count } }
    })
  }, [])

  const toggleComments = useCallback((blogId: string) => {
    setOpenComments(prev => ({ ...prev, [blogId]: !prev[blogId] }))
  }, [])

  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)

  async function confirmDelete() {
    if (!pendingDelete) return
    const { id } = pendingDelete
    setDeletingId(id)
    try {
      const res = await fetch(`${cfg.api}/${id}`, { method: "DELETE" })
      if (res.ok) {
        setBlogs(prev => prev.filter(b => b._id !== id))
        toast.success("Post deleted")
      } else {
        toast.error("Could not delete the post")
      }
    } catch {
      toast.error("Network error. Please try again.")
    }
    setDeletingId(null)
    setPendingDelete(null)
  }

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(blogs.map(b => b.category)))],
    [blogs]
  )
  const filtered = useMemo(
    () => (activeCategory === "All" ? blogs : blogs.filter(b => b.category === activeCategory)),
    [blogs, activeCategory]
  )
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  // Switching topic restarts the feed at the top of the new list.
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [activeCategory])

  /** Infinite scroll — reveal the next batch as the sentinel enters view. */
  useEffect(() => {
    if (!hasMore) return
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) setVisibleCount(c => c + PAGE_SIZE)
      },
      { rootMargin: "400px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, filtered.length])

  const topicCount = Math.max(0, categories.length - 1)
  const canWrite = isAdmin

  const columns = useColumnCount()

  const renderCard = (blog: Blog, i: number) => {
    const author = blog.author || t("brand")
    const commentsOpen = Boolean(openComments[blog._id])
    return (
      <motion.article
        key={blog._id}
        layout={still ? false : "position"}
        initial={still ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        exit={still ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.6, ease: EASE, delay: still ? 0 : (i % PAGE_SIZE) * 0.05 }}
        aria-labelledby={`post-${blog._id}`}
        className="flex min-w-0 flex-col"
      >
        {/* Picture, with an admin's edit / delete pinned to its corner */}
        <div className="relative">
          <Link
            href={`${cfg.base}/${blog.slug}`}
            tabIndex={-1}
            aria-hidden
            className="group relative block aspect-[16/10] overflow-hidden rounded-lg bg-brand-soft ring-1 ring-inset ring-ink/[0.06]"
          >
            {blog.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={blog.coverImage}
                alt=""
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03] motion-reduce:transition-none"
              />
            ) : (
              <JournalCover title={blog.title} brand={t("brand")} />
            )}
          </Link>
          {canManage(blog) && (
            <PostActions
              className="absolute right-2.5 top-2.5 z-10"
              editHref={`${cfg.base}/edit/${blog.slug}`}
              onDelete={() => setPendingDelete({ id: blog._id, title: blog.title })}
              deleting={deletingId === blog._id}
              labels={{ edit: t("edit"), delete: t("delete") }}
            />
          )}
        </div>

        {/* Words */}
        <div className="mt-5 flex items-start justify-between gap-4">
          {/* One line, always: a wrapped meta line would drop this
              card's title below its neighbours'. Read time lives
              in the byline to leave room. */}
          <p className="eyeline flex min-w-0 items-center gap-x-2 whitespace-nowrap text-muted">
            <button
              type="button"
              onClick={() => setActiveCategory(blog.category)}
              className="min-w-0 truncate rounded-sm text-brand transition-colors hover:text-brand-strong"
            >
              {blog.category}
            </button>
            <span aria-hidden className="shrink-0 opacity-50">/</span>
            <time className="shrink-0" dateTime={blog.createdAt} title={formatDate(blog.createdAt, locale)}>
              {relativeTime(blog.createdAt)}
            </time>
          </p>
        </div>

        {/* Fixed slots — two lines of title, three of excerpt —
            however long the copy, so every card in a row
            matches and the bylines line up. */}
        <h2
          id={`post-${blog._id}`}
          className="mt-3 line-clamp-2 font-medium"
          style={{
            fontSize: "clamp(1.3rem, 1.7vw, 1.5rem)",
            lineHeight: 1.12,
            letterSpacing: "-0.035em",
            minHeight: "2.24em",
          }}
        >
          <Link
            href={`${cfg.base}/${blog.slug}`}
            title={blog.title}
            className="rounded-sm text-ink transition-colors duration-200 hover:text-brand"
          >
            {blog.title}
          </Link>
        </h2>

        <p
          className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-muted"
          style={{ minHeight: "4.875em" }}
        >
          {blog.excerpt}
        </p>

        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-ink">
            <Monogram name={author} src={blog.authorAvatar} size={26} />
            <span className="truncate">{author}</span>
          </p>
          {blog.readTime && (
            <p className="eyeline inline-flex shrink-0 items-center gap-1 text-muted">
              <Clock aria-hidden size={11} /> {blog.readTime}
            </p>
          )}
        </div>

        {/* Engagement + inline thread. Cards keep their natural height, so
            opening one grows that card alone and pushes the
            row below down; its neighbours stay as they are. */}
        <div className="pt-6">
          <BlogCardActions
            blogId={blog._id}
            slug={blog.slug}
            title={blog.title}
            site={cfg.site}
            visitorId={visitorId}
            engagement={engagement[blog._id] ?? EMPTY_ENGAGEMENT}
            onEngagementChange={handleEngagementChange}
            onToggleComments={() => toggleComments(blog._id)}
            commentsOpen={commentsOpen}
          />

          <AnimatePresence initial={false}>
            {commentsOpen && (
              <motion.div
                key="thread"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ overflow: "hidden" }}
              >
                <BlogComments blogId={blog._id} variant="feed" onCountChange={handleCommentCount} />
                <div className="flex items-center justify-between gap-3 pt-3">
                  <Link
                    href={`${cfg.base}/${blog.slug}`}
                    className="cs-underline rounded-sm text-[13px] font-semibold text-brand"
                  >
                    {t("readFullPost")} →
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleComments(blog._id)}
                    className="rounded-sm text-[13px] font-semibold text-muted transition-colors hover:text-ink"
                  >
                    {t("hideComments")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>
    )
  }

  return (
    <div className="bg-paper text-ink">
      {pendingDelete && (
        <ConfirmDialog
          title="Delete this post?"
          message={t("confirmDelete", { title: pendingDelete.title })}
          busy={deletingId === pendingDelete.id}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {/* ─── Masthead ─── */}
      <header className="pt-4">
        <div className="frame">
          <div
            className="cs-enter eyeline flex items-center justify-between gap-6 border-b border-ink/10 pb-4 text-muted"
          >
            <Breadcrumbs
              items={[{ label: tc("breadcrumb.blogs") }]}
            />
            <p className="tabular-nums">
              {blogs.length} {t("postsLabel")} <span aria-hidden className="mx-1.5 opacity-50">·</span> {topicCount}{" "}
              {t("topicsLabel")}
            </p>
          </div>

          <div className="grid gap-y-6 pb-8 pt-8 sm:pt-10 lg:grid-cols-12 lg:gap-x-8 lg:pb-10 lg:pt-12">
            <div className="lg:col-span-8">
              <h1 className="overflow-hidden pb-[0.08em]">
                <span
                  className="cs-rise cs-display block text-ink"
                  style={{ animationDelay: "0.05s", fontSize: "clamp(2.4rem, 5vw, 4.5rem)", lineHeight: 0.98, letterSpacing: "-0.05em" }}
                >
                  {t("title")}
                </span>
              </h1>
              <p
                style={{ animationDelay: "0.25s" }}
                className="cs-glide lede mt-4 max-w-[36rem] text-muted"
              >
                {t("subtitle")}
              </p>
            </div>

            {/* Posting is for admins only; readers like, comment and share. */}
            <div
              style={{ animationDelay: "0.35s" }}
              className="cs-enter flex items-end lg:col-span-4 lg:justify-end"
            >
              {viewer && isAdmin && (
                <Link
                  href={`${cfg.base}/new`}
                  className="group inline-flex items-center gap-1.5 rounded-sm text-[15px] font-semibold text-brand"
                >
                  <Plus aria-hidden className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="cs-underline">{t("newPost")}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Topics ─── */}
      {categories.length > 1 && (
        <nav aria-label={t("categoriesTitle")} className="border-y border-ink/10">
          <div className="frame">
            <ul className="-mx-2 flex flex-wrap gap-x-1 gap-y-1 py-3">
              {categories.map(cat => {
                const active = activeCategory === cat
                return (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      aria-pressed={active}
                      className={cn(
                        "relative rounded-md px-2.5 py-2 text-sm font-medium tracking-[-0.01em] transition-colors duration-200",
                        active ? "text-ink" : "text-muted hover:text-ink"
                      )}
                    >
                      {cat === "All" ? t("categoryAll") : cat}
                      {active && (
                        <motion.span
                          layoutId="journal-topic"
                          aria-hidden
                          className="absolute inset-x-2.5 bottom-0.5 h-[2px] rounded-full bg-brand"
                          transition={still ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </nav>
      )}

      {/* ─── Feed: a three-up grid of cards ─── */}
      <div className="frame pb-24 pt-8 lg:pb-32">
        <section aria-label={t("title")} className="min-w-0">
          {filtered.length === 0 && (
            <div className="border-t border-ink/10 py-20">
              <Meta>{t("emptyTitle")}</Meta>
              <p className="cs-h3 mt-6 max-w-[28rem] text-ink">{canWrite ? t("emptyAdmin") : t("emptyPublic")}</p>
              {canWrite && (
                <div className="mt-8">
                  <ButtonLink href={`${cfg.base}/new`}>{t("writeFirst")}</ButtonLink>
                </div>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <>
              {/* Each column is its own stack, so opening one card's comments
                  pushes down only the cards beneath it. Until the browser
                  knows the column count, the server's plain grid stands in;
                  closed cards are all one height, so the swap doesn't move
                  anything. Cards are dealt across in reading order. */}
              {columns ? (
                <div className="grid items-start gap-x-8 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: columns }, (_, column) => (
                    <div key={column} className="flex min-w-0 flex-col gap-y-14">
                      <AnimatePresence initial={false}>
                        {visible.map((blog, i) => (i % columns === column ? renderCard(blog, i) : null))}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid items-start gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence initial={false}>{visible.map(renderCard)}</AnimatePresence>
                </div>
              )}

              {/*
                Scrolling past this pulls in the next batch. The button is a
                real fallback, not decoration — if IntersectionObserver never
                fires, it keeps the rest of the feed reachable.
              */}
              {hasMore && (
                <div ref={sentinelRef} className="mt-14 flex justify-center border-t border-ink/10 py-10">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="inline-flex h-11 items-center gap-2.5 rounded-[10px] border border-ink/15 px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/35"
                  >
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/15 border-t-brand motion-reduce:animate-none"
                    />
                    {t("loadMore")}
                  </button>
                </div>
              )}
              {!hasMore && filtered.length > PAGE_SIZE && (
                <p className="eyeline mt-14 border-t border-ink/10 py-10 text-center text-muted">{t("allCaughtUp")}</p>
              )}
            </>
          )}
        </section>

      </div>
    </div>
  )
}
