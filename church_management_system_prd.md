# Church Management System
## Product Requirements Document (PRD) & Technical Specification

**Version:** 1.2  
**Date:** 28 August 2026  
**Status:** Product Definition / Ready for Technical Design

---

## 1. Product Overview

The Church Management System (CMS) is a **multi-tenant SaaS** product. The platform owner sells it to many churches. Each church is an independent tenant with its own members, zones, users, and records.

Churches do **not** share members or sit in a denomination hierarchy (region → district → branch). Each customer church stands alone.

Inside a church, members are grouped into configurable zones.

Example:

```text
Platform
├── ECWA Janruwa
│   ├── Hope Zone
│   ├── Love Zone
│   └── Peace Zone
└── Another Church
    └── (that church's own zones)
```

Zone names are not hard-coded. Each church defines its own zones.

### Core Principle

The system records **individual member information**, but Sunday/service attendance is recorded as **aggregate numbers**. The system must not imply that a particular member attended a service unless an individual-attendance feature is introduced later.

### Tenancy Principle

Every church-owned row is scoped by `church_id`. A user of Church A must never read or write Church B's data. Isolation is enforced in the API, not only in the UI.

---

## 2. Product Goals

1. Let the platform owner onboard many independent churches.
2. Keep each church's data strictly isolated.
3. Provide reliable member and family management per church.
4. Group members into configurable zones within a church.
5. Record Sunday/service attendance efficiently using counts.
6. Manage visitors and follow-up.
7. Manage departments and ministries.
8. Manage events and service records.
9. Provide financial/giving records and reports.
10. Support pastoral care and prayer requests.
11. Provide dashboards and operational reports.
12. Enforce role-based access control (platform and church).
13. Maintain an audit trail for sensitive administrative actions.

---

## 3. Scope

### In Scope

- Platform administration (create / suspend churches)
- Church profile and settings
- Zones
- Member management
- Family management
- Children management
- Departments
- Ministries
- Services
- Aggregate attendance
- Visitors
- Events
- Giving
- Expenses
- Pastoral care
- Prayer requests
- Sermons
- Announcements
- Assets
- Reports
- Users, roles and permissions
- Audit logs

### Out of Scope for MVP

- Organizational hierarchy across churches (regions, districts, branches)
- A church managing other churches
- Billing / subscriptions / online payment of the SaaS plan
- Custom domains per church
- Individual member attendance tracking
- Payroll
- Full accounting/ledger system
- Church-specific biometric identification
- Native mobile applications
- Automated SMS/WhatsApp delivery unless an external provider is integrated

---

# 4. User Roles

The system must use role-based permissions.

### Platform roles

| Role | Main Responsibilities |
|---|---|
| Super Administrator | Create and suspend churches; create the first Church Administrator for a church; platform-wide settings |

Super Administrators are not members of a church. `users.church_id` is null for them.

### Church roles

These apply only inside the user's church.

| Role | Main Responsibilities |
|---|---|
| Church Administrator | Full administration of their church |
| Pastor | View members, pastoral information and reports |
| Secretary | Members, visitors, services and attendance |
| Accountant | Giving, expenses and financial reports |
| Zone Leader | View and manage members in their assigned zone |
| Department Leader | Manage department members and activities |
| Ministry Leader | Manage ministry records |
| Attendance Officer | Record service attendance |
| Report Viewer | View authorized reports |

Permissions must be configurable rather than permanently tied to these roles.

A Zone Leader should only see members in their assigned zone, unless they also hold a broader role.

A church user must only see data for `users.church_id`. They must not list or switch to other churches.

---

# 5. Churches (tenants)

The platform serves many churches. Each church is a tenant.

### `churches`

- id
- name
- slug
- short_name
- denomination
- address
- city
- state
- phone
- email
- logo
- status
- notes
- created_at
- updated_at

Status examples: Active, Suspended.

### Features

