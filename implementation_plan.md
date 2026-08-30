# Church Management System — Implementation Plan

**Source:** [church_management_system_prd.md](./church_management_system_prd.md) v1.2  
**Date:** 28 August 2026  
**Constraint:** Multi-tenant SaaS. Many independent churches. Zones group members **inside** a church. No org hierarchy (region / district / branch).

**Stack:** Next.js (App Router), Tailwind CSS, TanStack Query / Table / Form, Prisma, PostgreSQL, Cloudinary.

---

## 1. Goal

Ship a product the platform owner can sell to many churches.

A Super Administrator can:

1. Create Church A (e.g. ECWA Janruwa) and Church B.
2. Create a Church Administrator for each.

A Church Administrator can:

1. Edit their church profile.
2. Define zones (e.g. Hope, Love, Peace).
3. Register members and assign each to at most one zone.
4. Record Sunday attendance as **counts**, not per-person check-in.
5. Manage families, departments, ministries, visitors, and church users.

Church A must never see Church B's data. Do not build org-wide church trees, individual attendance, or zone-level attendance counts.

---

## 2. Architecture

```text
Browser
  Next.js App Router
  Tailwind CSS
  TanStack Query  (server state)
  TanStack Table  (lists)
  TanStack Form   (create/edit)
        │
        ▼
  Next.js Route Handlers   /api/v1/*
  Auth (session cookie: userId, churchId | null)
  Prisma  (+ church_id on every tenant query)
        │
        ▼
  PostgreSQL
        +
  Cloudinary (images, folder per church)
```

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js App Router (TypeScript) | Pages, layouts, and API in one project |
| UI | Tailwind CSS | Platform shell vs church shell |
| Lists | TanStack Table | Churches, members, zones, services, visitors, users |
| Forms | TanStack Form | Church, member, zone, attendance, visitor, user |
| Client data | TanStack Query | Fetch/mutate against `/api/v1`; cache keys include church context |
| Routing | Next.js file routes | Not TanStack Router |
| API | Next.js Route Handlers | `/api/v1/...`; auth, RBAC, and **tenant scope** enforced here |
| ORM | Prisma | Schema + migrations; `church_id` on tenant tables |
| Auth | Session cookie | httpOnly; session holds `churchId` (null for Super Admin) |
| DB | PostgreSQL | Soft deletes via `deleted_at` on members |
| Files | Cloudinary | Member photos, church logo; path includes `churchId` |
| Deploy | Vercel (Next.js) | One project, many churches. HTTPS and CDN included. |
| DB (prod) | Hosted PostgreSQL (Neon or Vercel Postgres) | Connection pooling required (serverless). |
| DB (local) | Docker Compose Postgres | Next.js runs with `next dev`, not in Docker. |

**Repo layout (single Next.js app):**

```text
chms/
  prisma/
    schema.prisma
    seed.ts                  # Super Administrator only
  src/
    app/
      (auth)/login/...
      (platform)/            # Super Administrator
        dashboard/
        churches/
      (app)/                 # church-authenticated shell
        dashboard/
        church/
        zones/
        members/
        ...
      api/v1/
    features/
      auth/
      churches/              # platform tenant CRUD
      church/                # current church profile
      zones/
      members/
      ...
    lib/
      db.ts
      auth.ts
      permissions.ts
      tenant.ts              # requireChurch(), scopedWhere(churchId)
      zone-scope.ts
      audit.ts
      cloudinary.ts
    components/
  docker-compose.yml           # local Postgres only
  church_management_system_prd.md
  implementation_plan.md
```

Server Components can render static shells. Interactive lists and forms are Client Components that talk to Route Handlers through TanStack Query. **Do not skip Route Handlers and query Prisma from the client.**

### Storage (Cloudinary)

- Member photos, church logo, and later sermon files go to Cloudinary.
- Postgres stores only the Cloudinary public ID and URL, not the file bytes.
- Uploads use a signed request from a Route Handler. The Cloudinary API secret stays on the server.
- Folder convention: `chms/{churchId}/{entity}/{id}` e.g. `chms/{churchId}/members/{memberId}`.
- Replacing or deleting a photo also deletes (or overwrites) the old Cloudinary asset.

---

## 3. Non-negotiable design rules

These must be true from the first migration:

1. **Many churches, one product.** `churches` is a real table. Super Admin `POST /api/v1/churches`. Church users cannot.
2. **Tenant isolation.** Every church-owned table has `church_id`. Every query for a church user includes `where: { churchId: session.churchId }`. Guessing another church's UUID returns not-found.
3. **Zones group members, not churches.** `members.zone_id` is nullable FK. Zone belongs to the same church as the member.
4. **Zones ≠ departments ≠ ministries.** Three separate entities, all church-scoped.
5. **Attendance is counts.** `service_attendance(service_id, category, count)`. No `member_id` on attendance.
6. **Authorization is server-side.** Tenant filter first, then role, then zone scope. Never rely on the UI hiding rows.
7. **Configurable labels per church.** Seed Hope / Love / Peace only as optional demo data for one church. Other churches start empty or with their own names.
8. **No church hierarchy.** No `parent_church_id`, regions, or districts.

