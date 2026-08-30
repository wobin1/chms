export const PLATFORM_PERMISSIONS = ["churches:manage"] as const;

export const CHURCH_PERMISSIONS = [
  "church:update",
  "zones:manage",
  "zones:read",
  "members:manage",
  "members:read",
  "members:export",
  "families:manage",
  "families:read",
  "children:manage",
  "children:read",
  "departments:manage",
  "departments:read",
  "ministries:manage",
  "ministries:read",
  "services:manage",
  "services:read",
  "attendance:manage",
  "visitors:manage",
  "visitors:read",
  "events:manage",
  "events:read",
  "finance:manage",
  "finance:read",
  "sermons:manage",
  "sermons:read",
  "announcements:manage",
  "announcements:read",
  "reports:read",
  "pastoral:manage",
  "pastoral:read",
  "prayer:manage",
  "prayer:read",
  "users:manage",
] as const;

export const CHURCH_ADMIN_PERMISSIONS = [...CHURCH_PERMISSIONS];

export const ZONE_LEADER_PERMISSIONS = [
  "zones:read",
  "members:read",
  "pastoral:read",
] as const;

export const ACCOUNTANT_PERMISSIONS = [
  "finance:read",
  "finance:manage",
] as const;

export const DEFAULT_MEMBERSHIP_STATUSES = [
  "Active",
  "Inactive",
  "Transferred",
  "Deceased",
  "Suspended",
  "Pending",
] as const;

export const DEFAULT_SERVICE_TYPES = [
  "Sunday Service",
  "Sunday School",
  "Bible Study",
  "Prayer Meeting",
] as const;

export const DEFAULT_ATTENDANCE_CATEGORIES = [
  "Adults",
  "Children",
  "Visitors",
  "Workers",
] as const;

export const DEFAULT_GIVING_TYPES = [
  "Tithe",
  "Offering",
  "Thanksgiving",
  "Building Fund",
  "Missions",
  "Welfare",
  "Special Offering",
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Utilities",
  "Maintenance",
  "Welfare",
  "Missions",
  "Transport",
  "Other",
] as const;