- Super Administrator creates a church
- Super Administrator edits church profile
- Super Administrator suspends / reactivates a church
- Super Administrator creates the first Church Administrator for that church
- Church Administrator edits their own church profile (name, address, logo, etc.)
- Church Administrator cannot create another church

### Business Rules

- Slug must be unique.
- Suspended churches cannot log in (except Super Administrator, who can still manage them).
- Creating a church does not copy another church's members, zones, or settings.
- There is no parent-church or branch-church relationship.

---

# 6. Zones

Zones are a church's member groupings. They are defined per church and configurable.

Example for ECWA Janruwa: Hope Zone, Love Zone, Peace Zone. Another church may use different names.

### `zones`

- id
- church_id
- name
- description
- status
- created_at
- updated_at

### `zone_leaders`

- id
- zone_id
- user_id
- role
- assigned_at
- status

### Features

- Create zone
- Edit zone
- Deactivate zone
- Assign zone leaders
- View zone members
- Filter members by zone

### Business Rules

- Zone names must be unique **within the church**.
- Zone names and the number of zones must be configurable per church.
- A member belongs to at most one zone, and that zone must belong to the same church.
- A member may be unassigned until a zone is set.
- A zone can have one or more leaders. Leaders must be users of the same church.
- Deactivating a zone must not delete members. Existing members remain assigned until moved.
- Departments and ministries are separate from zones. A member can be in a zone and also in departments and ministries.

---

# 7. Member Management

## Purpose

Manage the complete profile and membership status of a church's members.

### Member Fields

- id
- church_id
- zone_id nullable
- membership_number
- first_name
- middle_name
- last_name
- gender
- date_of_birth
- phone
- email
- address
- city
- state
- occupation
- marital_status
- date_joined
- membership_status
- photo
- notes
- created_at
- updated_at
- deleted_at

### Features

- Create member
- Edit member
- View member
- Search member
- Filter member
- Assign membership number
- Upload photo
- Assign zone
- Change zone
- Assign family
- Assign departments
- Assign ministries
- Change membership status
- Mark member as transferred out
- Deactivate member
- Restore member
- Export authorized member data

### Membership Status

Examples:

- Active
- Inactive
- Transferred
- Deceased
- Suspended
- Pending

Each church should be able to configure additional statuses.

### Business Rules

- Membership number must be unique within the church.
- A member belongs to exactly one church.
- A member belongs to at most one zone of that church.
- Members should normally be soft-deleted rather than permanently deleted.
- Sensitive member information must require appropriate permissions.
- Zone Leaders may view and manage members in their zone only.
- Queries must always include `church_id` for the current user.

---

# 8. Family Management

### Tables

`families`

- id
- church_id
- name
- address
- created_at
- updated_at

`family_members`

- id
- family_id
- member_id
- relationship

Zone is assigned on the member, not on the family. Family members must belong to the same church as the family.

### Features

- Create family
- Add/remove members
- View family profile
- Assign relationships
- Search family
- View family members

---

# 9. Children Management

Children may be registered separately from adult members.

### `children`

- id
- church_id
- family_id
- first_name
- middle_name
- last_name
- gender
- date_of_birth
- school
- notes
- status
- created_at
- updated_at

### `child_guardians`

- id
- child_id
- member_id
- relationship

The system should support more than one guardian. Guardians must be members of the same church.

---

# 10. Departments

Departments are church-defined and configurable. They are not zones.

Examples:

- Choir
- Ushering
- Media
- Protocol
- Technical
- Evangelism
- Children's Church

### Tables

`departments`

- id
- church_id
- name
- description
- status

`member_departments`

- id
- member_id
- department_id
- role
- joined_at
- status

A member can belong to multiple departments in their church.

---

# 11. Ministries

Ministries are separate from departments and from zones.

### Tables

`ministries`

- id
- church_id
- name
- description
- status

`member_ministries`

- id
- member_id
- ministry_id
- role
- joined_at
- status

Examples:

- Youth
- Men's Fellowship
- Women's Fellowship
- Young Adults
- Prayer Ministry

A member can belong to multiple ministries in their church.

---

# 12. Service Management

