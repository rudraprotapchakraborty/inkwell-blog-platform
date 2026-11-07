"use client"

import BlogEditor from "../../BlogEditor"

export default function BlogEditorWrapper({ slug }: { slug: string }) {
  return <BlogEditor editSlug={slug} />
}
