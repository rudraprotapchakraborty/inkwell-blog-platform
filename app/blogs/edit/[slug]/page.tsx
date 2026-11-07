import BlogEditorWrapper from "./BlogEditorWrapper"

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <BlogEditorWrapper slug={slug} />
}
