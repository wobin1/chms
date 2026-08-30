# Phase test guide

Manual checks for each delivery slice. Tick a box **only after the product owner confirms** that check works. Automated `npm test` is required but does not replace this list.

**How to use**

1. Finish the phase implementation.
2. Run `npm test` (must pass).
3. Walk these checks in the running app.
4. Owner confirms → agent ticks `[x]` and records sign-off.
5. Next phase starts only after that phase is signed off.

| Phase | Status |
|---|---|
| 0 Foundation | Signed off 29 August 2026 |
| 1A Churches, zones, members | Signed off 29 August 2026 |
| 1B Families, departments, ministries | Signed off 29 August 2026 |
| 1C Services, attendance, visitors | Signed off 29 August 2026 |
| 1D Users, dashboards, isolation | Signed off 29 August 2026 |
| 2A Children | Signed off 29 August 2026 |
| 2B Events | Signed off 29 August 2026 |
| 2C Giving and expenses | Signed off 29 August 2026 |
| 2D Sermons and announcements | Signed off 29 August 2026 |
| 2E Reports | Signed off 29 August 2026 |
| 3A Pastoral | Signed off 29 August 2026 |
| 3B Prayer | Signed off 29 August 2026 |
| 3C Assets | Skipped (owner) |
| 3D Hardening | Signed off 29 August 2026 |

---

## Phase 0 — Foundation

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] App starts locally (`next dev` + Postgres). Login page matches the rest of the product (not a different look).
- [x] Light and dark mode both work (header toggle). Blue accent, not green. Layout matches the UI reference screenshots.
- [x] Super Administrator can sign in with the seed account.
- [x] Sign out works. Visiting an app URL while signed out redirects to login.
- [x] Public registration is not available.
- [x] Change password works while signed in.
- [x] Forgot / reset password works (or the agreed dev path).
- [x] Unauthenticated API calls are rejected.
- [x] `npm test` passes with one command from the repo root.
- [x] Push is blocked when tests fail (Husky pre-push or equivalent). Do not use `--no-verify`.

---

## Phase 1A — Churches, zones, members

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

### Platform (Super Admin)

- [x] Super Admin can create **two** churches (e.g. ECWA Janruwa and a second church).
- [x] Each church gets a Church Administrator who can sign in.
- [x] Super Admin can edit a church and suspend / reactivate it.
- [x] Users of a **suspended** church cannot sign in.
- [x] Church Administrator cannot create another church and cannot see the churches list.

### Church profile and zones

- [x] Church Admin can edit **their** profile (name, address, logo via Cloudinary). They cannot edit the other church.
- [x] Church Admin can create zones (e.g. Hope, Love, Peace). Names are not hard-coded.
- [x] Zone names cannot duplicate **inside** the same church. The other church may reuse the same names.
- [x] Deactivating a zone does not delete members.
- [x] A zone leader can be assigned. That user only sees members in their zone.

### Members

- [x] Church Admin can add, edit, search, and filter members (zone, status, name).
- [x] Membership number is unique **per church** (same number allowed in the other church).
- [x] Member photo uploads to Cloudinary and shows on the profile.
- [x] A member can be assigned to at most one zone. Changing zone is possible.
- [x] Soft delete / restore and status including Transferred work.

### Isolation (must confirm with two churches)

- [x] Signed in as Church A, you cannot open Church B’s member by URL or ID.
- [x] Church A’s member list never shows Church B’s members.
- [x] Zone Leader of Hope does not see Love/Peace members.

### Look and use

- [x] Loading, empty, error, and populated states exist on church, zone, and member lists.
- [x] Login, platform, and church app look like one product.

---

## Phase 1B — Families, departments, ministries

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Create a family; add and remove members of **this** church only.
- [x] A member from the other church cannot be added to a family.
- [x] Create departments (e.g. Choir). Assign members and a role. A member can be in more than one department.
- [x] Create ministries (e.g. Youth). Assign members. A member can be in more than one ministry.
- [x] Member profile shows zone **and** departments **and** ministries together (e.g. Peace Zone + Choir + Youth).
- [x] Lists can be filtered by department and by ministry.
- [x] Church B does not see Church A’s families, departments, or ministries.