A service represents a gathering of one church.

### `services`

- id
- church_id
- service_date
- service_type
- name
- theme
- scripture
- preacher
- start_time
- end_time
- notes
- status
- created_at
- updated_at

### Service Types

Configurable per church. Examples:

- Sunday Service
- Sunday School
- Bible Study
- Prayer Meeting
- Thanksgiving Service
- Special Service
- Crossover Service

---

# 13. Attendance Management

## Critical Requirement

The system records attendance as **counts**, not individual member attendance.

### `service_attendance`

- id
- service_id
- category
- count
- created_at
- updated_at

Example:

```text
Adults:       320
Children:      80
Visitors:      27
Workers:       45
Total:        472
```

The exact categories must be configurable per church.

Attendance is recorded for that church's service as a whole. Zone-level attendance counts are out of scope for MVP unless added later.

### Business Rules

- Attendance belongs to a service, which belongs to a church.
- Each category can have only one active count per service.
- Counts cannot be negative.
- Total attendance can be calculated from configured categories or entered separately where required.
- The system must not expose an "attended by member" relationship.

### Reports

- Attendance by Sunday
- Attendance by month
- Attendance by year
- Attendance by service type
- Attendance trend
- Visitor count
- Children count

Reports are scoped to the current church. Super Administrator may see platform-level aggregates (e.g. number of churches reporting) without member-level data from other churches unless they have opened that church for support.

---

# 14. Visitor Management

Visitors can be individually registered because they may require follow-up.

### `visitors`

- id
- church_id
- first_name
- last_name
- phone
- email
- gender
- address
- how_heard
- first_visit_date
- status
- notes
- created_at
- updated_at

### `visitor_visits`

- id
- visitor_id
- service_id
- visit_date
- follow_up_status
- notes

### Visitor Status

- New
- Follow-up
- Contacted
- Returning
- Converted
- Closed

When a visitor is converted to a member, they become a member of the same church. The administrator should be able to assign them to a zone of that church.

---

# 15. Events

### `events`

- id
- church_id
- name
- description
- event_type
- start_date
- end_date
- location
- status
- created_at
- updated_at

### `event_attendance`

- id
- event_id
- attendance_count

Events should support aggregate attendance.

---

# 16. Giving & Finance

## Giving Categories

`giving_types`

- id
- church_id
- name
- description
- status

Examples:

- Tithe
- Offering
- Thanksgiving
- Building Fund
- Missions
- Welfare
- Special Offering

## Giving

`giving`

- id
- church_id
- service_id
- giving_type_id
- member_id nullable
- amount
- payment_method
- transaction_reference
- recorded_by
- created_at

The member association should be optional to support anonymous giving. If set, the member must belong to the same church.

## Expenses

`expense_categories`

- id
- church_id
- name
- description

`expenses`

- id
- church_id
- category_id
- amount
- description
- expense_date
- payment_method
- reference
- recorded_by
- created_at

### Important

The MVP should provide operational income/expense records, not claim to be a complete accounting system. One church must not see another church's giving or expenses.

---

# 17. Pastoral Care

### `pastoral_cases`

- id
- church_id
- member_id
- case_type
- title
- description
- priority
- status
- assigned_to
- opened_at
- closed_at
- notes

Examples:

- Counselling
- Hospital Visit
- Bereavement
- Marriage
- Financial Assistance
- Prayer
- Follow-up

Pastoral information must have restricted access and is church-scoped.

---

# 18. Prayer Requests

### `prayer_requests`

- id
- church_id
- member_id nullable
- title
- description
- status
- assigned_to
- created_at
- completed_at

Statuses:

- Open
- In Progress
- Answered
- Closed

---

# 19. Sermons

### `sermons`

- id
- church_id
- service_id
- title
- preacher
- scripture
- summary
- audio_url
- video_url
- document_url
- created_at

---

# 20. Announcements

### `announcements`

- id
- church_id
- title
- content
- start_date
- end_date
- status
- created_by
- created_at

