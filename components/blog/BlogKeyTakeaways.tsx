import { Sparkles } from "lucide-react"

interface BlogKeyTakeawaysProps {
  items?: string[]
  title?: string
  accentColor?: string
}

/**
 * Highlight card summarising a post in a few bullets, rendered between the
 * excerpt and the article body.
 */
export default function BlogKeyTakeaways({
  items,
  title = "Key takeaways",
  accentColor = "rgb(var(--accent-1))",
}: BlogKeyTakeawaysProps) {
  const takeaways = (items ?? []).map(item => item.trim()).filter(Boolean)
  if (!takeaways.length) return null

  return (
    <aside
      className="rounded-2xl p-5 sm:p-6 mb-8 sm:mb-10"
      style={{
        background: "rgb(var(--flow-text) / 0.04)",
        border: "1px solid var(--flow-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} style={{ color: accentColor }} />
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "rgb(var(--flow-text-soft))" }}
        >
          {title}
        </h2>
      </div>

      <ul className="space-y-3">
        {takeaways.map((item, i) => (
          <li
            key={`takeaway-${i}`}
            className="flex gap-3 text-sm sm:text-base leading-relaxed"
            style={{ color: "rgb(var(--flow-text))" }}
          >
            <span
              className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full"
              style={{ background: accentColor }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
