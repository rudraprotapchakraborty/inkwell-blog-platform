import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, safeRedirectPath, verifyToken } from "@/lib/auth"
import LoginClient from "./LoginClient"

/** Signed-in visitors have nothing to do here: send them on to their account. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (token && verifyToken(token)) redirect(safeRedirectPath((await searchParams).from))
  return <LoginClient />
}
