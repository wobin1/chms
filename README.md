# CHMS

Church Management System — multi-tenant SaaS for independent churches (Next.js, Prisma, Postgres, Cloudinary).

## Local setup

```bash
cp .env.example .env
docker compose up -d
npx prisma migrate deploy
npx prisma db seed
npx playwright install
npm run dev
```

Default Super Admin (from seed): `admin@chms.local` / `ChangeMe!admin1`.

## Tests

```bash
npm test
```

## Production

See [docs/production.md](docs/production.md) for Vercel env vars, database backups, optional Sentry, and optional Mailtrap email.

Deploy runs migrations and seed via `npm run build`. Set `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD` on Vercel for the first deploy.
