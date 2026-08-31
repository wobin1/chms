# Production hardening

Operational checklist for shipping CHMS to paying churches on Vercel. Complements [phase_test_guide.md](../phase_test_guide.md) Phase 3D.

## Required environment (Vercel)

Set these in the Vercel project → Settings → Environment Variables. Never commit real values.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres URL (Neon pooler / Vercel Postgres) |
| `DIRECT_URL` | Direct Postgres URL for `prisma migrate deploy` |
| `SESSION_SECRET` | ≥32 random characters for httpOnly session cookies |
| `CLOUDINARY_CLOUD_NAME` | Image uploads |
| `CLOUDINARY_API_KEY` | Image uploads |
| `CLOUDINARY_API_SECRET` | Server-only; never expose to the client |
| `APP_URL` | Canonical public URL (e.g. `https://chms.example.com`) for reset links |

Optional:

| Variable | Purpose |
|---|---|
| `SENTRY_DSN` | Server exception reporting (Sentry store API) |
| `SENTRY_ENVIRONMENT` | e.g. `production` / `preview` |
| `MAILTRAP_API_TOKEN` | Mailtrap API token (sending or testing) |
| `MAILTRAP_INBOX_ID` | Optional; when set, uses Mailtrap Email Testing sandbox |
| `EMAIL_FROM` | From address, e.g. `CHMS <noreply@yourdomain.com>` |
| `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` | Required on **first** production deploy (creates Super Administrator). After that, redeploys sync permissions without resetting the password; you may remove `SEED_SUPER_ADMIN_PASSWORD` once you have signed in and changed it. |

Confirm `.env` / `.env.local` stay gitignored. `npm run build` (Vercel deploy) runs `prisma migrate deploy` and `prisma db seed` before `next build`.

## Database backups

Enable **automated backups** on the hosted Postgres provider (Neon point-in-time recovery, Vercel Postgres backups, or your host’s snapshot schedule). Record:

- Provider and plan
- Retention period
- Who can restore, and a dry-run restore date if practical

Without backups enabled, do not treat production as ready.

## Error monitoring (Sentry)

1. Create a Sentry project (Node / Next.js).
2. Set `SENTRY_DSN` on Vercel.
3. As Super Administrator, `POST /api/v1/ops/sentry-test` with a valid session cookie.
4. Confirm the “CHMS Sentry test error” event appears in Sentry.

If you choose **not** to use Sentry yet, leave `SENTRY_DSN` unset. Unhandled 500s still emit structured logs (`event: exception` / `unhandled`). Mark the phase check as accepted only when you explicitly decide monitoring can wait.

## Password reset email (Mailtrap)

Without Mailtrap env vars, production forgot-password still returns a generic success (no token in the API body). Local/dev continues to return a reset token for testing.

To enable email:

1. Create a [Mailtrap](https://mailtrap.io) account.
2. **Local / QA:** Email Testing → copy API token and inbox id → set `MAILTRAP_API_TOKEN`, `MAILTRAP_INBOX_ID`, `EMAIL_FROM`, and `APP_URL`. Messages land in the **Mailtrap Email Testing inbox**, not Gmail or the account’s real mailbox (seed users like `admin@chms.local` are not real inboxes).
3. **Production:** Email Sending → verify domain → set `MAILTRAP_API_TOKEN` and `EMAIL_FROM`; leave `MAILTRAP_INBOX_ID` empty so mail goes through `send.api.mailtrap.io`.
4. Request a reset for a known user. Locally, open the Mailtrap testing inbox **or** use the reset link shown on the forgot-password page.

## Health

`GET /api/v1/health` returns `{ status: "ok" }` when Postgres answers. Use it for uptime checks.

## Security headers

Next.js sends `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a locked-down `Permissions-Policy`. HTTPS/HSTS is provided by Vercel.
