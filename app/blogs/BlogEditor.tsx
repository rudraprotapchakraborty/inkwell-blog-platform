"use client"

import { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "@/lib/motion"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Save, X, Plus } from "lucide-react"
import { useT } from "@/lib/i18n"
import { editorMessages } from "@/lib/i18n/messages/editor"
import ImageUpload from "@/components/ui/ImageUpload"
import BlogRichTextEditor from "@/components/ui/BlogRichTextEditor"
import BlogSeoPanel from "@/components/ui/BlogSeoPanel"
import BlogKeyTakeawaysPanel from "@/components/ui/BlogKeyTakeawaysPanel"
import { BlogPostView, type BlogPostViewData } from "@/app/blogs/[slug]/BlogPostClient"
import {
  DEFAULT_BLOG_SEO,
  getBlogLinkValidationMessage,
  normalizeKeyTakeaways,
  pickBlogSeoFields,
  sanitizeBlogSeoLinks,
  type BlogSeoFields,
} from "@/lib/blog-types"
import { LogoSpinner } from "@/components/ui/LogoSpinner"
import toast from "react-hot-toast"
import { commonMessages } from "@/lib/i18n/messages/common"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { JournalCover } from "./JournalParts"
import WritersField from "@/components/blog/WritersField"

interface BlogForm {
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  authors: string[]
  readTime: string
  keyTakeaways: string[]
  coverImage: string
  metaDescription: string
  inboundLinks: BlogSeoFields["inboundLinks"]
  outboundLinks: BlogSeoFields["outboundLinks"]
}

const CATEGORIES = ["General", "Technology", "Design", "Writing", "Travel", "Food", "Culture", "Science", "Business", "Health", "Lifestyle", "Opinion"]

const DEFAULT_FORM: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "General",
  tags: [],
  authors: ["Inkwell"],
  readTime: "5 min read",
  keyTakeaways: [],
  coverImage: "",
  ...DEFAULT_BLOG_SEO,
}

/** Reads the writer list off a saved post, falling back to the legacy single `author` field. */
function toAuthorList(data: { authors?: unknown; author?: unknown }): string[] {
  const list = Array.isArray(data.authors)
    ? data.authors.map(String).map(a => a.trim()).filter(Boolean)
    : []
  if (list.length) return list
  const legacy = typeof data.author === "string" ? data.author.trim() : ""
  return legacy ? [legacy] : ["Inkwell"]
}

function calcReadTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(1, Math.round(words / 200))
  return `${minutes} min read`
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/** `editSlug` opens an existing post by its slug (an old id link still works); without it, a new post. */
export default function BlogEditor({ editSlug }: { editSlug?: string }) {
  const t = useT(editorMessages)
  const tc = useT(commonMessages)
  const isEdit = !!editSlug
  // Saves go to the post by id, so a slug changed in this session still updates the same post.
  const [blogId, setBlogId] = useState<string>()
  const [form, setForm] = useState<BlogForm>(DEFAULT_FORM)
  const [tagInput, setTagInput] = useState("")
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(isEdit)
  const [createdAt, setCreatedAt] = useState<string>()
  /** Whether the post is (or was last saved as) published. New posts start as drafts until published. */
  const [published, setPublished] = useState(false)
  const [showSeoValidation, setShowSeoValidation] = useState(false)
  const router = useRouter()

  // Auth guard — only admins write or edit posts. The API enforces the same.
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d.authenticated) router.push("/login")
        else if (d.role !== "admin") router.push("/blogs")
      })
      .catch(() => router.push("/login"))
  }, [router])

  // Load existing blog for edit
  useEffect(() => {
    if (!editSlug) return
    fetch(`/api/blogs/${encodeURIComponent(editSlug)}`)
      .then(r => r.json())
      .then(data => {
        const seo = pickBlogSeoFields(data)
        setForm({
          title: data.title ?? "",
          slug: data.slug ?? "",
          excerpt: data.excerpt ?? "",
          content: data.content ?? "",
          category: data.category ?? "General",
          tags: data.tags ?? [],
          authors: toAuthorList(data),
          readTime: data.readTime ?? "5 min read",
          keyTakeaways: normalizeKeyTakeaways(data.keyTakeaways),
          coverImage: data.coverImage ?? "",
          ...seo,
        })
        setBlogId(String(data._id))
        setCreatedAt(data.createdAt)
        setPublished(Boolean(data.published))
        setLoading(false)
      })
      .catch(() => { setError("Failed to load blog post."); setLoading(false) })
  }, [editSlug])

  const set = useCallback(<K extends keyof BlogForm>(key: K, value: BlogForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  function handleTitleChange(val: string) {
    set("title", val)
    set("slug", slugify(val))
  }

  function addTag(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().replace(/,+$/, "")
      if (tag && !form.tags.includes(tag)) {
        set("tags", [...form.tags, tag])
      }
      setTagInput("")
    }
  }

  function removeTag(tag: string) {
    set("tags", form.tags.filter(t => t !== tag))
  }

  async function handleSave(publish: boolean) {
    setError("")

    if (!form.title.trim()) { setError(t("errors.titleRequired")); return }
    if (!form.slug.trim()) { setError(t("errors.slugRequired")); return }
    if (!form.content.trim()) { setError(t("errors.contentRequired")); return }

    if (getBlogLinkValidationMessage(form.inboundLinks, form.outboundLinks)) {
      setShowSeoValidation(true)
      return
    }
    setShowSeoValidation(false)

    // WritersField adds a half-typed name on blur, before Save is clicked.
    const authors = [...new Set(form.authors.filter(Boolean))]
    if (!authors.length) authors.push("Inkwell")

    const payload = {
      ...form,
      authors,
      author: authors.join(", "),
      keyTakeaways: normalizeKeyTakeaways(form.keyTakeaways),
      published: publish,
      inboundLinks: sanitizeBlogSeoLinks(form.inboundLinks),
      outboundLinks: sanitizeBlogSeoLinks(form.outboundLinks),
    }

    setSaving(true)
    try {
      const res = await fetch(
        isEdit ? `/api/blogs/${blogId}` : "/api/blogs",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (!res.ok) {
        const d = await res.json()
        setError(d.error || t("errors.saveFailed"))
        setSaving(false)
        return
      }

      const saved = await res.json()
      toast.success(publish ? (isEdit && published ? "Post updated" : "Post published") : "Draft saved")
      if (publish) router.push(`/blogs/${saved.slug}`)
      else {
        setBlogId(String(saved._id))
        setPublished(false)
        setSaving(false)
        if (!isEdit) router.replace(`/blogs/edit/${saved.slug}`)
      }
    } catch {
      setError(t("errors.network"))
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <LogoSpinner size={56} />
      </div>
    )
  }

  // The post as it stands, in the shape the post page renders.
  const previewBlog: BlogPostViewData = {
    ...form,
    title: form.title || t("untitled"),
    content: form.content || t("noContent"),
    author: form.authors.join(", ") || "Inkwell",
    createdAt: createdAt ?? new Date().toISOString(),
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="frame pt-6">
        {/* Dateline: the way back, what this is, and how long it reads. */}
        <div className="eyeline flex items-center justify-between gap-6 border-b border-ink/10 pb-4 text-muted">
          <Breadcrumbs
            structuredData={false}
            items={[{ label: tc("breadcrumb.blogs"), href: "/blogs" }, { label: isEdit ? t("editPost") : t("newPost") }]}
          />
          <p className="tabular-nums">
            {form.category}
            {form.readTime && (
              <>
                <span aria-hidden className="mx-2 opacity-50">·</span>
                {form.readTime}
              </>
            )}
          </p>
        </div>
      </div>

      {preview ? (
        /* ─── Preview: the post page's own layout, so what you see is what readers get ─── */
        <div className="bg-flow-bg pb-32">
          <BlogPostView blog={previewBlog} heroClassName="pt-8 sm:pt-10" structuredData={false} />
        </div>
      ) : (
        /* ─── Writing ─── */
        <div className="frame pb-32 pt-10 sm:pt-14">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
            {/* The manuscript */}
            <div className="min-w-0 space-y-8 lg:col-span-8">
              <label className="block">
                <span className="sr-only">{t("titlePlaceholder")}</span>
                {/* A textarea, so a long headline wraps the way it will on the page. */}
                <textarea
                  value={form.title}
                  onChange={e => handleTitleChange(e.target.value.replace(/\n/g, " "))}
                  placeholder={t("titlePlaceholder")}
                  rows={2}
                  className="block w-full resize-none bg-transparent font-medium text-ink outline-none placeholder:text-muted/60"
                  style={{ fontSize: "clamp(2rem, 4.4vw, 3.5rem)", lineHeight: 1.04, letterSpacing: "-0.045em" }}
                />
              </label>

              <label className="block border-t border-ink/10 pt-5">
                <span className="eyeline mb-3 block text-muted">{t("excerptLabel")}</span>
                <textarea
                  value={form.excerpt}
                  onChange={e => set("excerpt", e.target.value)}
                  placeholder={t("excerptPlaceholder")}
                  rows={3}
                  className="lede block w-full resize-none bg-transparent text-muted outline-none placeholder:text-muted/60"
                />
              </label>

              <BlogKeyTakeawaysPanel frame="ruled" value={form.keyTakeaways} onChange={items => set("keyTakeaways", items)} />

              <div className="border-t border-ink/10 pt-5">
                <p className="eyeline mb-4 text-muted">{t("contentLabel")}</p>
                <div className="rounded-lg bg-surface p-4 ring-1 ring-inset ring-ink/10 sm:p-6">
                  <BlogRichTextEditor
                    value={form.content}
                    onChange={md => { set("content", md); set("readTime", calcReadTime(md)) }}
                    placeholder={t("contentPlaceholder")}
                    minHeight={420}
                  />
                </div>
              </div>
            </div>

            {/* The details, in the rail */}
            <aside className="space-y-8 lg:col-span-4 lg:pl-4">
              <label className="block border-t border-ink/10 pt-5">
                <span className="eyeline mb-3 block text-muted">{t("categoryLabel")}</span>
                <select
                  value={form.category}
                  onChange={e => set("category", e.target.value)}
                  className="h-11 w-full rounded-[10px] bg-surface px-3 text-[15px] text-ink outline-none ring-1 ring-inset ring-ink/15 focus:ring-2 focus:ring-brand"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <div className="border-t border-ink/10 pt-5">
                <p className="eyeline mb-3 text-muted">{t("coverImageLabel")}</p>
                <ImageUpload
                  value={form.coverImage}
                  onChange={v => set("coverImage", v)}
                  placeholder={<JournalCover title={form.title || form.category} brand="Inkwell" />}
                />
              </div>

              <ChipField
                label={t("tagsLabel")}
                items={form.tags}
                onRemove={removeTag}
                input={tagInput}
                onInput={setTagInput}
                onKeyDown={addTag}
                placeholder={t("tagPlaceholder")}
              />

              <WritersField
                label={t("authorsLabel")}
                placeholder={t("authorPlaceholder")}
                writers={form.authors}
                onChange={authors => set("authors", authors)}
                isNew={!isEdit}
              />

              <BlogSeoPanel
                frame="ruled"
                value={{
                  metaDescription: form.metaDescription,
                  inboundLinks: form.inboundLinks,
                  outboundLinks: form.outboundLinks,
                }}
                showValidation={showSeoValidation}
                onChange={seo => {
                  setShowSeoValidation(false)
                  setForm(prev => ({ ...prev, ...seo }))
                }}
              />
            </aside>
          </div>
        </div>
      )}

      {/* ─── Action bar: always within reach, never under the site header ─── */}
      <div className="sticky bottom-0 z-30 border-t border-ink/10 bg-paper/90 backdrop-blur-xl backdrop-saturate-150">
        <div className="frame flex items-center justify-between gap-4 py-3">
          <button
            type="button"
            onClick={() => setPreview(v => !v)}
            aria-pressed={preview}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-ink ring-1 ring-inset ring-ink/15 transition-colors hover:bg-ink/[0.04]"
          >
            {preview ? <EyeOff aria-hidden size={15} /> : <Eye aria-hidden size={15} />}
            {preview ? t("editorMode") : t("preview")}
          </button>

          <AnimatePresence>
            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="hidden min-w-0 flex-1 items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400 sm:flex"
              >
                <span className="truncate">{error}</span>
                <button type="button" onClick={() => setError("")} aria-label="×" className="shrink-0 rounded-sm">
                  <X aria-hidden size={14} />
                </button>
              </motion.p>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold text-ink ring-1 ring-inset ring-ink/15 transition-colors hover:bg-ink/[0.04] disabled:opacity-60"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            aria-busy={saving || undefined}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-strong disabled:cursor-progress disabled:opacity-70"
          >
            {saving ? (
              <>
                <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                {t("saving")}
              </>
            ) : (
              <>
                <Save aria-hidden size={15} />
                {isEdit && published ? t("updatePost") : t("publishPost")}
              </>
            )}
          </button>
          </div>
        </div>
        {/* Phones: the error gets its own line under the controls. */}
        {error && (
          <p role="alert" className="frame pb-3 text-sm text-red-600 dark:text-red-400 sm:hidden">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

/** Tags and writers: chips you can remove, and a field that adds one on Enter. */
function ChipField({
  label,
  items,
  onRemove,
  input,
  onInput,
  onKeyDown,
  placeholder,
}: {
  label: string
  items: string[]
  onRemove: (item: string) => void
  input: string
  onInput: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder: string
}) {
  return (
    <div className="border-t border-ink/10 pt-5">
      <p className="eyeline mb-3 text-muted">{label}</p>
      {items.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {items.map(item => (
            <li key={item} className="inline-flex items-center gap-1 rounded-md bg-ink/[0.06] py-1 pl-2.5 pr-1 text-[13px] font-medium text-ink">
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`${label}: ${item} ×`}
                className="grid h-5 w-5 place-items-center rounded text-muted transition-colors hover:text-ink"
              >
                <X aria-hidden size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="text"
        value={input}
        onChange={e => onInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        className="h-11 w-full rounded-[10px] bg-surface px-3 text-[15px] text-ink outline-none ring-1 ring-inset ring-ink/15 placeholder:text-muted/70 focus:ring-2 focus:ring-brand"
      />
    </div>
  )
}
