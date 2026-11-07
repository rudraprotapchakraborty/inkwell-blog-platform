"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, Pencil, Send, Trash2, X } from "lucide-react"
import { useT, useLocale, formatDateForLocale } from "@/lib/i18n"
import { blogsMessages } from "@/lib/i18n/messages/blogs"
import { useAuthUser } from "@/components/auth/use-auth-user"
import { MAX_COMMENT_LENGTH, type BlogComment } from "@/lib/blog-engagement-shared"
import { LogoSpinner } from "@/components/ui/LogoSpinner"

interface BlogCommentsProps {
  blogId: string
  /**
   * `page` is the standalone section on a post page — anchored at `#comments`
   * so a card's Comment button can deep-link to it. `feed` is the compact
   * thread that expands inside a feed post, where the `#comments` id would be
   * duplicated across every post in the list and the anchor scroll is wrong.
   */
  variant?: "page" | "feed"
  /** Lets the feed keep its cached comment tally in step with new posts. */
  onCountChange?: (blogId: string, count: number) => void
}

/**
 * Comment section for a blog post.
 *
 * Commenting requires an account: the comment is attributed to it, and it is
 * what lets an author delete their own comment later. Whether a given comment
 * may be deleted is decided by the server and arrives as `canDelete`, so the
 * browser is never handed other people's user ids to compare against.
 */
