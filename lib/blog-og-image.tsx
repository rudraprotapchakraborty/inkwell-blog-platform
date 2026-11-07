import { ImageResponse } from "next/og"

/** Facebook, X and LinkedIn all render 1.91:1 previews at this size. */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

const ACCENT_1 = "#b4472b"
const ACCENT_2 = "#f0a083"

/** Mirrors the emoji map used by the on-site card art. */
const CATEGORY_EMOJI: Record<string, string> = {
  Strategy: "🎯", Marketing: "📈", Design: "🎨", SEO: "🔍",
  "Social Media": "📱", Content: "✍️", General: "💡", Technology: "⚡",
  Business: "💼", Branding: "🌟", UX: "🖥️", Analytics: "📊",
  Growth: "🚀", Copywriting: "🖊️", Advertising: "📣",
  "Lead Generation": "🧲", "AI & Creative": "🤖", "Video Production": "🎬",
  "Web Development": "🌐", "Digital Marketing": "📣",
}

interface BlogOgInput {
  title: string
  category: string
  brand: string
  /** Used full-bleed when the post has a real cover; ignored unless absolute. */
  coverImage?: string
}

/**
 * Builds the shareable preview image for a post.
 *
 * The on-site thumbnail is DOM + CSS, which no crawler can fetch — this
 * redraws that same design as a real PNG. Rendered by Satori, so only inline
 * styles and its flexbox subset are available (no CSS variables, no classes).
 */
export function renderBlogOgImage({ title, category, brand, coverImage }: BlogOgInput) {
  const cover = coverImage?.trim()
  const useCover = !!cover && /^https?:\/\//i.test(cover)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #12151d 0%, #1b1e2b 60%, #241a1a 100%)",
        }}
      >
        {useCover && (
          <img
            src={cover}
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ position: "absolute", inset: 0, objectFit: "cover" }}
          />
        )}

        {/* Glow accents — radial gradients stand in for the CSS blur filter. */}
        <div
          style={{
            position: "absolute", top: -160, right: -120, width: 560, height: 560,
            background: `radial-gradient(circle, ${ACCENT_1}66 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute", bottom: -180, left: -140, width: 480, height: 480,
            background: `radial-gradient(circle, ${ACCENT_2}44 0%, transparent 70%)`,
          }}
        />

        {/* Keeps the type readable when a cover photo sits underneath. */}
        {useCover && (
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, rgba(18,21,29,0.94) 35%, rgba(18,21,29,0.6) 100%)",
            }}
          />
        )}

        <div
          style={{
            position: "relative", display: "flex", flexDirection: "column",
            justifyContent: "space-between", width: "100%", height: "100%", padding: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 40, height: 4, background: ACCENT_1, marginRight: 16 }} />
            <div
              style={{
                fontSize: 22, fontWeight: 700, letterSpacing: 6,
                textTransform: "uppercase", color: "#f0a083",
              }}
            >
              {category}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <div
              style={{
                display: "flex", flex: 1, fontSize: 62, fontWeight: 800, color: "#ffffff",
                lineHeight: 1.15, letterSpacing: -1.5, paddingRight: 40,
              }}
            >
              {title.length > 110 ? `${title.slice(0, 107)}…` : title}
            </div>
            {!useCover && (
              <div style={{ display: "flex", fontSize: 170 }}>
                {CATEGORY_EMOJI[category] ?? "💡"}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 46, height: 46, borderRadius: 12, marginRight: 16,
                background: "#f0a083",
                fontSize: 24, fontWeight: 800, color: "#1b1e2b",
              }}
            >
              I
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: "rgba(255,255,255,0.72)" }}>
              {brand}
            </div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE
  )
}
