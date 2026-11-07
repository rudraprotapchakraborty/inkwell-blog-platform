"use client"

import { useCallback, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react"
import ConfirmDialog from "@/components/ConfirmDialog"
import { Avatar } from "@/components/auth/user-menu"
import type { DirectoryEntry } from "@/lib/users"

export default function PeopleManager({ meId }: { meId: string }) {
  const [people, setPeople] = useState<DirectoryEntry[] | null>(null)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<DirectoryEntry | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not load accounts.")
      setPeople([...data.admins, ...data.members])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accounts.")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function setRole(p: DirectoryEntry, role: "admin" | "user") {
    setBusyId(p.id)
    const res = await fetch(`/api/admin/users/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    const data = await res.json().catch(() => ({}))
    setBusyId(null)
    if (!res.ok) return toast.error(data.error || "Could not change the role.")
    toast.success(role === "admin" ? `${p.name} can now write` : `${p.name} is now a member`)
    load()
  }

  async function remove() {
    if (!deleting) return
    setBusyId(deleting.id)
    const res = await fetch(`/api/admin/users/${deleting.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    setBusyId(null)
    setDeleting(null)
    if (!res.ok) return toast.error(data.error || "Could not delete the account.")
    toast.success("Account deleted")
    load()
  }

  if (error) return <p role="alert" className="mt-8 text-danger">{error}</p>

  if (!people) {
    return (
      <div className="mt-8 space-y-3" aria-busy="true">
        {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-[72px] w-full" />)}
      </div>
    )
  }

  return (
    <>
      {deleting && (
        <ConfirmDialog
          title="Delete this account?"
          message={`${deleting.name} will be removed for good. Posts they published stay up.`}
          busy={busyId === deleting.id}
          confirmLabel="Delete account"
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
      <ul className="mt-8 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        {people.map(p => {
          const self = p.id === meId
          return (
            <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <Avatar user={{ sub: p.id, role: p.role, name: p.name, email: p.email, avatar: p.avatar }} size={44} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <span className="truncate">{p.name}</span>
                  {p.role === "admin" && <span className="chip bg-brand-soft text-brand">Writer</span>}
                  {self && <span className="chip bg-line text-muted">You</span>}
                </p>
                <p className="truncate text-sm text-muted">{p.email} · {p.providers.join(" + ")}</p>
              </div>
              {!self && (
                <div className="flex gap-2">
                  {p.role === "admin" ? (
                    <button type="button" disabled={busyId === p.id} onClick={() => setRole(p, "user")} className="btn btn-ghost btn-sm">
                      <ShieldOff className="h-4 w-4" /> Make member
                    </button>
                  ) : (
                    <button type="button" disabled={busyId === p.id} onClick={() => setRole(p, "admin")} className="btn btn-primary btn-sm">
                      <ShieldCheck className="h-4 w-4" /> Make writer
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => setDeleting(p)}
                    aria-label={`Delete ${p.name}`}
                    className="btn btn-ghost btn-sm text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
