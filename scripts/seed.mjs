// Seeds demo accounts and Wikipedia-sourced posts into the Inkwell database.
//   npm run seed          -> add what is missing (safe to re-run)
//   npm run seed -- --reset-posts   -> also remove previously seeded posts first
// Post text and photos come only from Wikipedia (CC BY-SA), credited at the end of each post.
import { requireUri } from "./env.mjs"
import { MongoClient } from "mongodb"
import bcrypt from "bcryptjs"

const DEMO_PASSWORD = "Inkwell2026"
const UA = "InkwellSeed/1.0 (personal portfolio project)"

const ACCOUNTS = [
  { email: "priya@inkwell.demo", name: "Priya Nair", role: "user" },
  { email: "leo@inkwell.demo", name: "Leo Fischer", role: "user" },
  { email: "amara@inkwell.demo", name: "Amara Diallo", role: "user" },
  { email: "writer@inkwell.demo", name: "Mira Okafor", role: "admin" },
  { email: "reader@inkwell.demo", name: "Sam Rivera", role: "user" },
]

// [Wikipedia title, category, tags]
const TOPICS = [
  ["Printing press", "On the press that changed how we read", "Culture", ["history", "printing", "books"]],
  ["Typography", "The quiet craft of setting type", "Design", ["type", "design", "letters"]],
  ["Essay", "Why the essay is still the best way to think", "Writing", ["writing", "craft", "literature"]],
  ["Coffeehouse", "Penny universities: the coffeehouse as a place for ideas", "Culture", ["cafes", "history", "social"]],
  ["Sourdough", "A slow loaf: what sourdough asks of the baker", "Food", ["baking", "bread", "fermentation"]],
  ["Mountaineering", "Up and back: a short guide to mountaineering", "Travel", ["mountains", "adventure", "outdoors"]],
  ["Tea", "A cup of tea, from leaf to ritual", "Food", ["tea", "culture", "drinks"]],
  ["Haiku", "Seventeen syllables: reading the haiku", "Writing", ["poetry", "japan", "form"]],
  ["Lighthouse", "Keeping the light: a brief history of lighthouses", "Travel", ["coast", "architecture", "sea"]],
  ["Calligraphy", "The beauty of the written line", "Design", ["handwriting", "art", "tools"]],
]

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "")
}

async function wiki(params) {
  const url = "https://en.wikipedia.org/w/api.php?" + new URLSearchParams({ format: "json", origin: "*", ...params })
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } })
    if (res.ok) return res.json()
    if (res.status !== 429 && res.status < 500) throw new Error(`Wikipedia ${res.status}`)
    await new Promise(r => setTimeout(r, 4000 * (attempt + 1)))
  }
  throw new Error("Wikipedia kept refusing; try again in a minute")
}

