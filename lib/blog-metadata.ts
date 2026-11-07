import type { Metadata } from "next"
import type { BlogRecord } from "@/lib/blog-db"

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")

const SITE_CONFIG = {
  inkwell: {
    siteName: "Inkwell",
    baseUrl: BASE_URL,
    blogPath: "/blogs",
    brand: "Inkwell",
  },
} as const

export type BlogSite = keyof typeof SITE_CONFIG

/** Where a blog's posts live on this site, e.g. "/blogs". */
export function getBlogPath(site: BlogSite): string {
  return SITE_CONFIG[site].blogPath
}

/** Canonical public URL for a post — share targets need an absolute URL. */
export function getBlogPostUrl(slug: string, site: BlogSite): string {
  const config = SITE_CONFIG[site]
  return `${config.baseUrl}${config.blogPath}/${slug}`
}

export function getBlogSeoDescription(blog: Pick<BlogRecord, "metaDescription" | "excerpt">): string {
  const description = blog.metaDescription?.trim() || blog.excerpt?.trim()
  return description || "Read the latest stories on Inkwell."
}

export function generateBlogPostMetadata(blog: BlogRecord, site: BlogSite): Metadata {
  const config = SITE_CONFIG[site]
  const description = getBlogSeoDescription(blog)
  const path = `${config.blogPath}/${blog.slug}`
  const url = `${config.baseUrl}${path}`
  const title = blog.title

  return {
    title,
    description,
    metadataBase: new URL(config.baseUrl),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: config.siteName,
      type: "article",
      publishedTime: blog.createdAt,
      modifiedTime: blog.updatedAt ?? blog.createdAt,
      authors: blog.authors?.length ? blog.authors : [blog.author],
      tags: blog.tags,
      // `images` is deliberately omitted: the sibling opengraph-image.tsx
      // supplies it, so cover art and the generated fallback have one source.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export function generateBlogListingMetadata(site: BlogSite): Metadata {
  const config = SITE_CONFIG[site]
  const title = "Blog"
  const description = "Stories, guides and ideas written and published on Inkwell."

  return {
    title,
    description,
    alternates: { canonical: `${config.baseUrl}${config.blogPath}` },
    openGraph: {
      title,
      description,
      url: `${config.baseUrl}${config.blogPath}`,
      siteName: config.siteName,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
  }
}

export function generateArticleJsonLd(blog: BlogRecord, site: BlogSite) {
  const config = SITE_CONFIG[site]
  const description = getBlogSeoDescription(blog)
  const url = `${config.baseUrl}${config.blogPath}/${blog.slug}`

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: blog.title,
    description,
    image: blog.coverImage ? [blog.coverImage] : undefined,
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt ?? blog.createdAt,
    author: {
      "@type": "Person",
      name: blog.author,
    },
    publisher: {
      "@type": "Organization",
      name: config.brand,
      url: config.baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: blog.tags?.length ? blog.tags.join(", ") : undefined,
    articleSection: blog.category,
  }
}
