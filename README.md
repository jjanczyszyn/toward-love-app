# toward.love · members app

A private, **invite-only** profile-matching app for the toward.love dating events
and community. Same dark aesthetic as the toward.love website.

## What it does

- **Invite-only login.** Only preapproved emails can sign in. Login is
  passwordless: a one-time 6-digit code is emailed from `hello@toward.love`
  (AWS SES, SigV4-signed), rate-limited. No marketing emails are ever sent. The
  only email is the login code you request.
- **Private by default.** Nothing personal is visible without logging in
  (`<meta robots noindex>` + all data behind auth). **Emails are never shared**
  between members; people only message each other in-app.
- **Profiles.** Photos (Convex file storage), bio, and attributes (gender,
  orientation, relationship style, kids, want kids, age, location).
- **Deal-breakers.** Each member sets what they're looking for and marks any of
  them as a deal-breaker. Two members can only message if they each satisfy the
  other's deal-breakers. Non-deal-breaker preferences are used to filter/sort.
- **Filtering.** Browse and filter potential matches by gender, relationship
  style, kids, age, photo, text search, and "matches my deal-breakers".
- **Messaging + blocking.** 1:1 in-app messages; one-tap block (blocked people
  can't message you and disappear from your browse).
- **Admin.** Admins (set via `ADMIN_EMAILS`) approve members by pasting emails,
  and can seed the allowlist from the website mailing list.

## Stack

- **Vite + React + TypeScript**, hosted on **GitHub Pages** at `app.toward.love`.
- **Convex** backend + file storage. Project: `toward-love-app` (separate from
  the website's `toward-love` project).
- **AWS SES** for login-code emails, sent from `hello@toward.love`.

## Run locally

```sh
npm install
npm run dev:all   # Vite + Convex dev
```

`.env.local` holds `VITE_CONVEX_URL`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`:
`npx convex deploy --cmd "npm run build"` (pushes backend + builds the frontend
with the prod Convex URL), then publishes `dist/` to GitHub Pages.

Required Convex env vars (set on the deployment):
- `AWS_SES_ACCESS_KEY_ID` / `AWS_SES_SECRET_ACCESS_KEY` — IAM key allowed to
  `ses:SendEmail` from `hello@toward.love`
- `AWS_SES_REGION` — e.g. `us-east-1`
- `LOGIN_FROM` — sender, e.g. `Toward Love <hello@toward.love>`
- `ADMIN_EMAILS` — comma-separated admin emails

Required repo secret: `CONVEX_DEPLOY_KEY`. Pages source: GitHub Actions; custom
domain `app.toward.love` via `public/CNAME`.

### Seed the allowlist from the website mailing list

The website's signups live in the separate `toward-love` Convex project. To copy
them in: export that project's `signups` and call `allowlist:bulkImport` (an
internal mutation) on this project with `[{email, name, source}]` entries.
Admins can also add members directly in the in-app **Admin** tab.
