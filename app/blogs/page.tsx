import { cookies } from "next/headers"
import { COOKIE_NAME, verifyToken } from "@/lib/auth"
import { listPublishedBlogs } from "@/lib/blogs-feed"
import BlogsClient, { type Blog } from "./BlogsClient"

/**
 * The journal, rendered on the server: the posts are in the HTML the moment it
 * arrives — readable by search engines, and with nothing to load in and push
 * the page about — and the reader's session comes from their cookie, so the
 * "write a post" prompt is right first time too.
 */
export default async function BlogsPage() {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  const session = token ? verifyToken(token) : null

  // A database hiccup shows an empty journal rather than an error page, which
  // is what the client-side fetch did before.
  const blogs = await listPublishedBlogs().catch(() => [])

  return (
    <BlogsClient
      initialBlogs={blogs as unknown as Blog[]}
      initialViewer={session ? { sub: session.sub, name: session.name || session.email || "", avatar: session.avatar } : null}
      initialIsAdmin={session?.role === "admin"}
    />
  )
}
