<div align="center">

# ✒️ Inkwell Blog Platform

**Blog writing platform: write, draft and publish posts with a rich-text editor, likes and comments.**

[**Live demo**](https://inkwell-blog-platform-lyart.vercel.app/) · [Portfolio](https://rudraprotapchakraborty.com/projects)

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=ffffff) ![React](https://img.shields.io/badge/React-20232a?style=for-the-badge&logo=react&logoColor=61dafb) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-0f172a?style=for-the-badge&logo=tailwindcss&logoColor=38bdf8) ![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=ffffff) ![MongoDB](https://img.shields.io/badge/MongoDB-47a248?style=for-the-badge&logo=mongodb&logoColor=ffffff) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=ffffff)

<a href="https://inkwell-blog-platform-lyart.vercel.app/"><img src="https://i.ibb.co/PG0FzJ60/inkwell-blog-platform.webp" alt="Inkwell Blog Platform: home page" width="880"></a>

</div>

> The full-stack Next.js app of **Inkwell**.
>
> - Rich-text editor with tables, images and a live preview of the real post page
> - Draft, publish, edit and delete; cover image, takeaways, tags and SEO fields
> - Likes, shares and comments; email-code and Google sign-in
> - Writers manage who else can write

A blog writing website where writers draft, edit, publish and delete posts in a rich-text editor with tables, images, links and buttons, a cover image, key takeaways, tags, credited writers and SEO fields, plus a live preview of the real post page. Readers browse by topic, like and share posts, and comment once signed in. Sign-in works with email (confirmed by a one-time code) or Google, with password reset and an account page for profile, email and password. Writers manage who else can write from a People page. Posts are seeded from Wikipedia, there are demo accounts for each role, and the interface supports light and dark themes.

## Features

- **Write** – TipTap rich-text editor (headings, lists, tables, images, links, buttons), cover image upload, excerpt, key takeaways, tags, credited writers, SEO meta description and in/out links, live preview of the real post page.
- **Draft → publish** – save a draft, continue from the account page, publish with one click, update or delete later.
- **Read** – topic filter, infinite scroll, post pages with share previews (Open Graph image generated per post) and article JSON-LD.
- **Engage** – likes (no account needed), shares, comments (account needed; authors edit/delete their own, admins can remove any), view counter.
- **Accounts** – email + one-time-code verification, password reset, Google sign-in, settings (name, photo, email, password, delete account).
- **Roles** – only *writers* (role `admin`) can create, edit and delete posts; everyone else is a member. Writers manage roles from **Account → People**. The last writer cannot be demoted or deleted.
- **UI** – design tokens (`--paper --surface --ink --muted --line --brand --brand-soft --on-brand`), class-based light/dark mode, DM Sans + Instrument Serif, scroll-reveal sections, skeleton loaders, `react-hot-toast` toasts, portal-based confirm dialog, favicon set, mobile-first layout.

## Tech

Next.js 16 · React 19 · Tailwind CSS 4 · MongoDB (native driver) · TipTap · react-markdown · JWT cookie sessions · Nodemailer / Resend · ImgBB image hosting.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run seed                 # demo accounts + 10 Wikipedia-based posts
npm run dev                  # http://localhost:3000
```

Production build: `npm run build && npm start`.

### Environment (`.env.local`, git-ignored)

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Connection string; the database name in it (e.g. `inkwellBlog`) is the one used |
| `JWT_SECRET` | Signs the session cookie |
| `IMGBB_API_KEY` | Image uploads (cover + inline images) |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | Sends verification / reset codes (or `RESEND_API_KEY` + `MAIL_FROM`) |
| `GOOGLE_CLIENT_ID` `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `NEXT_PUBLIC_SITE_URL` | Public origin, used for callbacks and share links |

For Google sign-in, add these as authorised redirect URIs:

- `http://localhost:3000/api/auth/google/callback`
- `https://inkwell-blog-platform-lyart.vercel.app/api/auth/google/callback`

On Vercel set `NEXT_PUBLIC_SITE_URL=https://inkwell-blog-platform-lyart.vercel.app`.

### Demo accounts (created by `npm run seed`, also offered on the sign-in page)

| Role | Email | Password |
| --- | --- | --- |
| Writer | `writer@inkwell.demo` | `Inkwell2026` |
| Reader | `reader@inkwell.demo` | `Inkwell2026` |

Seed posts use Wikipedia text and photos only, each credited at the end (CC BY-SA). `npm run seed -- --reset-posts` replaces them.

### Making someone a writer

Register normally, then either use **Account → People** as an existing writer, or:

```bash
npm run make-admin -- someone@example.com
```

## Project layout

```
app/            pages + API routes (blogs, auth, account, admin, upload)
components/     navbar, footer, confirm dialog, blog + auth + account components
lib/            auth, users/OTP, blog input & validation, engagement, markdown, mailer
scripts/        seed.mjs, make-admin.mjs
```

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run seed` · `npm run make-admin`

---

<div align="center">

Made by **[Rudra Protap Chakraborty](https://rudraprotapchakraborty.com)** · [Portfolio](https://rudraprotapchakraborty.com) · [GitHub](https://github.com/rudraprotapchakraborty)

</div>