---

## 4. Authorization model (build this early)

Permissions are `{resource}:{action}` (e.g. `members:read`, `churches:manage`).

Roles are rows in `roles`, not enums in code.

**Tenant scope** is applied before role checks for church users:

| Actor | Church visibility |
|---|---|
| Super Administrator | All churches (platform APIs). `users.church_id` is null. |
| Church user | Only `users.church_id`. Cannot list other churches. |

**Zone scope** (inside one church):

| Role | Member visibility |
|---|---|
| Church Administrator, Pastor, Secretary | All members of their church |
| Zone Leader | Members where `zone_id` is in the user's assigned zones |
| Department / Ministry Leader | Members in their department/ministry (Phase 1: read assigned group; tighten in Phase 2 if needed) |
| Attendance Officer | No member PII required; services + counts only |
| Accountant | Finance only, their church |
| Report Viewer | Aggregates permitted by their other roles |

Implementation:

- `requireSession()` on every Route Handler.
- `requirePermission("churches:manage")` for platform church APIs.
- `requireChurch()` for tenant APIs: Super Admin is rejected unless a later “view as church” feature exists (out of MVP). Church users get `churchId` from the session only — never from the request body/query as the source of truth.
- `tenantWhere(churchId)` merged into every Prisma `where`.
- `getVisibleMemberFilter(user)` applied after tenant filter.
- Audit church create/suspend and every zone assignment change.

Nav items can hide by permission, but the API must still reject unauthorized and cross-tenant requests.

---

## 5. Database — Phase 1 schema (build first)

Create in this order so FKs are valid:

1. `churches` (`slug` unique, `status`)
2. `users` (`church_id` nullable, email unique globally), `roles` (`church_id` nullable), `permissions`, `user_roles`, `role_permissions`
3. `zones` (unique `(church_id, name)`), `zone_leaders`
4. `membership_statuses` (per church)
5. `members` (`church_id`, `zone_id` nullable, `deleted_at`, unique `(church_id, membership_number)`)
6. `families`, `family_members`
7. `departments`, `member_departments`
8. `ministries`, `member_ministries`
9. `service_types`, `services` (per church)
10. `attendance_categories`, `service_attendance` (unique `(service_id, category)`)
11. `visitors`, `visitor_visits`
12. `audit_logs` (`church_id` nullable)

Indexes: `members.church_id`, `members.zone_id`, `members.membership_status`, `members.last_name`, `service_attendance.service_id`, `audit_logs.church_id`, `audit_logs.entity_type + entity_id`.

On church create: insert the church, seed church roles (Church Administrator, …), seed default lookups if desired, create the first Church Administrator user.

---

## 6. Domain module pattern

Each domain follows the same shape. Do not invent a different structure per module.

```text
src/features/members/
  components/
  hooks.ts
  columns.ts
  schema.ts
src/app/(app)/members/
src/app/api/v1/members/
  route.ts
  [id]/route.ts
```

- Zod validates request bodies in Route Handlers and TanStack Form.
- TanStack Query keys: `['members', churchId, filters]`, `['zones', churchId]`. Church id comes from `/api/v1/auth/me`, not from the URL of another tenant.
- Soft-delete, tenant scope, and zone-scope live in `src/lib/` and Route Handlers, not in table components.

---

## 7. App routes (UI)

```text
src/app/
  (auth)/
    login/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  (platform)/                  # Super Administrator
    layout.tsx
    dashboard/page.tsx
    churches/page.tsx
    churches/new/page.tsx
    churches/[id]/page.tsx
  (app)/                       # church users
    layout.tsx
    dashboard/page.tsx
    church/page.tsx
    zones/page.tsx
    zones/[id]/page.tsx
    members/page.tsx
    members/new/page.tsx
    members/[id]/page.tsx
    members/[id]/edit/page.tsx
    families/...
    departments/...
    ministries/...
    services/...
    visitors/...
    admin/users/...
    admin/roles/...
```

`middleware.ts`: unauthenticated → login. Super Admin → platform routes. Church user → `(app)` routes. Suspended church → login error.

Zone Leader still sees Members in the nav; `GET /api/v1/members` already returns only their zone in their church.

---

## 8. Phased delivery

### Phase 0 — Foundation (before features)

**Duration target:** 1 week