Announcements may later support email, SMS and push notifications.

---

# 21. Assets

### `assets`

- id
- church_id
- name
- category
- description
- serial_number
- purchase_date
- purchase_cost
- condition
- location
- status
- created_at
- updated_at

Examples:

- Projectors
- Computers
- Sound equipment
- Vehicles
- Furniture
- Buildings

---

# 22. Users, Roles & Permissions

### `users`

- id
- church_id nullable
- member_id nullable
- name
- email
- password_hash
- status
- last_login_at
- created_at
- updated_at

- Super Administrator: `church_id` is null.
- All other users: `church_id` is required and is their tenant.
- Email must be unique on the platform (one login = one church, except Super Administrator).
- `member_id`, if set, must belong to the same church.

### `roles`

- id
- church_id nullable
- name
- description

Platform roles have `church_id` null. Church roles are seeded per church when the church is created (or use platform templates copied into the church).

### `permissions`

- id
- name
- description

### `user_roles`

- user_id
- role_id

### `role_permissions`

- role_id
- permission_id

Permissions should cover actions such as:

- create
- read
- update
- delete
- export
- approve
- manage

and resources such as:

- churches (Super Administrator only)
- members
- zones
- services
- attendance
- visitors
- finance
- pastoral care
- users
- reports

---

# 23. Audit Logs

### `audit_logs`

- id
- church_id nullable
- user_id
- action
- entity_type
- entity_id
- old_data
- new_data
- ip_address
- created_at

`church_id` is null for platform-level actions (e.g. creating a church).

Audit sensitive operations including:

- Church create / suspend
- Member deletion/deactivation
- Zone assignment changes
- Financial changes
- Permission changes
- User creation
- Role changes
- Attendance changes
- Sensitive pastoral record changes

Church users may only see audit logs for their church.

---

# 24. Dashboard

## Platform Dashboard (Super Administrator)

- Number of churches
- Active vs suspended churches
- Create / manage churches

Super Administrator does not need another church's member PII on this dashboard.

## Church Dashboard

Display for the current church:

- Total members
- Active members
- Members by zone
- Unassigned members (no zone)
- Families
- Departments
- Ministries
- Latest service attendance
- Attendance trends
- Visitors
- New members
- Giving summary
- Upcoming events
- Open pastoral cases
- Prayer requests

Zone comparison (member counts and new members per zone) belongs on this dashboard.

---

# 25. Frontend Screens

## Authentication

- Login
- Forgot Password
- Reset Password
- Change Password

## Platform (Super Administrator)

- Platform Dashboard
- Churches List
- Create Church
- Church Details (platform)
- Create Church Administrator

## Dashboard

- Church Dashboard

## Church

- Church Profile / Settings
- Zones
- Zone Details
- Zone Members

## Members

- Member List
- Add Member
- Member Profile
- Edit Member
- Families
- Children
- Membership Statuses

## Departments

- Department List
- Department Details
- Members
- Roles

## Ministries

- Ministry List
- Ministry Details
- Members

## Services

- Service List
- Create Service
- Service Details
- Attendance
- Visitors
- Sermon

## Events

- Event List
- Create Event
- Event Details
- Attendance

## Finance

- Giving
- Giving Categories
- Expenses
- Expense Categories
- Financial Reports

## Pastoral

- Cases
- Case Details
- Prayer Requests

## Communication

- Announcements

## Assets

- Asset List
- Asset Details

## Reports

- Membership Reports
- Membership by Zone
- Attendance Reports
- Visitor Reports
- Financial Reports
- Event Reports

## Administration (church)

- Users
- Roles
- Permissions
- Audit Logs
- System Settings

---

# 26. API Architecture

Recommended stack:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query, TanStack Table, TanStack Form
- PostgreSQL
- Prisma
- Session-cookie authentication
- Cloudinary for files

Suggested API structure:

```text
/api/v1/auth
/api/v1/churches
/api/v1/church
/api/v1/zones
/api/v1/members
/api/v1/families
/api/v1/children
/api/v1/departments
/api/v1/ministries
/api/v1/services
/api/v1/attendance
/api/v1/visitors
/api/v1/events
/api/v1/giving
/api/v1/expenses
/api/v1/pastoral
/api/v1/prayer-requests
/api/v1/sermons
/api/v1/announcements
/api/v1/assets
/api/v1/users
/api/v1/roles
/api/v1/permissions
/api/v1/reports
/api/v1/audit-logs
```

`/api/v1/churches` is Super Administrator only (list, create, suspend).  
`/api/v1/church` is the current tenant's profile.  
All other church APIs must filter by the session's `church_id`. Church users must not pass a `church_id` in the query to select another tenant.

---

# 27. Database Relationships

Core relationships:

```text
Churches (tenants)
    │
    ├── Users (church_id set)
    ├── Zones
    │     └── Members (at most one zone, same church)
    │           ├── Families
    │           ├── Departments
    │           └── Ministries
    ├── Services
    │     ├── Attendance Counts
    │     ├── Visitors
    │     ├── Giving
    │     └── Sermons
    ├── Events
    ├── Pastoral Cases
    ├── Prayer Requests
    ├── Announcements
    └── Assets

Platform
    └── Super Administrator users (church_id null)
```

---

# 28. Business Rules

1. The product is multi-tenant SaaS. Each church is an independent tenant.
2. There is no organizational hierarchy of churches (no regions, districts, or branches as parents of churches).
3. Super Administrator can create many churches and the first Church Administrator for each.
4. Church users cannot create churches or access another church's data.
5. Every church-owned record has `church_id`. Queries must filter by it.
6. Zones are configurable per church. Names such as Hope, Love and Peace must not be hard-coded.
7. A member belongs to exactly one church and at most one zone of that church.
8. A member can belong to multiple departments in their church.
9. A member can belong to multiple ministries in their church.
10. Zones, departments and ministries are distinct concepts.
11. Families can contain multiple members of the same church.
12. Children can have multiple guardians in the same church.
13. Services belong to one church.
14. Attendance is aggregate and not member-specific.
15. Attendance counts cannot be negative.
16. Visitors can have multiple visits.
17. Giving may optionally be associated with a member of the same church.
18. Financial records require restricted permissions and are church-scoped.
19. Pastoral records require restricted permissions and are church-scoped.
20. Deleted member records should normally be soft-deleted.
21. Sensitive administrative changes should be audited.
22. Users must only access data permitted by their roles and tenant.
23. Zone Leaders must only access members in their assigned zone unless they hold a broader role.
24. Reports must respect the user's permissions, church, and zone scope.
25. Configurable categories should be preferred over hard-coded values and are per church.
26. A suspended church's users cannot sign in.

---

# 29. Security Requirements

- Passwords must be securely hashed.
- Sessions must expire.
- Role-based authorization must be enforced server-side.
- Tenant isolation must be enforced server-side on every church-owned query.
- IDs from another church must return 404, not 403 with proof the row exists, when the user is a church user (avoid leaking existence). 404 or generic not-found is acceptable.
- Zone-scoped users must not access other zones' member records in their church.
- Financial and pastoral data require restricted permissions.
- Audit logs must be protected from ordinary users.
- File uploads must be validated. Cloudinary folders must include `church_id`.
- API input must be validated.
- Database queries must use parameterized/ORM mechanisms.
- Sensitive data should be encrypted in transit.
- Production must use HTTPS.
- Regular database backups must be implemented.

---

# 30. Non-Functional Requirements

### Performance

Normal CRUD requests should generally respond within an acceptable API target such as 500 ms under normal load.

### Availability

The production system should support automated backups and recovery procedures.

### Scalability

The system should support:

- Many churches on one deployment
- A large member database per church
- Historical attendance
- Large report datasets

### Maintainability

- Feature-based Next.js modules
- Versioned API (`/api/v1`)
- Database migrations
- Automated tests
- Clear separation of business logic
- Centralized authorization and tenant scoping

---