/** Turns a plain-text Wikipedia extract into markdown with ## headings, keeping the first few sections. */
function toMarkdown(extract) {
  const skip = /^(see also|references|external links|further reading|notes|bibliography|sources)$/i
  const lines = extract.split(/\r?\n/)
  const out = []
  let keep = true
  let sections = 0
  for (const line of lines) {
    const h = line.match(/^(={2,4})\s*(.+?)\s*\1$/)
    if (h) {
      keep = !skip.test(h[2])
      if (keep) {
        if (++sections > 5) break
        out.push(`\n## ${h[2]}\n`)
      }
      continue
    }
    if (keep && line.trim()) out.push(line.trim() + "\n")
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/** Whole sentences up to a length limit. */
function firstSentences(text, max) {
  const parts = text.replace(/([^)]*)/g, "").replace(/s+/g, " ").split(/(?<=[.!?])s+/)
  let out = ""
  for (const p of parts) {
    if ((out + " " + p).trim().length > max) break
    out = (out + " " + p).trim()
  }
  return out || parts[0].slice(0, max)
}

const client = await new MongoClient(requireUri()).connect()
try {
  const db = client.db()
  const users = db.collection("users")
  await users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } })
  await db.collection("blogs").createIndex({ slug: 1 }, { unique: true })

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const ids = {}
  for (const a of ACCOUNTS) {
    const now = new Date()
    const existing = await users.findOne({ email: a.email })
    if (existing) {
      ids[a.email] = existing._id.toString()
      await users.updateOne({ _id: existing._id }, { $set: { role: a.role } })
      continue
    }
    const r = await users.insertOne({
      email: a.email, name: a.name, password: passwordHash, role: a.role, providers: ["password"],
      emailVerified: true, createdAt: now, updatedAt: now, lastLoginAt: now,
    })
    ids[a.email] = r.insertedId.toString()
    console.log("created account", a.email)
  }

  const blogs = db.collection("blogs")
  if (process.argv.includes("--reset-posts")) {
    const del = await blogs.deleteMany({ seeded: true })
    console.log("removed", del.deletedCount, "seeded posts")
  }

  const writerId = ids["writer@inkwell.demo"]
  let added = 0
  for (const [title, headline, category, tags] of TOPICS) {
    const slug = slugify(headline)
    if (await blogs.findOne({ slug })) continue

    const data = await wiki({
      action: "query", prop: "extracts|pageimages", titles: title, redirects: "1",
      explaintext: "1", exsectionformat: "wiki", piprop: "original", pilicense: "any",
    })
    const page = Object.values(data.query.pages)[0]
    if (!page?.extract) { console.log("skip (no text)", title); continue }

    const md = toMarkdown(page.extract)
    const paragraphs = md.split(/\n\n/).filter(p => !p.startsWith("## "))
    const excerpt = (paragraphs[0] || "").slice(0, 220).replace(/\s+\S*$/, "") + "…"
    const words = md.split(/\s+/).length
    const slugTitle = headline
    const content =
      md +
      `\n\n---\n\n*Adapted from the Wikipedia article on [${page.title}](https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}), available under CC BY-SA 4.0.*`

    const now = new Date(Date.now() - (TOPICS.findIndex(t => t[0] === title) * 36 + 6) * 3600 * 1000)
    await blogs.insertOne({
      title: slugTitle,
      slug,
      excerpt,
      content,
      coverImage: (page.original?.source || "").split("?")[0],
      category,
      tags,
      authors: ["Mira Okafor"],
      author: "Mira Okafor",
      readTime: `${Math.max(1, Math.round(words / 200))} min read`,
      keyTakeaways: paragraphs.slice(1, 4).map(p => p.split(/(?<=[.!?])\s/)[0].slice(0, 160)),
      published: true,
      metaDescription: excerpt.slice(0, 155),
      inboundLinks: [],
      outboundLinks: [{ label: `${page.title} on Wikipedia`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}` }],
      authorId: writerId,
      authorRole: "admin",
      seeded: true,
      createdAt: now,
      updatedAt: now,
    })
    added++
    console.log("added", slug)
  }

  // ---- Demo engagement: likes, shares, views and comments on every post ----
  const COMMENTS = [
    "Really enjoyed this. I had no idea how much history sat behind something so ordinary.",
    "Well written and easy to follow. Saving this to read again.",
    "The section in the middle taught me something new. Thank you for sharing it.",
    "Lovely photo choice too. It sets the tone for the whole piece.",
    "I shared this with a friend who has been asking about exactly this topic.",
    "Short enough to finish on a coffee break, deep enough to keep thinking about afterwards.",
    "Great read. Would love a follow-up that goes further into the details.",
    "This is why I like reading here: calm, clear and no rush.",
    "Bookmarked. The key takeaways at the top are a nice touch.",
    "I came for the title and stayed for the history. Nicely done.",
  ]
  const NETWORKS = ["facebook", "instagram", "x", "whatsapp", "copy"]
  const rid = () => Array.from({ length: 20 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")
  const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n)

  await Promise.all([
    db.collection("blog_likes").createIndex({ blogId: 1, visitorId: 1 }, { unique: true }),
    db.collection("blog_views").createIndex({ blogId: 1 }, { unique: true }),
  ])
  await Promise.all(["blog_likes", "blog_comments", "blog_shares"].map(c => db.collection(c).deleteMany({ seeded: true })))

  const commenters = await users.find({ email: { $in: ["reader@inkwell.demo", "priya@inkwell.demo", "leo@inkwell.demo", "amara@inkwell.demo"] } }).toArray()
  const allPosts = await blogs.find({ published: true }).toArray()
  for (const post of allPosts) {
    const blogId = post._id.toString()
    const base = new Date(post.createdAt).getTime()

    const likes = 9 + Math.floor(Math.random() * 52)
    await db.collection("blog_likes").insertMany(
      Array.from({ length: likes }, () => ({ blogId, visitorId: rid(), createdAt: new Date(base + Math.random() * 86400000 * 3), seeded: true })),
    )

    const shares = 2 + Math.floor(Math.random() * 14)
    await db.collection("blog_shares").insertMany(
      Array.from({ length: shares }, () => ({ blogId, network: NETWORKS[Math.floor(Math.random() * NETWORKS.length)], createdAt: new Date(base + Math.random() * 86400000 * 3), seeded: true })),
    )

    await db.collection("blog_views").updateOne({ blogId }, { $set: { count: 140 + Math.floor(Math.random() * 760) } }, { upsert: true })

    const chosen = pick(commenters, 2 + Math.floor(Math.random() * 3))
    const texts = pick(COMMENTS, chosen.length)
    await db.collection("blog_comments").insertMany(
      chosen.map((u, i) => ({
        blogId,
        userId: u._id.toString(),
        name: u.name.split(" ")[0],
        avatar: "",
        text: texts[i],
        createdAt: new Date(base + (i + 1) * 3600000 * (2 + Math.floor(Math.random() * 20))),
        seeded: true,
      })),
    )
  }
  console.log("engagement added to", allPosts.length, "posts")
  console.log(`done: ${added} posts added. Demo password for both accounts: ${DEMO_PASSWORD}`)
} finally {
  await client.close()
}
