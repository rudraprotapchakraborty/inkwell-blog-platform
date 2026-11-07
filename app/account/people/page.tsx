import type { Metadata } from "next"
import { requireAccountPage } from "@/lib/account-page"
import PeopleManager from "./PeopleManager"

export const metadata: Metadata = { title: "People", robots: { index: false } }

export default async function PeoplePage() {
  const me = await requireAccountPage("/account/people", { admin: true })
  return (
    <section className="frame pt-8">
      <p className="eyeline">Administration</p>
      <h1 className="display mt-2 text-4xl sm:text-5xl">
        <span className="accent text-5xl sm:text-6xl">People</span> and roles
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Writers can publish and edit every post. Members can read, like, comment and share.
      </p>
      <PeopleManager meId={me.sub} />
    </section>
  )
}
