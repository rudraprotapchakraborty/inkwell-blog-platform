"use client"

import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import Footer from "./Footer"

/** Pages that bring their own header (the sign-in flow) and so hide the site chrome. */
const STANDALONE = ["/login", "/register", "/forgot-password"]

export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const standalone = STANDALONE.some(p => pathname === p || pathname.startsWith(`${p}/`))

  if (standalone) return <main>{children}</main>

  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] pt-[68px]">{children}</main>
      <Footer />
    </>
  )
}