# 31. MVP

The first release should focus on:

### Phase 1

- Authentication
- Super Administrator + churches (create, suspend)
- First Church Administrator per church
- Church profile
- Zones
- Members
- Families
- Departments
- Ministries
- Services
- Aggregate attendance
- Visitors
- Basic dashboard
- Users/Roles/Permissions
- Tenant isolation tests

### Phase 2

- Children
- Events
- Giving
- Expenses
- Sermons
- Announcements
- Reports

### Phase 3

- Pastoral care
- Prayer requests
- Assets
- Advanced analytics
- Notifications
- Integrations
- Billing / subscriptions
- Mobile applications

---

# 32. Acceptance Criteria

The system is ready for MVP when:

- A Super Administrator can create multiple churches (e.g. ECWA Janruwa and a second church).
- Each church can have its own Church Administrator.
- A Church Administrator can edit their church profile but cannot create another church.
- A Church Administrator can create and manage zones (for example Hope, Love and Peace) for their church only.
- Zone names are configurable, not hard-coded.
- An administrator can create and manage members in their church.
- A member can be assigned to at most one zone of their church.
- Members can be filtered and reported by zone.
- Members can be assigned to families.
- Members can belong to multiple departments and ministries.
- Users of Church A cannot see members, zones, or attendance of Church B (including by guessing IDs).
- A zone leader can access members in their zone only.
- A service can be created.
- Attendance can be recorded by configurable categories and counts.
- The system does not falsely identify individual member attendance.
- Visitors can be registered and linked to service visits.
- Authorized users can view church statistics, including members by zone.
- Users can be assigned roles and permissions within their church.
- Users cannot access unauthorized data.
- Member and attendance reports can be generated for the current church.
- Important administrative changes are audited.
- Database migrations and backups are supported.
- A suspended church's users cannot log in.

---

# 33. Recommended Technology Stack

### Application

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query
- TanStack Table
- TanStack Form

### Data

- Prisma
- PostgreSQL

### Files

- Cloudinary (member photos, church logo, documents), folders namespaced by `church_id`

The UI, Route Handlers (`/api/v1`), and database access live in one Next.js app. There is no separate frontend or Python API.

### Infrastructure

- Vercel (Next.js production and preview deployments)
- Hosted PostgreSQL (Neon or Vercel Postgres) with connection pooling
- Cloudinary
- GitHub (Vercel deploys from git; CI for lint/tests)

Local development may use Docker Compose for PostgreSQL only. Production does not use Docker or Nginx.

### Optional

- Redis for caching/background jobs
- Email/SMS provider
- Sentry or equivalent monitoring

---

# 34. Future Features

Potential future modules:

- SaaS billing / subscriptions
- Custom domains per church
- Super Administrator “view as church” support mode
- Individual attendance
- Zone-level attendance counts
- Member self-service portal
- Mobile application
- Online giving
- SMS/WhatsApp notifications
- Push notifications
- Online registration
- Membership cards
- QR-code check-in
- Children's check-in
- Volunteer management
- Small groups / cell groups within a zone
- Counseling appointment scheduling
- Resource/document management
- Advanced accounting
- Payroll
- Multi-language support
- Public church website integration
- API integrations

---

# 35. Product Success Metrics

The system should eventually measure:

- Number of active churches
- Number of active members (per church and platform total)
- Members assigned to a zone vs unassigned
- Weekly attendance reporting rate
- Visitor follow-up rate
- New-member registration rate
- Monthly active administrators
- Report generation usage
- Data completeness
- Financial record completeness

---

# 36. Implementation Principle

The system should be built as **SaaS for many independent churches**, each with configurable internal structure.

Avoid hard-coding:

- Zone names
- Departments
- Ministries
- Attendance categories
- Membership statuses
- Service types
- Giving categories
- Event types
- User roles

Where practical, these should be configurable per church by authorized administrators.

Do not model churches as children of regions or other churches. Tenancy is a flat list of customers.

This allows the same product to be sold to different churches without changing the database schema.
