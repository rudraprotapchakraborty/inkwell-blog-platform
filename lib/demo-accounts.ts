/** Accounts created by `npm run seed`, offered on the sign-in page so the site can be tried without signing up. */
export const DEMO_PASSWORD = "Inkwell2026"

export const DEMO_ACCOUNTS = [
  {
    label: "Writer",
    email: "writer@inkwell.demo",
    password: DEMO_PASSWORD,
    blurb: "Write, edit, publish and delete posts, and manage people",
  },
  {
    label: "Reader",
    email: "reader@inkwell.demo",
    password: DEMO_PASSWORD,
    blurb: "Read, like, share and comment on posts",
  },
] as const