---

## Phase 1C — Services, attendance, visitors

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Service types and attendance categories are configurable **per church**.
- [x] Create / edit a service (e.g. Sunday Service).
- [x] Enter attendance as **counts** per category (adults, children, visitors, …). Negatives are rejected.
- [x] There is **no** control to pick which members attended. No roll-call.
- [x] One count per category per service (cannot save two “Adults” rows).
- [x] Register a visitor and link a visit to a service.
- [x] Convert a visitor to a member of **this** church and assign a zone.
- [x] Church B cannot see Church A’s services, counts, or visitors.
- [x] Secretary can record Sunday totals without seeing another church’s data.

---

## Phase 1D — Users, dashboards, Phase 1 hardening

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Church Admin can create users, assign roles, and optionally link a user to a member in the same church.
- [x] Roles/permissions can be viewed/edited by Church Admin **for their church only**.
- [x] Church dashboard: total/active members, members by zone, unassigned, latest attendance, visitors, new members.
- [x] Zone Leader dashboard numbers match **their zone only**.
- [x] Super Admin platform dashboard shows church counts, not another church’s member PII.
- [x] Member CSV/export (if present) is church-scoped and permissioned.
- [x] Isolation: Church A cannot `GET` Church B’s member; cannot list `/churches`; cannot `POST` a church.
- [x] `npm test` includes isolation and attendance invariants and passes.
- [x] Owner agrees Phase 1 MVP is usable for two separate churches.

---

## Phase 2A — Children

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Register a child on a family. More than one guardian can be set (members of this church).
- [x] Family view shows children.
- [x] Church B cannot see Church A’s children.

---

## Phase 2B — Events

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Create an event with dates and location.
- [x] Record aggregate event attendance (a count, not a member list).
- [x] Church B cannot see Church A’s events.

---

## Phase 2C — Giving and expenses

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Giving types (tithe, offering, …) are configurable per church.
- [x] Record giving; member is optional (anonymous). If a member is set, they are in this church.
- [x] Expense categories and expenses can be recorded.
- [x] Accountant can use finance screens; they cannot see another church’s money.
- [x] Church B cannot see Church A’s giving or expenses.

---

## Phase 2D — Sermons and announcements

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Add a sermon on a service (title, preacher, optional media URLs).
- [x] Create an announcement with start/end dates.
- [x] Church B cannot see Church A’s sermons or announcements.

---

## Phase 2E — Reports

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Membership report and membership **by zone** for this church.
- [x] Attendance by Sunday / month / year / service type.
- [x] Visitor, event, and finance reports for this church.
- [x] Reports never include the other church’s rows.
- [x] Owner can print or export what they need for weekly operations.

---

## Phase 3A — Pastoral care

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Open a pastoral case on a member (restricted). Unauthorized roles cannot open it.
- [x] Zone Leader only sees cases for members in their zone (if they can see pastoral at all).
- [x] Church B cannot see Church A’s cases.

---

## Phase 3B — Prayer requests

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

- [x] Create, update status, and close a prayer request (member optional).
- [x] Church B cannot see Church A’s requests.

---

## Phase 3C — Assets

**Status:** Skipped by owner (29 August 2026). Not in scope for this release.

- [ ] ~~Register an asset (name, category, condition, location).~~
- [ ] ~~Church B cannot see Church A’s assets.~~

---

## Phase 3D — Hardening

**Signed off:** 29 August 2026  
**Owner confirmed:** yes

Walk [docs/production.md](docs/production.md) together with these checks.

- [x] Production (Vercel) env vars are set: database, session secret, Cloudinary. No secrets in git.
- [x] Database backups are enabled on the host.
- [x] Error monitoring (e.g. Sentry) receives a test error or is accepted as not needed yet.
- [x] Email (if enabled) sends a test for reset-password or similar.
- [x] Owner confirms they are willing to use this phase in production.
