import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { COOKIE_NAME, verifyToken } from "@/lib/auth"
import { AccountSettings } from "@/components/account/account-settings"
import { pageMetadata } from "@/lib/page-metadata"

export function generateMetadata() {
  return pageMetadata("accountSettings", "/account/settings", { noIndex: true })
}

/** Name, sign-in email and password for the signed-in account. */
export default async function AccountSettingsPage() {
  const cookieStore = await cookies()
  const payload = verifyToken(cookieStore.get(COOKIE_NAME)?.value || "")
  if (!payload) redirect("/login?from=/account/settings")

  return <AccountSettings initialUser={payload} />
}