- Next.js App Router app, Tailwind, path aliases
- Theme: CSS variables from `docs/ui-references/palette.md`, `next-themes`, header light/dark/system toggle
- TanStack Query provider, TanStack Form + Table wrappers
- Local Postgres via Docker Compose; Next.js via `next dev`
- Prisma: `churches`, users/roles/permissions; seed **Super Administrator** (no church)
- Cloudinary env + `lib/cloudinary.ts` (signed uploads; API secret never sent to the browser)
- Vercel project wired (env vars, `prisma generate` on build) so production deploys from git
- Auth: login, logout, session cookie (`userId`, `churchId` null for Super Admin), password hash, change password
- Register is not public
- Forgot/reset password (email optional; token-in-response acceptable for local/dev)
- `requirePermission()` and `requireChurch()` / `tenantWhere()`
- Audit log writer used by mutations
- `middleware.ts` auth gate
- Health check, CI: lint, `tsc`, `npm test`
- Root `package.json` `"test"` script runs **all** tests (Vitest + Playwright when added). One command: `npm test`.
- Husky `pre-push` hook runs `npm test` and **aborts the push** on failure. Never skip with `--no-verify`.
- TDD: failing test before production code. Commit each green feature slice.

**Exit:** Super Admin can log in to an empty platform. No churches required yet. Owner sign-off: [phase_test_guide.md](./phase_test_guide.md) Phase 0.

---

### Phase 1A — Churches, zones, members

**Duration target:** 2.5 weeks

Platform:

- Churches CRUD for Super Admin (create, edit, suspend, reactivate)
- Create first Church Administrator when creating a church
- Church Admin login lands on church dashboard
- Suspended church: church users cannot log in

Church:

- Church profile get/update (own church only)
- Zones CRUD; unique name per church; deactivate without deleting members
- Assign/remove zone leaders
- Members CRUD, search, filter (zone, status, name) via TanStack Table
- Membership number unique per church (manual in MVP)
- Photo upload via Cloudinary under `chms/{churchId}/...`
- Assign / change zone (audited)
- Soft delete, restore, status change including Transferred
- Tenant filter + Zone Leader filter on member GET list and GET by id
- Member list, profile, add/edit (TanStack Form)
- Zone list, zone detail, zone members

**Exit:** Super Admin creates two churches. Each admin adds members and zones. Church A cannot open Church B's member by ID. Zone Leader sees only their zone.

---

### Phase 1B — Families, departments, ministries

**Duration target:** 1.5 weeks

- Families CRUD; add/remove members of the same church
- Departments CRUD; assign members + role
- Ministries CRUD; assign members + role
- Member profile shows zone + departments + ministries
- Filters: by department, by ministry
- Cross-church member IDs rejected when adding to a family/department

**Exit:** A member can be in Peace Zone, Choir, and Youth at the same time, in their church only.

---

### Phase 1C — Services, attendance, visitors

**Duration target:** 1.5 weeks

- Configurable service types and attendance categories **per church**
- Services CRUD
- Attendance: enter counts per category; reject negatives; one row per category per service
- **No member picker on attendance screens or APIs**
- Visitors CRUD; visits linked to a service of the same church
- Convert visitor → member of the same church, with zone assignment on convert
- Service detail: counts + visitors (not member roll-call)

**Exit:** Secretary records Sunday totals for their church. System never stores “member X attended”. Church B cannot see Church A's services.

---

### Phase 1D — Users, dashboards, Phase 1 hardening

**Duration target:** 1 week

- Church users CRUD; assign roles; link user to member (optional, same church)
- Role/permission screens for Church Administrator (their church)
- Church dashboard: total/active members, members by zone, unassigned count, latest attendance, visitors, new members
- Platform dashboard: church list counts
- Zone-scoped dashboard numbers for Zone Leaders
- Optional seed: one demo church
- **Isolation tests (required for MVP):**
  - Church A user cannot `GET /api/v1/members/{churchBMemberId}`
  - Church A user cannot `GET /api/v1/churches`
  - Church Admin cannot `POST /api/v1/churches`
  - Attendance invariants (non-negative, no member_id)

**Phase 1 exit (MVP):** PRD §32. Reports in Phase 1 can be dashboard + CSV export of members; full report module is Phase 2.

---

### Phase 2 — Children, events, finance, content, reports

Build in this order. All church-scoped.

| Slice | Work |
|---|---|
| 2A Children | `children`, `child_guardians`; family view includes children |
| 2B Events | Events + aggregate `event_attendance` |
| 2C Giving | Giving types, giving records (member optional), expense categories, expenses |
| 2D Content | Sermons (on service), announcements |
| 2E Reports | Membership, membership by zone, attendance by Sunday/month/year/type, visitors, events, finance |

Finance and report endpoints require `finance:*` / `reports:*`. Accountant cannot see pastoral data (none in this phase) or another church's books.

