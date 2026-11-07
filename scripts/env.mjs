import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/** Loads .env.local (git-ignored) into process.env for the helper scripts. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
for (const name of [".env.local", ".env"]) {
  const file = path.join(root, name)
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "")
  }
}

export function requireUri() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.")
    process.exit(1)
  }
  return process.env.MONGODB_URI
}
