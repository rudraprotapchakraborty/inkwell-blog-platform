"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "@/lib/motion"
import { Check, Eye, Heart, MessageCircle, Share2, X as CloseIcon } from "lucide-react"

/** lucide dropped its brand icons, so the two share tiles carry their own marks. */
const Facebook = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.5V4.4c-.3 0-1.2-.1-2.2-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z"/></svg>
)
const Instagram = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>
)
import { useT } from "@/lib/i18n"
import { blogsMessages } from "@/lib/i18n/messages/blogs"
import { type BlogEngagement, type ShareNetwork } from "@/lib/blog-engagement-shared"
import { getBlogPath, getBlogPostUrl, type BlogSite } from "@/lib/blog-metadata"

/** lucide only ships the pre-rebrand bird, so the X mark is inlined. */
function XMarkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

/** lucide has no WhatsApp glyph. */
function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a11.882 11.882 0 005.683 1.448h.005c6.581 0 11.941-5.359 11.944-11.945A11.86 11.86 0 0020.52 3.45" />
    </svg>
  )
}

function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n)
}

interface BlogCardActionsProps {
  blogId: string
  slug: string
  title: string
  /** "" until the id is read from localStorage in the parent's effect. */
  visitorId: string
  engagement: BlogEngagement
  onEngagementChange: (blogId: string, next: BlogEngagement) => void
  /**
   * `card` suits the tight blog-grid tile; `page` scales the controls up for
   * the full-width column on a post page.
   */
  size?: "card" | "page"
  /** Which blog section the post belongs to — decides the canonical share URL. */
  site?: BlogSite
  /**
   * When set, Comment expands an inline thread in place instead of deep-linking
   * to the post page — the feed passes this, the post page does not.
   */
  onToggleComments?: () => void
  /** Drives `aria-expanded` on the Comment button when it toggles inline. */
  commentsOpen?: boolean
}

export default function BlogCardActions({
  blogId,
  slug,
  title,
  visitorId,
  engagement,
  onEngagementChange,
  size = "card",
  site = "inkwell",
  onToggleComments,
  commentsOpen,
}: BlogCardActionsProps) {
  const t = useT(blogsMessages)
  const [shareOpen, setShareOpen] = useState(false)
  const [liking, setLiking] = useState(false)

  /**
   * The canonical public URL, never `window.location.origin` — otherwise a
   * share from localhost or a preview deploy sends out a link nobody else can
   * open, and no crawler can fetch for a preview card.
   */
  const shareUrl = getBlogPostUrl(slug, site)

  async function handleLike() {
    if (!visitorId || liking) return
    setLiking(true)
    // Optimistic — the server response replaces this with the authoritative count.
    const optimistic = {
      ...engagement,
      liked: !engagement.liked,
      likes: Math.max(0, engagement.likes + (engagement.liked ? -1 : 1)),
    }
    onEngagementChange(blogId, optimistic)
    try {
      const res = await fetch(`/api/blogs/${blogId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      })
      if (!res.ok) throw new Error("like failed")
      const data = await res.json()
      onEngagementChange(blogId, { ...optimistic, likes: data.likes, liked: data.liked })
    } catch {
      onEngagementChange(blogId, engagement)
    }
    setLiking(false)
  }

  /** Fire-and-forget: a failed tally must never block the share itself. */
  async function handleShared(network: ShareNetwork) {
    onEngagementChange(blogId, { ...engagement, shares: engagement.shares + 1 })
    try {
      const res = await fetch(`/api/blogs/${blogId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network }),
      })
      if (!res.ok) return
      const data = await res.json()
      onEngagementChange(blogId, { ...engagement, shares: data.shares })
    } catch {}
  }

  const commentsHref = `${getBlogPath(site)}/${slug}#comments`

  /**
   * On a blog card this link navigates to the post. On the post page itself the
   * section is already in the document, where navigating to the current URL is
   * a no-op — so scroll to it instead.
   */
  function handleCommentClick(e: React.MouseEvent) {
    // In a feed the thread lives under this very card — never navigate away.
    if (onToggleComments) {
      e.preventDefault()
      onToggleComments()
      return
    }
    const section = document.getElementById("comments")
    if (!section) return
    e.preventDefault()
    // No `behavior` — `html { scroll-behavior: smooth }` in globals.css drives
    // this, and correctly falls back to instant under prefers-reduced-motion.
    section.scrollIntoView({ block: "start" })
  }

  const isPage = size === "page"
  const icon = isPage ? 18 : 14
  const countsIcon = isPage ? 15 : 12

  const actionBtn =
    "flex-1 inline-flex items-center justify-center rounded-lg font-semibold " +
    "transition-colors hover:bg-black/[0.05] dark:hover:bg-white/[0.07] " +
    (isPage ? "gap-2 py-3 text-sm" : "gap-1.5 py-2 text-[11px]")

  const hasCounts =
    engagement.likes > 0 || engagement.comments > 0 || engagement.shares > 0 || engagement.views > 0

  return (
    <div className="pt-3" style={{ borderTop: "1px solid var(--flow-border)" }}>
      {/* Count summary above the divider, Facebook-style. On the post page it
          hides while empty; in the feed it keeps its line either way, so a post
          with counts is no taller than its neighbours in the grid. */}
      {(hasCounts || !isPage) && (
        <div
          aria-hidden={!hasCounts || undefined}
          className={`flex items-center justify-between gap-2 pb-2 ${isPage ? "text-[13px]" : "min-h-[25px] text-[11px]"}`}
          style={{ color: "rgb(var(--flow-text-soft))" }}
        >
          {engagement.likes > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-flex items-center justify-center rounded-full"
                style={{ width: isPage ? 19 : 15, height: isPage ? 19 : 15, background: "rgb(244 63 94)", color: "#fff" }}
                aria-hidden="true"
              >
                <Heart size={isPage ? 10 : 8} fill="currentColor" />
              </span>
              {t(engagement.likes === 1 ? "likeCountOne" : "likesCount", { count: compact(engagement.likes) })}
            </span>
          ) : <span />}

          <span className="inline-flex items-center gap-3 shrink-0">
            {engagement.comments > 0 && (
              <Link
                href={commentsHref}
                onClick={handleCommentClick}
                className="hover:underline"
                style={{ color: "inherit" }}
              >
                {t(engagement.comments === 1 ? "commentCountOne" : "commentsCount", { count: compact(engagement.comments) })}
              </Link>
            )}
            {engagement.shares > 0 && (
              <span>
                {t(engagement.shares === 1 ? "shareCountOne" : "sharesCount", { count: compact(engagement.shares) })}
              </span>
            )}
            {engagement.views > 0 && (
              <span
                className="inline-flex items-center gap-1"
                title={t(engagement.views === 1 ? "viewCountOne" : "viewsCount", { count: compact(engagement.views) })}
              >
                <Eye size={countsIcon} />
                {compact(engagement.views)}
              </span>
            )}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 pt-1" style={{ borderTop: "1px solid var(--flow-border)" }}>
        <button
          onClick={handleLike}
          disabled={!visitorId}
          className={actionBtn}
          style={{ color: engagement.liked ? "rgb(244 63 94)" : "rgb(var(--flow-text-soft))" }}
          aria-pressed={engagement.liked}
          title={t("like")}
        >
          <motion.span
            key={String(engagement.liked)}
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="inline-flex"
          >
            <Heart size={icon} fill={engagement.liked ? "currentColor" : "none"} />
          </motion.span>
          {t("like")}
        </button>

        {/* Deep-links to the post's comment section rather than opening a dialog. */}
        <Link
          href={commentsHref}
          onClick={handleCommentClick}
          className={actionBtn}
          style={{ color: commentsOpen ? "rgb(var(--accent-1))" : "rgb(var(--flow-text-soft))" }}
          title={t("comment")}
          aria-expanded={onToggleComments ? Boolean(commentsOpen) : undefined}
        >
          <MessageCircle size={icon} fill={commentsOpen ? "currentColor" : "none"} />
          {t("comment")}
        </Link>

        <button
          onClick={() => setShareOpen(true)}
          className={actionBtn}
          style={{ color: "rgb(var(--flow-text-soft))" }}
          title={t("share")}
        >
          <Share2 size={icon} />
          {t("share")}
        </button>
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        title={title}
        onShared={handleShared}
      />
    </div>
  )
}

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  url: string
  title: string
  onShared: (network: ShareNetwork) => void
}