**Phase 2 exit:** Weekly operations (service, money, events) and printable/exportable reports work per church.

---

### Phase 3 — Care, assets, later

| Slice | Work |
|---|---|
| 3A Pastoral | Cases; restricted permissions; church + zone-scope |
| 3B Prayer | Prayer requests |
| 3C Assets | Asset register |
| 3D Hardening | Backups, Sentry, email notifications |
| Later | Billing/subscriptions, custom domains, individual attendance, zone attendance counts, mobile, SMS — **not scheduled** |

---

## 9. Suggested build order (dependency graph)

```text
Phase 0 Auth + RBAC + tenant helpers + Super Admin seed
    → Churches (create tenant + first Church Admin)
    → Church profile
    → Zones + zone leaders
    → Members (depends on church + zones)
    → Families / Departments / Ministries (depend on members)
    → Services
    → Attendance (depends on services)
    → Visitors (depends on services; convert depends on members + zones)
    → Church users admin
    → Dashboards (platform + church)
```

Do not start members before churches and zones exist.  
Do not start attendance before services exist.  
Do not ship Phase 1 without cross-tenant isolation tests.

---

## 10. Testing strategy

| Layer | What |
|---|---|
| Unit | Membership number unique per church, one-zone rule, attendance non-negative, `tenantWhere`, `getVisibleMemberFilter` |
| Route Handlers | Auth, permission denied, **cross-tenant 404**, Zone Leader isolation, convert visitor, cannot create church as Church Admin |
| UI | Super Admin creates two churches; login as each; add member; assign zone; record attendance |
| Manual | Super Admin vs Church Admin vs Zone Leader vs Attendance Officer vs Accountant |

Minimum CI: `npm test` (same command as local; includes `tsc`/Vitest, and Playwright when present) on every PR. Playwright two-church isolation in Phase 1D.

**Git:** After a feature is green, commit it. Before `git push origin`, `npm test` must pass; a failing suite blocks the push (Husky `pre-push` + agent rule).

**Phase sign-off:** After each phase, walk [phase_test_guide.md](./phase_test_guide.md). Tick checks only when the **owner confirms**. Do not start the next phase until that phase is signed off.

---

## 11. Deployment

**Production:** Vercel. Git push to the production branch deploys the Next.js app. One Vercel project serves all churches. HTTPS is provided by Vercel.

**Database:** Hosted PostgreSQL (Neon or Vercel Postgres). Use a pooled URL for the app (`DATABASE_URL`) and a direct URL for migrations (`DIRECT_URL`). Enable automated backups on the database provider.

**Files:** Cloudinary. Do not write uploads to the Vercel filesystem.

**Env (Vercel):** `DATABASE_URL`, `DIRECT_URL`, session secret, Cloudinary cloud name / API key / API secret.

**Build:** `prisma generate` (e.g. `postinstall`) and `prisma migrate deploy` before or during build. Do not run a long-lived Node server or Nginx.

**Local:** Docker Compose for Postgres only. App: `next dev`. Preview deployments on Vercel for pull requests.

No per-church servers in MVP. Billing is not required to onboard a church.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Church A sees Church B data | `tenantWhere` on every tenant query; isolation tests before member UI; never take `church_id` from the client as truth |
| Zone Leader accidentally sees all members | Isolation tests; filter after tenant scope |
| Attendance UI invites picking people | No member field in schema or TanStack Form |
| Zones modeled as ministries | Separate tables from day one |
| Churches modeled as a hierarchy | No parent_id on `churches`; code review against PRD §5 |
| Super Admin accidentally used as a church user | Platform routes only in MVP; `requireChurch()` fails if `churchId` is null |
| Prisma called from Client Components | All DB access in Route Handlers / server-only `lib` |
| Cloudinary mix-up across churches | Folder prefix `chms/{churchId}/` |
| Configurable lookups delayed | Per-church lookup tables in Phase 1 |
| Prisma connection exhaustion on Vercel | Pooled `DATABASE_URL` (Neon pooler / Prisma Accelerate / PgBouncer); keep a `DIRECT_URL` for migrations |
| Uploads on Vercel disk | Cloudinary only; no `fs.writeFile` for photos |

---

## 13. First implementation ticket (when coding starts)

**P0-1 — Scaffold, auth, Super Admin**

- Create the Next.js App Router app with Tailwind
- Wire TanStack Query in the root provider
- Local Postgres via Docker Compose; Next.js via `next dev`
- Prisma: `churches` + users/roles/permissions + seed Super Administrator
- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- Login page; Super Admin empty platform shell
- `"test"` in package.json + Husky pre-push running `npm test`

Next ticket after that: **P1-1 Create churches + first Church Administrator**.
