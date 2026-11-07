import { defineMessages } from "../types";

/** Copy shared by the blog editors . */
export const editorMessages = defineMessages("editor", {
  en: {
    editPost: "Edit Post",
    newPost: "New Post",
    preview: "Preview",
    editorMode: "Editor",
    untitled: "Untitled Post",
    noContent: "*No content yet…*",
    titlePlaceholder: "Post title…",
    excerptLabel: "Excerpt / Summary",
    excerptPlaceholder: "A short summary of the post shown in blog listings…",
    contentLabel: "Content",
    contentPlaceholder:
      "Start writing — use the toolbar for headings, bold, italic, lists, and images…",
    categoryLabel: "Category",
    coverImageLabel: "Cover Image",
    tagsLabel: "Tags",
    tagPlaceholder: "Type tag + Enter",
    authorsLabel: "Written by",
    authorPlaceholder: "Type name + Enter",
    tipsTitle: "Editor Tips",
    tips: [
      "Use the style dropdown for headings — they appear at full size as you type.",
      "Select text, then click B, I, or underline to format it.",
      "Click the image icon to upload photos — they appear inline in your post.",
      "Use Preview in the header to see the final published layout.",
    ],
    saving: "Saving…",
    updatePost: "Update Post",
    publishPost: "Publish Post",
    errors: {
      titleRequired: "Title is required.",
      slugRequired: "Slug is required.",
      contentRequired: "Content is required.",
      saveFailed: "Failed to save. Please try again.",
      network: "Network error. Please try again.",
    },
  },
});