function ShareDialog({ open, onClose, url, title, onShared }: ShareDialogProps) {
  const t = useT(blogsMessages)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  async function handleCopy(network: ShareNetwork) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
      onShared(network)
    } catch {}
  }

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const targets = [
    {
      name: "Facebook",
      network: "facebook" as const,
      Icon: Facebook,
      background: "#1877F2",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      // Instagram has no web share intent, so its tile copies the link instead.
      name: "Instagram",
      network: "instagram" as const,
      Icon: Instagram,
      background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
      href: null,
    },
    {
      name: "X",
      network: "x" as const,
      Icon: XMarkIcon,
      background: "#000000",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "WhatsApp",
      network: "whatsapp" as const,
      Icon: WhatsAppIcon,
      background: "#25D366",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
  ]

  const tile = "flex flex-col items-center gap-2 shrink-0 transition-transform hover:-translate-y-0.5"
  const circle = "inline-flex items-center justify-center rounded-full text-white"
  const circleSize = { width: 56, height: 56 }

  if (!mounted) return null

  // Portalled: the card sits inside a transformed motion.article, which would
  // otherwise become the containing block for `position: fixed`.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t("share")}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
            style={{
              background: "var(--flow-card-strong, rgb(var(--flow-bg)))",
              border: "1px solid var(--flow-border-strong)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="font-bold text-flow-text text-lg">{t("share")}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                style={{ color: "rgb(var(--flow-text))" }}
                aria-label={t("close")}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="flex items-start gap-4 sm:gap-5 overflow-x-auto pb-2 mb-5">
              {targets.map(({ name, network, Icon, background, href }) =>
                href ? (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onShared(network)}
                    className={tile}
                  >
                    <span className={circle} style={{ ...circleSize, background }}>
                      <Icon size={24} />
                    </span>
                    <span className="text-[11px] font-medium text-flow-text">{name}</span>
                  </a>
                ) : (
                  <button key={name} onClick={() => handleCopy(network)} className={tile} title={t("shareInstagram")}>
                    <span className={circle} style={{ ...circleSize, background }}>
                      <Icon size={24} />
                    </span>
                    <span className="text-[11px] font-medium text-flow-text">{name}</span>
                  </button>
                )
              )}
            </div>

            <div
              className="flex items-center gap-2 rounded-xl p-1.5 pl-3"
              style={{ border: "1px solid var(--flow-border-strong)", background: "rgb(var(--flow-border) / 0.4)" }}
            >
              <input
                readOnly
                value={url}
                onFocus={e => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-transparent text-xs outline-none text-flow-text"
                aria-label={t("copyLink")}
              />
              <button
                onClick={() => handleCopy("copy")}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all"
                style={{ background: copied ? "rgb(34 197 94)" : "rgb(var(--accent-1))" }}
              >
                {copied && <Check size={13} />}
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
