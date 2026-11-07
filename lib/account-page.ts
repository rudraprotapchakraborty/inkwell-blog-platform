import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, verifyToken, type AuthPayload } from "@/lib/auth"

/** The signed-in account for a server page, or null. */
export async function currentAccount(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value || "")
}

/**
 * Gate for a page in the account area. Signed out: off to the login page,
 * coming back here afterwards. An admin-only tab opened by a member: back to
 * their Account tab with a note, rather than a bare 404.
 */
export async function requireAccountPage(path: string, { admin = false } = {}): Promise<AuthPayload> {
  const me = await currentAccount()
  if (!me) redirect(`/login?from=${encodeURIComponent(path)}`)
  if (admin && me.role !== "admin") redirect("/account?denied=1")
  return me
}
