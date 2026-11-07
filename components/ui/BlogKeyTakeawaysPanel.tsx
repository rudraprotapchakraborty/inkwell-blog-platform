"use client"

import { ArrowDown, ArrowUp, Plus, Sparkles, X } from "lucide-react"
import { useT } from "@/lib/i18n"
import { editorUiMessages } from "@/lib/i18n/messages/editorUi"
import { MAX_KEY_TAKEAWAYS } from "@/lib/blog-types"

interface BlogKeyTakeawaysPanelProps {
  value: string[]
  onChange: (takeaways: string[]) => void
  /** "ruled" drops the box for a hairline — the main blog writer's editorial frame. */
  frame?: "card" | "ruled"
}

/**
 * Editor for the key-takeaways card. Blank rows are allowed while writing —
 * they are stripped on save by `normalizeKeyTakeaways`.
 */
export default function BlogKeyTakeawaysPanel({ value, onChange, frame = "card" }: BlogKeyTakeawaysPanelProps) {
  const t = useT(editorUiMessages)
  const atLimit = value.length >= MAX_KEY_TAKEAWAYS

  function updateItem(index: number, text: string) {
    onChange(value.map((item, i) => (i === index ? text : item)))
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div
      className={frame === "ruled" ? "border-t border-ink/10 pt-5" : "glass rounded-xl p-4"}
      style={frame === "ruled" ? undefined : { border: "1px solid var(--flow-border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={13} style={{ color: "rgb(var(--flow-text-soft))" }} />
        <label
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "rgb(var(--flow-text-soft))" }}
        >
          {t("takeaways.label")}
        </label>
      </div>
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgb(var(--flow-text-soft))", opacity: 0.85 }}>
        {t("takeaways.hint")}
      </p>

      <div className="space-y-2.5">
        {value.map((item, index) => (
          <div
            key={index}
            className="rounded-lg p-2.5"
            style={{ background: "rgb(var(--flow-text) / 0.03)", border: "1px solid var(--flow-border)" }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgb(var(--flow-text-soft))" }}
              >
                {t("takeaways.itemLabel", { number: index + 1 })}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                  style={{ color: "rgb(var(--flow-text))" }}
                  aria-label={t("takeaways.moveUp")}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === value.length - 1}
                  className="p-1 rounded opacity-50 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                  style={{ color: "rgb(var(--flow-text))" }}
                  aria-label={t("takeaways.moveDown")}
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: "rgb(var(--flow-text))" }}
                  aria-label={t("takeaways.remove")}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <textarea
              value={item}
              onChange={e => updateItem(index, e.target.value)}
              placeholder={t("takeaways.placeholder")}
              rows={2}
              className="w-full bg-transparent outline-none resize-none text-xs leading-relaxed text-flow-text placeholder:opacity-40"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 mt-2.5">
        <button
          type="button"
          onClick={() => onChange([...value, ""])}
          disabled={atLimit}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: "rgb(var(--accent-1))" }}
        >
          <Plus size={12} /> {t("takeaways.add")}
        </button>
        <span className="text-[10px]" style={{ color: "rgb(var(--flow-text-soft))" }}>
          {t("takeaways.count", { count: value.length, max: MAX_KEY_TAKEAWAYS })}
        </span>
      </div>
    </div>
  )
}
