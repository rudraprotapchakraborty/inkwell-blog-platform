"use client"

import { useEffect } from "react"
import { createPortal } from "react-dom"
import { Loader2 } from "lucide-react"

/**
 * A small confirmation dialog. It is rendered on <body> through a portal so a
 * fixed element is positioned against the screen, not an animated ancestor.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  busy,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onCancel()
    document.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [busy, onCancel])

  return createPortal(
    <div
      className="animate-fade fixed inset-0 z-[100] grid place-items-center bg-ink/50 p-4 backdrop-blur-[2px]"
      onMouseDown={e => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-pop w-full max-w-[400px] rounded-3xl border border-line bg-surface p-7 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={busy} autoFocus className="btn btn-danger">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
