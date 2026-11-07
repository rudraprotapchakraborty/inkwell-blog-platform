import type { Metadata, Viewport } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import Providers from "@/components/Providers"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Inkwell | A blog writing platform", template: "%s | Inkwell" },
  description:
    "Inkwell is a blog writing platform: draft in a clean rich-text editor, publish when it is ready, and let readers like, comment and share.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1b1e2b",
}

/** Applies the saved theme before the first paint so there is no flash. */
const themeScript = `try{var t=localStorage.getItem("ink_theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Navbar />
        <main className="min-h-[70vh] pt-[68px]">{children}</main>
        <Footer />
        <Providers />
      </body>
    </html>
  )
}
