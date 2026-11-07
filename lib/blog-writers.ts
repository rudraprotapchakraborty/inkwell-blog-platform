import type { Db } from "mongodb"

/**
 * Profile pictures for writers who are admin accounts, keyed by account name.
 *
 * A post's writers are names, picked in the editor from the admins or typed
 * freely, so a byline finds its picture by name. Only admins write, and there
 * are few of them, so this is one small query per page.
 */
export async function adminAvatarsByName(db: Db): Promise<Map<string, string>> {
  const admins = await db
    .collection("users")
    .find({ role: "admin", avatar: { $nin: [null, ""] } }, { projection: { name: 1, avatar: 1 } })
    .toArray()
  return new Map(
    admins
      .filter(a => typeof a.name === "string" && a.name.trim())
      .map(a => [String(a.name).trim(), String(a.avatar)])
  )
}

/** A post's writers in order, from `authors`, or the older joined `author` line. */
export function writersOf(doc: Record<string, unknown>): string[] {
  const list = Array.isArray(doc.authors) ? doc.authors.map(String).map(a => a.trim()).filter(Boolean) : []
  if (list.length) return list
  return String(doc.author ?? "").split(",").map(a => a.trim()).filter(Boolean)
}
