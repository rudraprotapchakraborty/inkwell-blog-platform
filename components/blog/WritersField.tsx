"use client"

import { useEffect, useId, useRef, useState } from "react"
import { X } from "lucide-react"
import { Monogram } from "@/app/blogs/JournalParts"

type Admin = { id: string; name: string; avatar?: string }

/** The editors' starting writer before anyone is signed in. */
const DEFAULT_WRITER = "Inkwell"

/**
 * The editor's "Written by" field, shared by both blogs.
 *
 * A new post starts with the signed-in admin as its writer. More writers are
 * added by typing a name: any name works, and names that match an admin
 * account are offered as suggestions (with their picture, which the published
 * byline will use) to pick by click or with the arrow keys and Enter. A name
 * left typed but not added is added when the field loses focus, so Save never
 * drops it.
 */
export default function WritersField({
  label,
  placeholder,
  writers,
  onChange,
  isNew,
  variant = "editorial",
}: {
  label: string
  placeholder: string
  writers: string[]
  onChange: (writers: string[]) => void
  /** New posts get the signed-in admin filled in. */
  isNew: boolean
  /** `editorial` for the marketing editor, `flow` for the real-estate one. */
  variant?: "editorial" | "flow"
}) {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [input, setInput] = useState("")
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const listId = useId()
  const prefilled = useRef(false)
  // The latest list, for the prefill that resolves after a fetch.
  const writersRef = useRef(writers)
  writersRef.current = writers

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.admins) return
        setAdmins(
          (d.admins as Admin[])
            .filter(a => a.name?.trim())
            .map(a => ({ id: a.id, name: a.name.trim(), avatar: a.avatar }))
        )
      })
      .catch(() => {})

    if (!isNew) return
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        const me = String(d?.username || d?.user?.name || "").trim()
        if (!me || d.role !== "admin" || prefilled.current) return
        prefilled.current = true
        // Replace the placeholder writer; keep anything already typed in.
        const rest = writersRef.current.filter(w => w !== DEFAULT_WRITER && w !== me)
        onChange([me, ...rest])
      })
      .catch(() => {})
    // onChange is a setter wrapper from the editor; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew])

  const query = input.trim().toLowerCase()
  const suggestions = query
    ? admins.filter(a => a.name.toLowerCase().includes(query) && !writers.includes(a.name)).slice(0, 5)
    : []
  const showList = open && suggestions.length > 0

  function add(name: string) {
    const clean = name.trim().replace(/,+$/, "").trim()
    if (clean && !writers.includes(clean)) onChange([...writers, clean])
    setInput("")
    setHighlight(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault()
      setOpen(true)
      setHighlight(h => (h + 1) % suggestions.length)
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault()
      setHighlight(h => (h <= 0 ? suggestions.length - 1 : h - 1))
    } else if (e.key === "Escape") {
      setOpen(false)
      setHighlight(-1)
    } else if ((e.key === "Enter" || e.key === ",") && (input.trim() || highlight >= 0)) {
      e.preventDefault()
      // A highlighted suggestion wins; otherwise the name exactly as typed.
      add(highlight >= 0 && suggestions[highlight] ? suggestions[highlight].name : input)
    }
  }

  const editorial = variant === "editorial"

  return (
    // The flow card's backdrop blur makes it its own stacking context, which
    // traps the suggestion list's z-index inside it, so the next card paints
    // over the list. Lifting the whole field while the list is open fixes that.
    <div
      className={`relative ${showList ? "z-30" : ""} ${editorial ? "border-t border-ink/10 pt-5" : "glass rounded-xl p-4"}`}
      style={editorial ? undefined : { border: "1px solid var(--flow-border)" }}
    >
      <p
        className={editorial ? "eyeline mb-3 text-muted" : "block text-xs font-semibold uppercase tracking-widest mb-3"}
        style={editorial ? undefined : { color: "rgb(var(--flow-text-soft))" }}
      >
        {label}
      </p>

      {writers.length > 0 && (
        <ul className={editorial ? "mb-3 flex flex-wrap gap-1.5" : "mb-2 flex flex-wrap gap-1.5"}>
          {writers.map(writer => {
            const admin = admins.find(a => a.name === writer)
            return (
              <li
                key={writer}
                className={
                  editorial
                    ? "inline-flex items-center gap-1.5 rounded-md bg-ink/[0.06] py-1 pl-1.5 pr-1 text-[13px] font-medium text-ink"
                    : "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1 pr-1.5 text-xs font-medium"
                }
                style={editorial ? undefined : { background: "rgb(var(--accent-1) / 0.1)", color: "rgb(var(--accent-1))" }}
              >
                {admin && <Monogram name={writer} src={admin.avatar} size={18} />}
                <span className={admin ? "" : "pl-1"}>{writer}</span>
                <button
                  type="button"
                  onClick={() => onChange(writers.filter(w => w !== writer))}
                  aria-label={`${label}: ${writer} ×`}
                  className="grid h-5 w-5 place-items-center rounded opacity-60 transition-opacity hover:opacity-100"
                >
                  <X aria-hidden size={11} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => {
            setInput(e.target.value)
            setOpen(true)
            setHighlight(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false)
            if (input.trim()) add(input)
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={label}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${listId}-${highlight}` : undefined}
          className={
            editorial
              ? "h-11 w-full rounded-[10px] bg-surface px-3 text-[15px] text-ink outline-none ring-1 ring-inset ring-ink/15 placeholder:text-muted/70 focus:ring-2 focus:ring-brand"
              : "w-full bg-transparent outline-none text-xs text-flow-text placeholder:opacity-50"
          }
        />

        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg py-1 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.35)]"
            style={{ background: "rgb(var(--flow-surface))", border: "1px solid var(--flow-border-strong)" }}
          >
            {suggestions.map((admin, i) => (
              <li
                key={admin.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                // mousedown, not click: it lands before the input's blur would
                // add the half-typed text instead.
                onMouseDown={e => {
                  e.preventDefault()
                  add(admin.name)
                }}
                onMouseEnter={() => setHighlight(i)}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] font-medium"
                style={{
                  color: "rgb(var(--flow-text))",
                  background: i === highlight ? "rgb(var(--accent-1) / 0.1)" : "transparent",
                }}
              >
                <Monogram name={admin.name} src={admin.avatar} size={22} />
                {admin.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
