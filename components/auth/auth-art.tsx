import { LogoMark } from "@/components/Brand"

/** Decorative panel beside the sign-up forms: a draft page with a quill. Desktop only. */
export default function AuthArt() {
  return (
    <div aria-hidden className="grid-panel relative overflow-hidden rounded-[28px] border border-line p-10">
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <LogoMark size={36} />
          <p className="eyeline">Draft · autosaved</p>
        </div>
        <p className="mt-5 text-3xl font-semibold leading-tight tracking-tight">
          Every good post starts as a <span className="accent text-4xl">rough page.</span>
        </p>
        <div className="mt-6 space-y-2.5">
          <div className="h-2.5 w-full rounded-full bg-line" />
          <div className="h-2.5 w-11/12 rounded-full bg-line" />
          <div className="h-2.5 w-4/5 rounded-full bg-line" />
          <div className="h-2.5 w-2/3 rounded-full bg-line" />
        </div>
      </div>
      <ul className="mt-6 grid gap-3 text-sm text-ink">
        {["Like, comment and share the stories you love", "Writers draft, edit and publish their own posts", "Sign in with email or Google"].map(t => (
          <li key={t} className="flex items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
