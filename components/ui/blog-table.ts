import { Extension } from "@tiptap/react"
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table"
import type { Node as PMNode } from "@tiptap/pm/model"

/**
 * Tables for the blog editor. Posts are stored as markdown, so a table has to
 * survive the trip to a GFM pipe table and back. tiptap-markdown's own table
 * writer gives up on anything it can't express (a body row turned header, a
 * cell with two paragraphs) and, with HTML off, saves the literal text
 * "[table]" — the whole table lost. These pieces keep every table expressible
 * instead:
 *
 * - each cell holds exactly one paragraph, so its content is always one line;
 * - Enter moves to the next cell (as Tab does) and line breaks are refused,
 *   since a pipe-table cell cannot hold either;
 * - the writer below always emits a pipe table, first row as the header, with
 *   any "|" in the text escaped so it cannot split a cell.
 */

/** The parts of tiptap-markdown's serializer state the writer uses. */
type MarkdownState = {
  inTable: boolean
  write: (text: string) => void
  ensureNewLine: () => void
  closeBlock: (node: PMNode) => void
  renderInline: (node: PMNode) => void
  esc: (text: string, startOfLine?: boolean) => string
}

const BlogTableNode = Table.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: MarkdownState, node: PMNode) {
          const esc = state.esc
          state.esc = (text, startOfLine) => esc.call(state, text, startOfLine).replace(/\|/g, "\\|")
          state.inTable = true
          try {
            node.forEach((row, _offset, rowIndex) => {
              state.write("| ")
              row.forEach((cell, _cellOffset, cellIndex) => {
                if (cellIndex) state.write(" | ")
                const paragraph = cell.firstChild
                if (paragraph?.textContent.trim()) state.renderInline(paragraph)
              })
              state.write(" |")
              state.ensureNewLine()
              if (rowIndex === 0) {
                state.write(`| ${Array.from({ length: row.childCount }, () => "---").join(" | ")} |`)
                state.ensureNewLine()
              }
            })
          } finally {
            state.inTable = false
            state.esc = esc
          }
          state.closeBlock(node)
        },
        parse: {
          // markdown-it parses pipe tables itself.
        },
      },
    }
  },
})

const BlogTableCell = TableCell.extend({ content: "paragraph" })
const BlogTableHeader = TableHeader.extend({ content: "paragraph" })

const BlogTableKeys = Extension.create({
  name: "blogTableKeys",
  // Ahead of StarterKit's paragraph split and hard break.
  priority: 1000,
  addKeyboardShortcuts() {
    const inTable = () => this.editor.isActive("table")
    return {
      Enter: () => {
        if (!inTable()) return false
        // Same as Tab: next cell, or a new row from the last one.
        if (this.editor.commands.goToNextCell()) return true
        this.editor.chain().addRowAfter().goToNextCell().run()
        return true
      },
      "Shift-Enter": inTable,
      "Mod-Enter": inTable,
    }
  },
})

export const blogTableExtensions = [
  BlogTableNode.configure({ resizable: false }),
  TableRow,
  BlogTableHeader,
  BlogTableCell,
  BlogTableKeys,
]
