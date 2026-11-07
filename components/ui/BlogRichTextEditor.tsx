"use client"

import { useT } from "@/lib/i18n"
import { editorUiMessages } from "@/lib/i18n/messages/editorUi"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, useEditorState, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Underline from "@tiptap/extension-underline"
import { Markdown } from "tiptap-markdown"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImagePlus,
  Loader2,
  Undo2,
  Redo2,
  Minus,
  Table2,
  BetweenHorizontalEnd,
  BetweenVerticalEnd,
  TableRowsSplit,
  TableColumnsSplit,
  Trash2,
  RectangleHorizontal,
} from "lucide-react"
import { uploadImageFile } from "@/components/ui/ImageUpload"
import { normalizeBlogMarkdown } from "@/lib/blog-markdown-normalize"
import { blogTableExtensions } from "@/components/ui/blog-table"
import { BLOG_BUTTON_TITLE } from "@/lib/blog-markdown"

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif"
const MAX_INPUT_MB = 20

function BlogImageView({ node, selected, updateAttributes }: NodeViewProps) {
  const t = useT(editorUiMessages)
  const { src, alt } = node.attrs
  const missing = !String(alt ?? "").trim()

  return (
    <NodeViewWrapper className="blog-editor-image-block my-6 sm:my-8">
      <div
        className={`rounded-2xl overflow-hidden transition-shadow ${selected ? "ring-2 ring-[rgb(var(--accent-1))] ring-offset-2 ring-offset-[var(--flow-card)]" : ""}`}
        style={{ border: "1px solid var(--flow-border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} className="w-full h-auto block" draggable={false} />
      </div>
      {/* Alt text: what search engines and screen readers get instead of the picture. */}
      <label className="mt-2 flex items-center gap-2 text-xs" contentEditable={false}>
        <span className="shrink-0 font-semibold" style={{ color: missing ? "rgb(217 119 6)" : "rgb(var(--flow-text-soft))" }}>
          {t("image.altLabel")}
        </span>
        <input
          type="text"
          value={alt ?? ""}
          onChange={e => updateAttributes({ alt: e.target.value.replace(/[[\]\n]/g, "") || null })}
          placeholder={t("image.altPlaceholder")}
          className="min-w-0 flex-1 select-text rounded-lg px-2.5 py-1.5 outline-none"
          style={{
            background: "rgb(var(--flow-text) / 0.04)",
            color: "rgb(var(--flow-text))",
            border: `1px solid ${missing ? "rgb(217 119 6 / 0.5)" : "var(--flow-border)"}`,
          }}
        />
      </label>
    </NodeViewWrapper>
  )
}

const BlogImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      alt: { default: null },
      title: { default: null },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(BlogImageView)
  },
})

/**
 * Links, plus the button block: a link titled "button", saved as
 * `[Label](url "button")`. In the editor it carries data-button instead of a
 * title, so it is styled as a button and shows no "button" tooltip.
 */
const BlogLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      title: {
        default: null,
        parseHTML: el => el.getAttribute("title") ?? (el.hasAttribute("data-button") ? BLOG_BUTTON_TITLE : null),
        renderHTML: attrs =>
          attrs.title === BLOG_BUTTON_TITLE ? { "data-button": "" } : attrs.title ? { title: attrs.title } : {},
      },
    }
  },
})

function getMarkdown(editor: ReturnType<typeof useEditor>) {
  if (!editor) return ""
  const storage = editor.storage as unknown as { markdown?: { getMarkdown: () => string } }
  return storage.markdown?.getMarkdown() ?? ""
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-all disabled:opacity-40"
      style={{
        background: active ? "rgb(var(--accent-1) / 0.15)" : "transparent",
        color: active ? "rgb(var(--accent-1))" : "rgb(var(--flow-text))",
      }}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-6 mx-0.5" style={{ background: "var(--flow-border-strong)" }} />
}

interface BlogRichTextEditorProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeight?: number
  /** Where the toolbar sticks; defaults to just under the site navbar. */
  stickyTop?: string
}

