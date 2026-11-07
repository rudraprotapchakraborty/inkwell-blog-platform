"use client"

import { useEffect, useRef, useState } from "react"
import { useT, useLocale, formatDateForLocale, type Locale } from "@/lib/i18n"
import { blogPostMessages } from "@/lib/i18n/messages/blogPost"
import { commonMessages } from "@/lib/i18n/messages/common"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { blogMarkdownComponents } from "@/lib/blog-markdown"
import { normalizeBlogMarkdown } from "@/lib/blog-markdown-normalize"
import BlogKeyTakeaways from "@/components/blog/BlogKeyTakeaways"
import BlogSeoLinks from "@/components/blog/BlogSeoLinks"
import BlogComments from "@/components/blog/BlogComments"
import BlogCardActions from "@/components/blog/BlogCardActions"
import { EMPTY_ENGAGEMENT, type BlogEngagement } from "@/lib/blog-engagement-shared"
import { getVisitorId } from "@/lib/visitor-id"
import type { BlogRecord } from "@/lib/blog-db"
import { ArrowLeft, Clock, Calendar, User, Tag, Pencil, Trash2, Eye } from "lucide-react"
import { LogoSpinner } from "@/components/ui/LogoSpinner"
import type { BlogSite } from "@/lib/blog-metadata"
import { Monogram } from "@/app/blogs/JournalParts"
import ConfirmDialog from "@/components/ConfirmDialog"
import toast from "react-hot-toast"

const cfg = { base: "/blogs", api: "/api/blogs" } as const

/** Monogram for a writer's avatar: up to two initials. */
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

function formatDate(dateStr: string, locale: Locale) {
  return formatDateForLocale(dateStr, locale, { month: "long", day: "numeric", year: "numeric" })
}

