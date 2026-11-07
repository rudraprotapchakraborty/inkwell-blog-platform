// Promote (or demote) an account to writer/admin:
//   npm run make-admin -- someone@example.com        -> admin
//   npm run make-admin -- someone@example.com user   -> back to member
import "./env.mjs"
import { requireUri } from "./env.mjs"
import { MongoClient } from "mongodb"

const [email, role = "admin"] = process.argv.slice(2)
if (!email || !["admin", "user"].includes(role)) {
  console.error("Usage: npm run make-admin -- <email> [admin|user]")
  process.exit(1)
}

const client = await new MongoClient(requireUri()).connect()
try {
  const res = await client
    .db()
    .collection("users")
    .updateOne({ email: email.trim().toLowerCase() }, { $set: { role, updatedAt: new Date() } })
  console.log(res.matchedCount ? `${email} is now ${role}.` : `No account found for ${email}.`)
} finally {
  await client.close()
}
