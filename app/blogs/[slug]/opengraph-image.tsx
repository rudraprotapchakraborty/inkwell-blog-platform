import { getBlogBySlug } from "@/lib/blog-db"
import { OG_CONTENT_TYPE, OG_SIZE, renderBlogOgImage } from "@/lib/blog-og-image"

export const alt = "Inkwell blog post"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  return renderBlogOgImage({
    title: blog?.title ?? "Inkwell",
    category: blog?.category ?? "General",
    brand: "Inkwell",
    coverImage: blog?.coverImage,
  })
}
