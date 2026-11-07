"use client"

import { useT } from "@/lib/i18n"
import { editorUiMessages } from "@/lib/i18n/messages/editorUi"

import { Plus, X, Link2, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import type { BlogLinkFieldError, BlogSeoFields, BlogSeoLink } from "@/lib/blog-types"
import { getBlogLinkFieldErrors } from "@/lib/blog-types"

interface BlogSeoPanelProps {
  value: BlogSeoFields
  onChange: (patch: Partial<BlogSeoFields>) => void
  showValidation?: boolean
  inboundUrlPlaceholder?: string
  inboundHint?: string
  outboundHint?: string
  /** "ruled" drops the box for a hairline — the main blog writer's editorial frame. */
  frame?: "card" | "ruled"
}

function emptyLink(): BlogSeoLink {
  return { label: "", url: "" }
}

function LinkListEditor({
  title,
  hint,
  icon,
  list,
  links,
  onChange,
  labelPlaceholder,
  urlPlaceholder,
  urlInputType = "url",
  errors,
  showValidation,
}: {
  title: string
  hint: string
  icon: React.ReactNode
  list: "inbound" | "outbound"
  links: BlogSeoLink[]
  onChange: (links: BlogSeoLink[]) => void
  labelPlaceholder: string
  urlPlaceholder: string
  urlInputType?: "text" | "url"
  errors: BlogLinkFieldError[]
  showValidation: boolean
}) {
  const t = useT(editorUiMessages)
  const removeLabel = t("seo.removeLink")

  function fieldError(index: number, field: "label" | "url") {
    return errors.find(err => err.list === list && err.index === index && err.field === field)
  }

  function updateLink(index: number, key: keyof BlogSeoLink, val: string) {
    onChange(links.map((link, i) => (i === index ? { ...link, [key]: val } : link)))
  }

  function removeLink(index: number) {
    onChange(links.filter((_, i) => i !== index))
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: "rgb(var(--flow-text-soft))" }}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--flow-text-soft))" }}>
          {title}
        </p>
      </div>
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgb(var(--flow-text-soft))", opacity: 0.85 }}>
        {hint}
      </p>

      <div className="space-y-2.5">
        {links.map((link, index) => {
          const labelErr = fieldError(index, "label")
          const urlErr = fieldError(index, "url")

          return (
            <div
              key={index}
              className="rounded-lg p-2.5 space-y-2"
              style={{
                background: "rgb(var(--flow-text) / 0.03)",
                border: `1px solid ${showValidation && (labelErr || urlErr) ? "rgb(239 68 68 / 0.45)" : "var(--flow-border)"}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgb(var(--flow-text-soft))" }}>
                  Link {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: "rgb(var(--flow-text))" }}
                  aria-label={removeLabel}
                >
                  <X size={12} />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: "rgb(var(--flow-text-soft))" }}>
                  Label <span style={{ color: "rgb(239 68 68)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={link.label}
                  onChange={e => updateLink(index, "label", e.target.value)}
                  placeholder={labelPlaceholder}
                  required
                  aria-invalid={showValidation && Boolean(labelErr)}
                  className="w-full bg-transparent outline-none text-xs text-flow-text placeholder:opacity-40 border-b pb-1"
                  style={{ borderColor: showValidation && labelErr ? "rgb(239 68 68)" : "var(--flow-border)" }}
                />
                {showValidation && labelErr && (
                  <p className="text-[10px] mt-1" style={{ color: "rgb(239 68 68)" }}>{labelErr.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold mb-1" style={{ color: "rgb(var(--flow-text-soft))" }}>
                  URL <span style={{ color: "rgb(239 68 68)" }}>*</span>
                </label>
                <input
                  type={urlInputType}
                  value={link.url}
                  onChange={e => updateLink(index, "url", e.target.value)}
                  placeholder={urlPlaceholder}
                  required
                  aria-invalid={showValidation && Boolean(urlErr)}
                  className="w-full bg-transparent outline-none text-xs text-flow-text placeholder:opacity-40 border-b pb-1 font-mono break-all"
                  style={{ borderColor: showValidation && urlErr ? "rgb(239 68 68)" : "var(--flow-border)" }}
                />
                {showValidation && urlErr && (
                  <p className="text-[10px] mt-1" style={{ color: "rgb(239 68 68)" }}>{urlErr.message}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onChange([...links, emptyLink()])}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80"
        style={{ color: "rgb(var(--accent-1))" }}
      >
        <Plus size={12} /> Add link
      </button>
    </div>
  )
}

export default function BlogSeoPanel({
  value,
  onChange,
  showValidation = false,
  inboundUrlPlaceholder = "https://www.inkwell.blog/services",
  inboundHint,
  outboundHint,
  frame = "card",
}: BlogSeoPanelProps) {
  const t = useT(editorUiMessages)
  const linkErrors = getBlogLinkFieldErrors(value.inboundLinks, value.outboundLinks)
  const metaLength = value.metaDescription.trim().length
  const metaStatus =
    metaLength === 0 ? "optional" : metaLength <= 160 ? "good" : "long"

  return (
    <div
      className={frame === "ruled" ? "space-y-5 border-t border-ink/10 pt-5" : "glass rounded-xl p-4 space-y-5"}
      style={frame === "ruled" ? undefined : { border: "1px solid var(--flow-border)" }}
    >
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={13} style={{ color: "rgb(var(--flow-text-soft))" }} />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgb(var(--flow-text-soft))" }}>
            SEO Settings
          </p>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: "rgb(var(--flow-text-soft))", opacity: 0.85 }}>
          Optimize how this post appears in search results and link structure.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: "rgb(var(--flow-text))" }}>
          {t("seo.metaDescriptionLabel")}
        </label>
        <textarea
          value={value.metaDescription}
          onChange={e => onChange({ metaDescription: e.target.value })}
          placeholder={t("seo.metaPlaceholder")}
          rows={4}
          maxLength={320}
          className="w-full bg-transparent outline-none resize-none text-xs leading-relaxed text-flow-text placeholder:opacity-40 rounded-lg p-2.5"
          style={{ border: "1px solid var(--flow-border)", background: "rgb(var(--flow-text) / 0.02)" }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: "rgb(var(--flow-text-soft))" }}>
            {metaLength === 0 ? t("seo.fallbackHint") : t("seo.characters", { count: metaLength })}
          </span>
          <span
            className="text-[10px] font-semibold"
            style={{
              color:
                metaStatus === "good"
                  ? "rgb(34 197 94)"
                  : metaStatus === "long"
                    ? "rgb(234 179 8)"
                    : "rgb(var(--flow-text-soft))",
            }}
          >
            {metaStatus === "good" ? t("seo.idealLength") : metaStatus === "long" ? t("seo.considerShortening") : ""}
          </span>
        </div>
      </div>

      <LinkListEditor
        title={t("seo.inboundTitle")}
        hint={inboundHint ?? t("seo.inboundHint")}
        icon={<ArrowDownLeft size={13} />}
        list="inbound"
        links={value.inboundLinks}
        onChange={inboundLinks => onChange({ inboundLinks })}
        labelPlaceholder="e.g. SEO Services"
        urlPlaceholder={inboundUrlPlaceholder}
        urlInputType="text"
        errors={linkErrors}
        showValidation={showValidation}
      />

      <LinkListEditor
        title={t("seo.outboundTitle")}
        hint={outboundHint ?? t("seo.outboundHint")}
        icon={<ArrowUpRight size={13} />}
        list="outbound"
        links={value.outboundLinks}
        onChange={outboundLinks => onChange({ outboundLinks })}
        labelPlaceholder="e.g. Google Search Central"
        urlPlaceholder="https://developers.google.com/search"
        errors={linkErrors}
        showValidation={showValidation}
      />
    </div>
  )
}