export default function BlogRichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 400,
  stickyTop = "var(--cs-nav-offset, 0px)",
}: BlogRichTextEditorProps) {
  const t = useT(editorUiMessages)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState("")
  const skipExternalSync = useRef(false)
  const lastEmitted = useRef(value)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      BlogLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "font-medium underline underline-offset-2",
          style: "color: rgb(var(--accent-2))",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      BlogImage.configure({ inline: false, allowBase64: false }),
      ...blogTableExtensions,
      Placeholder.configure({ placeholder: placeholder ?? t("toolbar.placeholder") }),
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: normalizeBlogMarkdown(value || ""),
    editorProps: {
      attributes: {
        class: "blog-rich-editor-content outline-none",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const md = normalizeBlogMarkdown(getMarkdown(ed))
      skipExternalSync.current = true
      lastEmitted.current = md
      onChange(md)
    },
  })

  useEffect(() => {
    if (!editor) return
    if (skipExternalSync.current) {
      skipExternalSync.current = false
      return
    }
    const normalized = normalizeBlogMarkdown(value || "")
    if (normalized !== lastEmitted.current && normalized !== normalizeBlogMarkdown(getMarkdown(editor))) {
      editor.commands.setContent(normalized)
      lastEmitted.current = normalized
    }
  }, [value, editor])

  const setBlock = useCallback(
    (level: 0 | 1 | 2 | 3) => {
      if (!editor) return
      if (level === 0) {
        editor.chain().focus().setParagraph().run()
      } else {
        editor.chain().focus().setHeading({ level }).run()
      }
    },
    [editor]
  )

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt(t("toolbar.linkPrompt"), prev || "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const handleImageFiles = useCallback(
    async (files: FileList | null | undefined) => {
      if (!editor || !files?.length) return
      setImageError("")
      setImageBusy(true)

      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) {
            setImageError(t("upload.chooseImagesOnly"))
            continue
          }
          if (file.size > MAX_INPUT_MB * 1024 * 1024) {
            setImageError(`Each image must be under ${MAX_INPUT_MB}MB.`)
            continue
          }
          const url = await uploadImageFile(file, { maxDim: 1920 })
          editor.chain().focus().setImage({ src: url }).run()
        }
      } catch (e) {
        setImageError(e instanceof Error ? e.message : t("upload.failed"))
      } finally {
        setImageBusy(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [editor]
  )

  const insertButton = useCallback(() => {
    if (!editor) return
    // Inside a button already: turn it back into a plain link.
    if (editor.isActive("link", { title: BLOG_BUTTON_TITLE })) {
      editor.chain().focus().extendMarkRange("link").updateAttributes("link", { title: null }).run()
      return
    }
    const { from, to, empty } = editor.state.selection
    const selected = empty ? "" : editor.state.doc.textBetween(from, to, " ").trim()
    const label = selected || window.prompt(t("toolbar.buttonLabelPrompt"), t("toolbar.buttonLabelDefault"))?.trim()
    if (!label) return
    const url = window.prompt(t("toolbar.buttonUrlPrompt"), editor.getAttributes("link").href || "https://")?.trim()
    if (!url || url === "https://") return
    const link = { href: url, title: BLOG_BUTTON_TITLE }
    if (!empty) {
      // Selected text becomes the button; the cursor then lands after it.
      editor.chain().focus().extendMarkRange("link").setLink(link).run()
      editor.commands.setTextSelection(editor.state.selection.to)
      return
    }
    // Its own paragraph, with an empty one after so typing doesn't grow the button.
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "paragraph", content: [{ type: "text", text: label, marks: [{ type: "link", attrs: link }] }] },
        { type: "paragraph" },
      ])
      .run()
  }, [editor])

  // Subscribed, not read off the editor: v3 doesn't re-render on cursor moves,
  // so the style menu and the active buttons have to follow the cursor this way.
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      block: ed?.isActive("heading", { level: 1 })
        ? "h1"
        : ed?.isActive("heading", { level: 2 })
          ? "h2"
          : ed?.isActive("heading", { level: 3 })
            ? "h3"
            : "p",
      bold: !!ed?.isActive("bold"),
      italic: !!ed?.isActive("italic"),
      underline: !!ed?.isActive("underline"),
      bulletList: !!ed?.isActive("bulletList"),
      orderedList: !!ed?.isActive("orderedList"),
      blockquote: !!ed?.isActive("blockquote"),
      link: !!ed?.isActive("link"),
      button: !!ed?.isActive("link", { title: BLOG_BUTTON_TITLE }),
      inTable: !!ed?.isActive("table"),
      inHeaderRow: !!ed?.isActive("tableHeader"),
    }),
  })
  const blockValue = state?.block ?? "p"
  const inTable = !!state?.inTable
  const inHeaderRow = !!state?.inHeaderRow

  return (
    // No overflow clipping here: it would stop the toolbar from sticking.
    <div className="blog-rich-editor rounded-xl" style={{ border: "1px solid var(--flow-border-strong)" }}>
      {/* Toolbar: sticks under the navbar (and anything else above it) while the post scrolls. */}
      <div
        className="sticky z-20 flex flex-wrap items-center gap-0.5 rounded-t-xl px-2 py-2"
        style={{
          top: stickyTop,
          transition: "top 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          background: "var(--flow-card-solid)",
          borderBottom: "1px solid var(--flow-border)",
        }}
      >
        <select
          value={blockValue}
          onChange={e => {
            const v = e.target.value
            if (v === "p") setBlock(0)
            else if (v === "h1") setBlock(1)
            else if (v === "h2") setBlock(2)
            else setBlock(3)
          }}
          className="h-8 px-2 mr-1 rounded-lg text-xs font-semibold outline-none cursor-pointer"
          style={{
            background: "rgb(var(--flow-text) / 0.04)",
            color: "rgb(var(--flow-text))",
            border: "1px solid var(--flow-border)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <option value="p">{t("toolbar.normalText")}</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <ToolbarDivider />

        <ToolbarButton
          title={t("toolbar.bold")}
          active={state?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          title={t("toolbar.italic")}
          active={state?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          title={t("toolbar.underline")}
          active={state?.underline}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title={t("toolbar.bulletList")}
          active={state?.bulletList}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          title={t("toolbar.numberedList")}
          active={state?.orderedList}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          title={t("toolbar.quote")}
          active={state?.blockquote}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton title={t("toolbar.insertLink")} active={state?.link && !state.button} onClick={setLink}>
          <Link2 size={15} />
        </ToolbarButton>

        <ToolbarButton title={t("toolbar.insertButton")} active={state?.button} onClick={insertButton}>
          <RectangleHorizontal size={15} />
        </ToolbarButton>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={e => handleImageFiles(e.target.files)}
        />
        <ToolbarButton
          title={t("toolbar.insertImage")}
          disabled={imageBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {imageBusy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        </ToolbarButton>

        <ToolbarButton
          title={t("toolbar.divider")}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>

        <ToolbarButton
          title={t("toolbar.insertTable")}
          active={inTable}
          disabled={inTable}
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <Table2 size={15} />
        </ToolbarButton>

        {/* Row and column tools, only while the cursor is in a table. */}
        {inTable && (
          <>
            <ToolbarDivider />
            <ToolbarButton title={t("toolbar.addRow")} onClick={() => editor?.chain().focus().addRowAfter().run()}>
              <BetweenHorizontalEnd size={15} />
            </ToolbarButton>
            <ToolbarButton title={t("toolbar.addColumn")} onClick={() => editor?.chain().focus().addColumnAfter().run()}>
              <BetweenVerticalEnd size={15} />
            </ToolbarButton>
            <ToolbarButton
              title={t("toolbar.deleteRow")}
              // The first row is the header a markdown table needs; it goes only with the table.
              disabled={inHeaderRow}
              onClick={() => editor?.chain().focus().deleteRow().run()}
            >
              <TableRowsSplit size={15} />
            </ToolbarButton>
            <ToolbarButton title={t("toolbar.deleteColumn")} onClick={() => editor?.chain().focus().deleteColumn().run()}>
              <TableColumnsSplit size={15} />
            </ToolbarButton>
            <ToolbarButton title={t("toolbar.deleteTable")} onClick={() => editor?.chain().focus().deleteTable().run()}>
              <Trash2 size={15} />
            </ToolbarButton>
          </>
        )}

        <div className="flex-1" />

        <ToolbarButton title={t("toolbar.undo")} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton title={t("toolbar.redo")} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      {imageError && (
        <p className="px-3 py-1.5 text-[11px]" style={{ color: "rgb(239 68 68)", background: "rgb(239 68 68 / 0.08)" }}>
          {imageError}
        </p>
      )}

      {/* Editor canvas */}
      <div className="px-4 sm:px-5 py-4 sm:py-5" style={{ background: "transparent" }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}