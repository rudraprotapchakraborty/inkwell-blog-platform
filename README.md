# Inkwell · Blog Writing Platform

Inkwell is a blog writing website built with **Next.js (App Router)** and **Tailwind CSS 4**. Writers draft, edit, publish and delete posts in a rich-text editor; readers browse by topic, like, share and comment. It was upgraded from a small blog *viewer* (placeholder posts + Kinde login) into a full writing platform.

The blog-writing logic (slugs, validation, ownership, auth, OTP, Google sign-in, engagement, storage) is ported unchanged from the Creative Surf agency site; only the interface is new.

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

For Google sign-in, add `http://localhost:3000/api/auth/google/callback` (and your deployed origin's equivalent) as an authorised redirect URI.

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
