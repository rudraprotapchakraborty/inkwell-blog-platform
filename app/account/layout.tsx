import { AccountNav } from "@/components/account/account-nav"
import { currentAccount } from "@/lib/account-page"

/**
 * The account area: Account and Settings for everyone, plus People for
 * administrators. Each page still checks who may see it.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const me = await currentAccount()
  // Signed out: the page itself sends them to the login page.
  if (!me) return <>{children}</>

  return (
    <div className="pb-12">
      <div className="frame pt-10">
        <AccountNav isAdmin={me.role === "admin"} />
      </div>
      {children}
    </div>
  )
}