export default function BlogComments({
  blogId,
  variant = "page",
  onCountChange,
}: BlogCommentsProps) {
  const t = useT(blogsMessages)
  const locale = useLocale()
  const pathname = usePathname()
  const { user } = useAuthUser()
  const isFeed = variant === "feed"

  const [comments, setComments] = useState<BlogComment[] | null>(null)
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")
  /** Id of the comment open for editing, and the working copy of its text. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const didAnchorScroll = useRef(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments`)
      setComments(res.ok ? await res.json() : [])
    } catch {
      setComments([])
    }
  }, [blogId])

  useEffect(() => { load() }, [load])

  /**
   * `canDelete` is resolved per caller, so a thread fetched while signed out
   * carries none. Re-fetch when the session appears or changes, otherwise the
   * delete buttons stay missing until a reload.
   */
  useEffect(() => {
    if (comments !== null) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sub])

  /**
   * Deep links from a blog card arrive as `/blogs/<slug>#comments`. The native
   * anchor jump fires before the article body and this list have rendered, so
   * it lands short — scroll once the comments are in and the layout is final.
   */
  useEffect(() => {
    if (isFeed || didAnchorScroll.current || comments === null) return
    if (window.location.hash !== "#comments") return
    didAnchorScroll.current = true
    // `html { scroll-behavior: smooth }` in globals.css drives the easing.
    sectionRef.current?.scrollIntoView({ block: "start" })
  }, [comments, isFeed])

  /**
   * Report the comment count to the feed as a side effect, never during render.
   * Also fires once the list first loads, which corrects the card's cached
   * tally when a thread is opened.
   */
  useEffect(() => {
    if (comments) onCountChange?.(blogId, comments.length)
  }, [comments, blogId, onCountChange])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || posting || !user) return

    setPosting(true)
    setError("")
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) throw new Error("post failed")
      const created: BlogComment = await res.json()
      // The parent is told the new count by the effect above, not from inside
      // this updater — an updater must stay pure, and React may run it during
      // render, which would set state on the parent mid-render.
      setComments(prev => [created, ...(prev ?? [])])
      setText("")
    } catch {
      setError(t("commentFailed"))
    }
    setPosting(false)
  }

  /** Optimistic: the row goes immediately and comes back if the server refuses. */
  async function handleDelete(comment: BlogComment) {
    if (!window.confirm(t("confirmDeleteComment"))) return

    const previous = comments
    setComments(prev => (prev ?? []).filter(c => c._id !== comment._id))
    setError("")
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments/${comment._id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("delete failed")
    } catch {
      setComments(previous)
      setError(t("deleteCommentFailed"))
    }
  }

  function startEdit(comment: BlogComment) {
    setEditingId(comment._id)
    setDraft(comment.text)
    setError("")
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft("")
  }

  async function saveEdit(comment: BlogComment) {
    const trimmed = draft.trim()
    if (!trimmed || savingEdit) return
    // Nothing typed but the same text — close without a pointless write, which
    // also avoids stamping an "edited" marker on an unchanged comment.
    if (trimmed === comment.text) return cancelEdit()

    setSavingEdit(true)
    setError("")
    try {
      const res = await fetch(`/api/blogs/${blogId}/comments/${comment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) throw new Error("edit failed")
      const updated: BlogComment = await res.json()
      setComments(prev => (prev ?? []).map(c => (c._id === updated._id ? updated : c)))
      cancelEdit()
    } catch {
      setError(t("editCommentFailed"))
    }
    setSavingEdit(false)
  }

  const fieldStyle = {
    background: "rgb(var(--flow-border) / 0.5)",
    border: "1px solid var(--flow-border-strong)",
  }
  const avatarGradient = "linear-gradient(135deg, rgb(var(--accent-1)), rgb(var(--accent-2)))"
  // In a feed that is the listing itself — either blog — not always /blogs.
  const from = encodeURIComponent(isFeed ? pathname : `${pathname}#comments`)

  /**
   * The inline editor that replaces a comment's body while it is being edited.
   * Shared by both variants so the two never drift apart.
   */
  const editForm = (comment: BlogComment) => (
    <div className="flex flex-col gap-2 mt-1">
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        maxLength={MAX_COMMENT_LENGTH}
        rows={isFeed ? 2 : 3}
        autoFocus
        className={`w-full outline-none resize-y text-flow-text ${isFeed ? "px-3 py-2 rounded-2xl text-[13px]" : "px-3.5 py-2.5 rounded-xl text-sm"}`}
        style={fieldStyle}
      />
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => saveEdit(comment)}
          disabled={savingEdit || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: avatarGradient }}
        >
          <Check size={12} />
          {t("saveComment")}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors"
          style={{ color: "rgb(var(--flow-text-soft))" }}
        >
          <X size={12} />
          {t("cancelEdit")}
        </button>
      </span>
    </div>
  )

  /** Edit (author only) and Delete (author or admin) for one comment. */
  const rowActions = (comment: BlogComment) => (
    <>
      {comment.canEdit && (
        <button
          type="button"
          onClick={() => startEdit(comment)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
          style={{ color: "rgb(var(--flow-text-soft))" }}
        >
          <Pencil size={11} />
          {t("editComment")}
        </button>
      )}
      {comment.canDelete && (
        <button
          type="button"
          onClick={() => handleDelete(comment)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
          style={{ color: "rgb(239 68 68)" }}
        >
          <Trash2 size={11} />
          {t("deleteComment")}
        </button>
      )}
    </>
  )

  /** Posted date, plus an honest marker when the text was changed afterwards. */
  const timestamp = (comment: BlogComment) => (
    <span className="text-[11px]" style={{ color: "rgb(var(--flow-text-soft))" }}>
      {formatDateForLocale(comment.createdAt, locale, { month: "short", day: "numeric", year: "numeric" })}
      {comment.editedAt ? ` · ${t("editedLabel")}` : ""}
    </span>
  )

  /** Shared by the composer and each comment row. */
  const avatar = (name: string, url: string, size: number) =>
    url ? (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className="shrink-0 flex items-center justify-center rounded-full font-bold text-white"
        style={{ width: size, height: size, fontSize: size * 0.36, background: avatarGradient }}
        aria-hidden="true"
      >
        {(name.charAt(0) || "?").toUpperCase()}
      </div>
    )

  return (
    <section
      // A feed renders one of these per post, so the shared anchor id is only
      // safe on the single instance that lives on a post page.
      id={isFeed ? undefined : "comments"}
      ref={sectionRef}
      // Clears the fixed navbar when the page jumps to this anchor.
      style={{
        borderTop: "1px solid var(--flow-border)",
        scrollMarginTop: isFeed ? undefined : 96,
      }}
      className={isFeed ? "mt-3 pt-3" : "mt-8 pt-6 sm:pt-8"}
    >
      {!isFeed && (
        <h2 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgb(var(--flow-text-soft))" }}>
          {t("commentsTitle")}
          {comments && comments.length > 0 && ` (${comments.length})`}
        </h2>
      )}

      {user ? (
        <form
          onSubmit={handleSubmit}
          className={isFeed ? "flex flex-col gap-2 mb-4" : "flex flex-col gap-2.5 mb-8"}
        >
          <div className="flex items-start gap-2.5">
            {avatar(user.name || "", user.avatar || "", isFeed ? 30 : 36)}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              rows={isFeed ? 1 : 4}
              placeholder={t("writeComment")}
              required
              className={`w-full outline-none resize-y text-flow-text ${isFeed ? "px-3 py-2 rounded-2xl text-[13px] min-h-[38px]" : "px-3.5 py-2.5 rounded-xl text-sm"}`}
              style={fieldStyle}
            />
            {isFeed && (
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="shrink-0 inline-flex items-center justify-center rounded-full text-white transition-all disabled:opacity-40"
                style={{ width: 38, height: 38, background: avatarGradient }}
                aria-label={t("postComment")}
              >
                <Send size={15} />
              </button>
            )}
          </div>
          {error && <p className="text-xs" style={{ color: "rgb(239 68 68)" }}>{error}</p>}
          {!isFeed && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: avatarGradient }}
              >
                <Send size={14} />
                {posting ? t("posting") : t("postComment")}
              </button>
              <span className="text-xs" style={{ color: "rgb(var(--flow-text-soft))" }}>
                {t("commentingAs", { name: user.name || "" })}
              </span>
            </div>
          )}
        </form>
      ) : (
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl ${isFeed ? "px-3 py-2.5 mb-4" : "px-4 py-3.5 mb-8"}`}
          style={fieldStyle}
        >
          <span className={`${isFeed ? "text-[13px]" : "text-sm"}`} style={{ color: "rgb(var(--flow-text-soft))" }}>
            {t("signInToComment")}
          </span>
          <span className="flex items-center gap-3">
            <Link
              href={`/login?from=${from}`}
              className={`font-semibold hover:underline ${isFeed ? "text-[13px]" : "text-sm"}`}
              style={{ color: "rgb(var(--accent-1))" }}
            >
              {t("signInToCommentAction")}
            </Link>
            <Link
              href={`/register?from=${from}`}
              className={`font-semibold hover:underline ${isFeed ? "text-[13px]" : "text-sm"}`}
              style={{ color: "rgb(var(--flow-text-soft))" }}
            >
              {t("createAccountAction")}
            </Link>
          </span>
        </div>
      )}

      {!user && error && (
        <p className="text-xs mb-4" style={{ color: "rgb(239 68 68)" }}>{error}</p>
      )}

      {comments === null && (
        <div className="flex justify-center py-6">
          <LogoSpinner size={32} />
        </div>
      )}

      {comments?.length === 0 && (
        <p className="text-sm" style={{ color: "rgb(var(--flow-text-soft))" }}>{t("noComments")}</p>
      )}

      {comments && comments.length > 0 && (
        <ul className={isFeed ? "flex flex-col gap-3" : "flex flex-col gap-5"}>
          {comments.map(c => (
            <li key={c._id} className="group flex gap-2.5">
              {avatar(c.name, c.avatar, isFeed ? 30 : 36)}
              {isFeed ? (
                /* Facebook-style: name and text share one rounded bubble. */
                <div className="min-w-0 flex-1">
                  {editingId === c._id ? (
                    editForm(c)
                  ) : (
                    <>
                      <div
                        className="inline-block max-w-full rounded-2xl px-3 py-2"
                        style={{ background: "rgb(var(--flow-border) / 0.5)" }}
                      >
                        <span className="block text-[13px] font-bold text-flow-text">{c.name}</span>
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-flow-text">
                          {c.text}
                        </p>
                      </div>
                      <span className="flex items-center gap-3 mt-1 ml-3">
                        {timestamp(c)}
                        {rowActions(c)}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-bold text-flow-text">{c.name}</span>
                    {timestamp(c)}
                    {editingId !== c._id && (
                      <span className="ml-auto flex items-center gap-3">{rowActions(c)}</span>
                    )}
                  </div>
                  {editingId === c._id ? (
                    editForm(c)
                  ) : (
                    <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap break-words" style={{ color: "rgb(var(--flow-text-soft))" }}>
                      {c.text}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
