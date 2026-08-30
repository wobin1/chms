import { describe, expect, it } from "vitest";
import { CHURCH_ADMIN_PERMISSIONS, ZONE_LEADER_PERMISSIONS } from "./permission-catalog";
import {
  CHURCH_NAV,
  isNavPathAllowed,
  navItemMatchesPath,
  openNavSectionsForPath,
  toggleOpenNavSection,
  visibleNavItems,
} from "./nav";

describe("church sidebar nav", () => {
  it("shows a zone leader Dashboard, Members, and Pastoral", () => {
    expect(
      visibleNavItems(CHURCH_NAV, [...ZONE_LEADER_PERMISSIONS]).map(
        (item) => item.label,
      ),
    ).toEqual(["Dashboard", "Church", "Members", "Pastoral"]);
  });

  it("shows a church administrator the full church menu", () => {
    expect(
      visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]).map(
        (item) => item.label,
      ),
    ).toEqual([
      "Dashboard",
      "Church",
      "Zones",
      "Members",
      "Families",
      "Departments",
      "Ministries",
      "Services",
      "Events",
      "Announcements",
      "Visitors",
      "Giving",
      "Reports",
      "Pastoral",
      "Users",
    ]);
  });

  it("does not treat Zones or Users as allowed paths for a zone leader", () => {
    const items = visibleNavItems(CHURCH_NAV, [...ZONE_LEADER_PERMISSIONS]);
    expect(isNavPathAllowed("/members", items)).toBe(true);
    expect(isNavPathAllowed("/members/abc", items)).toBe(true);
    expect(isNavPathAllowed("/dashboard", items)).toBe(true);
    expect(isNavPathAllowed("/change-password", items)).toBe(true);
    expect(isNavPathAllowed("/church", items)).toBe(true);
    expect(isNavPathAllowed("/zones", items)).toBe(false);
    expect(isNavPathAllowed("/families", items)).toBe(false);
    expect(isNavPathAllowed("/children", items)).toBe(false);
    expect(isNavPathAllowed("/departments", items)).toBe(false);
    expect(isNavPathAllowed("/ministries", items)).toBe(false);
    expect(isNavPathAllowed("/services", items)).toBe(false);
    expect(isNavPathAllowed("/events", items)).toBe(false);
    expect(isNavPathAllowed("/sermons", items)).toBe(false);
    expect(isNavPathAllowed("/announcements", items)).toBe(false);
    expect(isNavPathAllowed("/visitors", items)).toBe(false);
    expect(isNavPathAllowed("/giving", items)).toBe(false);
    expect(isNavPathAllowed("/expenses", items)).toBe(false);
    expect(isNavPathAllowed("/reports", items)).toBe(false);
    expect(isNavPathAllowed("/pastoral", items)).toBe(true);
    expect(isNavPathAllowed("/prayer-requests", items)).toBe(false);
    expect(isNavPathAllowed("/admin/users", items)).toBe(false);
    expect(isNavPathAllowed("/admin/roles", items)).toBe(false);
  });

  it("allows a church administrator to open roles under Users", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/admin/users", items)).toBe(true);
    expect(isNavPathAllowed("/admin/roles", items)).toBe(true);
    expect(isNavPathAllowed("/admin/roles/abc", items)).toBe(true);
  });

  it("allows a church administrator to open children under Families", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/families", items)).toBe(true);
    expect(isNavPathAllowed("/children", items)).toBe(true);
    expect(isNavPathAllowed("/children/abc", items)).toBe(true);
  });

  it("allows a church administrator to open events", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/events", items)).toBe(true);
    expect(isNavPathAllowed("/events/abc", items)).toBe(true);
  });

  it("allows a church administrator to open sermons under Services", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/services", items)).toBe(true);
    expect(isNavPathAllowed("/sermons", items)).toBe(true);
    expect(isNavPathAllowed("/sermons/abc", items)).toBe(true);
  });

  it("allows a church administrator to open announcements", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/announcements", items)).toBe(true);
    expect(isNavPathAllowed("/announcements/abc", items)).toBe(true);
  });

  it("allows a church administrator to open giving and expenses", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/giving", items)).toBe(true);
    expect(isNavPathAllowed("/expenses", items)).toBe(true);
    expect(isNavPathAllowed("/expenses/abc", items)).toBe(true);
  });

  it("allows a church administrator to open reports", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/reports", items)).toBe(true);
  });

  it("allows a church administrator to open pastoral cases and prayer requests", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(isNavPathAllowed("/pastoral", items)).toBe(true);
    expect(isNavPathAllowed("/pastoral/abc", items)).toBe(true);
    expect(isNavPathAllowed("/prayer-requests", items)).toBe(true);
    expect(isNavPathAllowed("/prayer-requests/abc", items)).toBe(true);
  });

  it("shows an accountant Dashboard, Giving, Expenses, and Reports", () => {
    const items = visibleNavItems(CHURCH_NAV, [
      "finance:read",
      "finance:manage",
    ]);
    expect(items.map((item) => item.label)).toEqual([
      "Dashboard",
      "Church",
      "Giving",
      "Reports",
    ]);
    expect(isNavPathAllowed("/giving", items)).toBe(true);
    expect(isNavPathAllowed("/expenses", items)).toBe(true);
    expect(isNavPathAllowed("/reports", items)).toBe(true);
    expect(isNavPathAllowed("/members", items)).toBe(false);
    expect(isNavPathAllowed("/sermons", items)).toBe(false);
    expect(isNavPathAllowed("/announcements", items)).toBe(false);
    expect(isNavPathAllowed("/pastoral", items)).toBe(false);
    expect(isNavPathAllowed("/prayer-requests", items)).toBe(false);
  });

  it("matches a parent section when the path is a nested child", () => {
    const users = CHURCH_NAV.find((item) => item.label === "Users");
    expect(users).toBeDefined();
    expect(navItemMatchesPath(users!, "/admin/roles")).toBe(true);
    expect(navItemMatchesPath(users!, "/admin/users")).toBe(true);
    expect(navItemMatchesPath(users!, "/members")).toBe(false);
  });

  it("opens only the parent sections that contain the current path", () => {
    const items = visibleNavItems(CHURCH_NAV, [...CHURCH_ADMIN_PERMISSIONS]);
    expect(openNavSectionsForPath(items, "/admin/roles")).toEqual([
      "/admin/users",
    ]);
    expect(openNavSectionsForPath(items, "/children")).toEqual(["/families"]);
    expect(openNavSectionsForPath(items, "/dashboard")).toEqual([]);
  });

  it("toggles a parent section open and closed", () => {
    expect(toggleOpenNavSection([], "/families")).toEqual(["/families"]);
    expect(toggleOpenNavSection(["/families"], "/families")).toEqual([]);
    expect(toggleOpenNavSection(["/families"], "/giving")).toEqual([
      "/families",
      "/giving",
    ]);
  });
});
