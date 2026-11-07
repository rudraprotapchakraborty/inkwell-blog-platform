import { defineMessages } from "../types";

/** Shared copy for both blog post readers . */
export const blogPostMessages = defineMessages("blogPost", {
  en: {
    notFound: "Post not found",
    backToBlogs: "← Back to Blogs",
    backToBlogsShort: "Back to Blogs",
    back: "Back",
    backToAll: "Back to all articles",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Delete this post? This cannot be undone.",
    writtenBy: "Written by",
    share: "Share",
    keyTakeaways: "Key takeaways",
    seo: {
      inboundReal: "Related on Inkwell",
      inbound: "Related on Inkwell",
      outbound: "External Resources",
    },
  },
});
