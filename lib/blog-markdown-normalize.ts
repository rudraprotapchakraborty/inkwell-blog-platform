/**
 * Fixes common markdown glitches (e.g. headings glued to images) so blocks
 * parse and render correctly in the editor and on published posts.
 */
export function normalizeBlogMarkdown(markdown: string): string {
  if (!markdown?.trim()) return markdown ?? ""

  let md = markdown.replace(/\r\n/g, "\n")

  // ![alt](url)## Heading → separate blocks
  md = md.replace(/(!\[[^\]]*\]\([^)]+\))\\?(#{1,3}\s)/g, "$1\n\n$2")

  // ![alt](url) then list, blockquote, or paragraph on same line
  md = md.replace(/(!\[[^\]]*\]\([^)]+\))(\s*)(?=[-*]|\d+\.\s|>\s)/g, "$1\n\n")

  // Collapse 3+ newlines to 2
  md = md.replace(/\n{3,}/g, "\n\n")

  return md.trim()
}