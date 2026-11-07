"use client"

import { useT } from "@/lib/i18n"
import { editorUiMessages } from "@/lib/i18n/messages/editorUi"

import { useRef, useState, useCallback } from "react"
import { UploadCloud, X, Link2, Loader2 } from "lucide-react"

/**
 * Compress + resize an image file in the browser and return a base64 data URL.
 * Done before upload so we ship a smaller payload to the image host (faster
 * uploads, smaller stored images). Downscales to `maxDim` and re-encodes
 * (WebP, JPEG fallback).
 */
export async function compressImageFile(
  file: File,
  { maxDim = 1920, quality = 0.85 }: { maxDim?: number; quality?: number } = {}
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Could not read file"))
    reader.readAsDataURL(file)
  })

  // GIF (animation) and SVG (vector) don't survive canvas re-encoding well —
  // keep them as-is.
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    return rawDataUrl
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("Could not load image"))
    i.src = rawDataUrl
  })

  let { width, height } = img
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return rawDataUrl
  ctx.drawImage(img, 0, 0, width, height)

  const webp = canvas.toDataURL("image/webp", quality)
  if (webp.startsWith("data:image/webp")) return webp
  return canvas.toDataURL("image/jpeg", quality)
}

/**
 * Compress an image file and upload it to the image host via our server-side
 * `/api/upload` route (which keeps the API key secret). Returns the public URL
 * of the hosted image, which is what gets stored in the database.
 */
export async function uploadImageFile(
  file: File,
  opts?: { maxDim?: number; quality?: number }
): Promise<string> {
  const dataUrl = await compressImageFile(file, opts)
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl, name: file.name }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Upload failed")
  }
  return data.url as string
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
const MAX_INPUT_MB = 20

interface ImageUploadProps {
  value: string
  onChange: (value: string) => void
  /** Preview box height in px. Default 140. */
  height?: number
  /** Rendered inside the preview area when there is no image yet. */
  placeholder?: React.ReactNode
  /** Max output dimension (longest edge) in px. Default 1600. */
  maxDim?: number
}

export default function ImageUpload({
  value,
  onChange,
  height = 140,
  placeholder,
  maxDim = 1600,
}: ImageUploadProps) {
  const t = useT(editorUiMessages)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [showUrl, setShowUrl] = useState(false)

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return
      if (!file.type.startsWith("image/")) {
        setError(t("upload.chooseImage"))
        return
      }
      if (file.size > MAX_INPUT_MB * 1024 * 1024) {
        setError(`Image is too large (max ${MAX_INPUT_MB}MB).`)
        return
      }
      setError("")
      setBusy(true)
      try {
        const url = await uploadImageFile(file, { maxDim })
        onChange(url)
      } catch (e) {
        setError(e instanceof Error ? e.message : t("upload.failed"))
      } finally {
        setBusy(false)
      }
    },
    [onChange, maxDim]
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />

      {value ? (
        /* ─── Has image: preview + actions ─── */
        <div className="relative w-full rounded-lg overflow-hidden group" style={{ height }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.5)" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "rgb(var(--accent-1))" }}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1"
              style={{ background: "rgba(239,68,68,0.9)" }}
            >
              <X size={12} /> Remove
            </button>
          </div>
        </div>
      ) : (
        /* ─── Empty: dropzone (with optional fancy placeholder behind) ─── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="relative w-full rounded-lg overflow-hidden transition-all flex items-center justify-center text-center"
          style={{
            height,
            border: `1px dashed ${dragOver ? "rgb(var(--accent-1))" : "var(--flow-border-strong)"}`,
            background: dragOver ? "rgb(var(--accent-1) / 0.06)" : "transparent",
          }}
        >
          {placeholder && <div className="absolute inset-0 pointer-events-none">{placeholder}</div>}
          <div className="relative z-10 flex flex-col items-center gap-1.5 px-3" style={{ color: "rgb(var(--flow-text-soft))" }}>
            {busy ? (
              <Loader2 size={20} className="animate-spin" style={{ color: "rgb(var(--accent-1))" }} />
            ) : (
              <UploadCloud size={20} style={{ color: "rgb(var(--accent-1))" }} />
            )}
            <span className="text-[11px] font-semibold leading-tight">
              {busy ? t("upload.uploading") : t("upload.prompt")}
            </span>
          </div>
        </button>
      )}

      {error && <p className="text-[11px] mt-2" style={{ color: "rgb(239 68 68)" }}>{error}</p>}

      {/* Optional: paste a URL instead */}
      <div className="mt-2">
        {showUrl ? (
          <input
            type="text"
            autoFocus
            defaultValue={value.startsWith("data:") ? "" : value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://…"
            className="w-full bg-transparent outline-none text-xs text-flow-text placeholder:opacity-30 border-b pb-1"
            style={{ borderColor: "var(--flow-border)" }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowUrl(true)}
            className="inline-flex items-center gap-1 text-[10px] font-semibold opacity-50 hover:opacity-100 transition-opacity"
          >
            <Link2 size={10} /> or paste an image URL
          </button>
        )}
      </div>
    </div>
  )
}