export default function BlogPostClient({
  slug,
  initialBlog,
  site = "inkwell",
}: {
  slug: string
  initialBlog?: BlogRecord
  site?: BlogSite
}) {
  const t = useT(blogPostMessages)
  const tc = useT(commonMessages)
  const locale = useLocale()
  const [blog, setBlog] = useState<BlogRecord | null>(initialBlog ?? null)
  const [loading, setLoading] = useState(!initialBlog)
  const [notFound, setNotFound] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [engagement, setEngagement] = useState<BlogEngagement | null>(null)
  const [visitorId, setVisitorId] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const viewRequest = useRef<{ id: string; done: Promise<void> } | null>(null)
  const router = useRouter()

  /**
   * Counts one view per post, then loads the tallies.
   *
   * The view POST is kept in a ref so React's double-invoked effects fire it
   * only once, while the counts fetch re-runs on every invocation — guarding
   * both with the same ref would let the cancelled first run claim it and
   * leave the second with nothing to do. Awaiting the stored promise still
   * guarantees the counts include the view just recorded.
   */
  useEffect(() => {
    const id = blog?._id
    if (!id) return

    if (viewRequest.current?.id !== id) {
      viewRequest.current = {
        id,
        done: fetch(`/api/blogs/${id}/view`, { method: "POST" }).then(() => {}, () => {}),
      }
    }

    let cancelled = false
    const vid = getVisitorId()
    setVisitorId(vid)

    viewRequest.current.done
      .then(() => fetch(`/api/blogs/engagement?ids=${id}&visitorId=${vid}`))
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data && !cancelled) setEngagement(data[id] ?? EMPTY_ENGAGEMENT) })
      .catch(() => {})

    return () => { cancelled = true }
  }, [blog?._id])

  useEffect(() => {
    if (!initialBlog) {
      fetch(`${cfg.api}/${slug}`)
        .then(r => {
          if (!r.ok) { setNotFound(true); setLoading(false); return null }
          return r.json()
        })
        .then(data => { if (data) setBlog(data); setLoading(false) })
        .catch(() => { setNotFound(true); setLoading(false) })
    }

    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.role === "admin") setIsAdmin(true) })
      .catch(() => {})
  }, [slug, initialBlog])

  async function handleDelete() {
    if (!blog) return
    setDeleting(true)
    const res = await fetch(`${cfg.api}/${blog._id}`, { method: "DELETE" }).catch(() => null)
    if (res?.ok) {
      toast.success("Post deleted")
      router.push(cfg.base)
      router.refresh()
    } else {
      setDeleting(false)
      setConfirmingDelete(false)
      toast.error("Could not delete the post")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-flow-bg flex items-center justify-center">
        <LogoSpinner size={56} />
      </div>
    )
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-flow-bg flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="font-bold text-2xl sm:text-3xl text-flow-text">{t("notFound")}</h1>
        <Link href={cfg.base} className="text-sm font-semibold" style={{ color: "rgb(var(--accent-1))" }}>{t("backToBlogs")}</Link>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-paper">
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this post?"
          message={t("confirmDelete")}
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
      <BlogPostView
        blog={blog}
        site={site}
        views={engagement?.views}
        adminActions={
          isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                href={`${cfg.base}/edit/${blog.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgb(var(--accent-1) / 0.1)", color: "rgb(var(--accent-1))" }}
              >
                <Pencil size={12} /> {t("edit")}
              </Link>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgb(239 68 68 / 0.1)", color: "rgb(239 68 68)" }}
              >
                <Trash2 size={12} /> {t("delete")}
              </button>
            </div>
          )
        }
      >
        {/* Like / comment / share bar, sitting directly above the comments. */}
        {engagement && (
          <div className="mt-10 sm:mt-12">
            <BlogCardActions
              blogId={blog._id}
              slug={blog.slug}
              title={blog.title}
              visitorId={visitorId}
              engagement={engagement}
              onEngagementChange={(_, next) => setEngagement(next)}
              size="page"
              site={site}
            />
          </div>
        )}

        <BlogComments blogId={blog._id} />

        {/* Back link */}
        <div className="mt-10 sm:mt-12 pt-5 sm:pt-6" style={{ borderTop: "1px solid var(--flow-border)" }}>
          <Link
            href={cfg.base}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: "rgb(var(--accent-1))" }}
          >
            <ArrowLeft size={14} />
            {t("backToAll")}
          </Link>
        </div>
      </BlogPostView>
    </main>
  )
}

/** The parts of a post the page shows — also all the editor's preview has before saving. */
export type BlogPostViewData = Pick<
  BlogRecord,
  "title" | "excerpt" | "content" | "category" | "tags" | "author" | "authors" | "readTime" | "createdAt" | "inboundLinks" | "outboundLinks"
> & Partial<Pick<BlogRecord, "writerAvatars" | "keyTakeaways" | "coverImage">>

/**
 * The post itself: hero, breadcrumb bar, body, writers and tags. The
 * post page and both editors' previews render this one component, so the
 * preview is the page. Extras (engagement, comments) come in as children.
 */
export function BlogPostView({
  blog,
  site = "inkwell",
  views,
  adminActions,
  heroClassName = "pt-24 sm:pt-28",
  structuredData = true,
  children,
}: {
  blog: BlogPostViewData
  site?: BlogSite
  views?: number
  adminActions?: React.ReactNode
  /** Top padding of the hero; the page clears the fixed navbar. */
  heroClassName?: string
  structuredData?: boolean
  children?: React.ReactNode
}) {
  const t = useT(blogPostMessages)
  const tc = useT(commonMessages)
  const locale = useLocale()
  const writers = blog.authors?.length ? blog.authors : [blog.author]

  return (
    <>
      {/* Hero */}
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 ${heroClassName} pb-4`}>
        <div
        >
          <h1
            className="page-enter font-bold text-flow-text leading-tight mb-4"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)" }}
          >
            {blog.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm" style={{ color: "rgb(var(--flow-text-soft))" }}>
            <span className="flex items-center gap-1.5"><User size={12} />{blog.author}</span>
            <span className="flex items-center gap-1.5"><Clock size={12} />{blog.readTime}</span>
            <span className="flex items-center gap-1.5"><Calendar size={12} />{formatDate(blog.createdAt, locale)}</span>
            {views !== undefined && (
              <span className="flex items-center gap-1.5"><Eye size={12} />{views.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>

      {blog.coverImage && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blog.coverImage} alt="" className="aspect-[16/9] w-full rounded-3xl object-cover ring-1 ring-line" />
        </div>
      )}

      {/* Action bar */}
      <div
        className="relative z-20 border-b"
        style={{ background: "var(--flow-card-strong)", borderColor: "var(--flow-border)", backdropFilter: "blur(16px)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <Breadcrumbs
            className="eyeline flex-1 py-1"
            structuredData={structuredData}
            items={[{ label: tc("breadcrumb.blogs"), href: cfg.base }, { label: blog.title }]}
          />

          {adminActions}
        </div>
      </div>

      {/* Article content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Excerpt */}
        {blog.excerpt && (
          <p
            className="text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 font-medium"
            style={{ color: "rgb(var(--flow-text-soft))", borderLeft: "3px solid rgb(var(--accent-1))", paddingLeft: "1.25rem" }}
          >
            {blog.excerpt}
          </p>
        )}

        {/* Key takeaways */}
        {blog.keyTakeaways && blog.keyTakeaways.length > 0 && (
          <div
          >
            <BlogKeyTakeaways items={blog.keyTakeaways} title={t("keyTakeaways")} />
          </div>
        )}

        {/* Content */}
        <div
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={blogMarkdownComponents}>
            {normalizeBlogMarkdown(blog.content)}
          </ReactMarkdown>
        </div>

        <BlogSeoLinks
          inboundLinks={blog.inboundLinks}
          outboundLinks={blog.outboundLinks}
          inboundTitle={t("seo.inbound")}
          outboundTitle={t("seo.outbound")}
        />

        {/* Written by */}
        <div
          className="mt-10 sm:mt-12 pt-6 sm:pt-8"
          style={{ borderTop: "1px solid var(--flow-border)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgb(var(--flow-text-soft))" }}>
            {t("writtenBy")}
          </p>
          <div className="flex flex-col gap-3">
            {writers.map(writer => (
              <div key={writer} className="flex items-center gap-3">
                {/* An admin writer's own picture; initials for anyone else. */}
                {blog.writerAvatars?.[writer] ? (
                  <Monogram name={writer} src={blog.writerAvatars[writer]} size={40} />
                ) : (
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, rgb(var(--accent-1)), rgb(var(--accent-2)))" }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 900, color: "white" }}>{initials(writer)}</span>
                  </div>
                )}
                <p className="text-sm font-semibold text-flow-text">{writer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 mt-10 sm:mt-12 pt-6 sm:pt-8"
            style={{ borderTop: "1px solid var(--flow-border)" }}
          >
            <Tag size={13} style={{ color: "rgb(var(--flow-text-soft))" }} />
            {blog.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: "rgb(var(--accent-1) / 0.08)", color: "rgb(var(--accent-1))" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {children}
      </div>
    </>
  )
}
