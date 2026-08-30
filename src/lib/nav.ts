export type NavItem = {
  href: string;
  label: string;
  icon:
    | "home"
    | "dashboard"
    | "church"
    | "zones"
    | "members"
    | "families"
    | "departments"
    | "ministries"
    | "services"
    | "events"
    | "visitors"
    | "giving"
    | "announcements"
    | "reports"
    | "pastoral"
    | "users";
  children?: { href: string; label: string; permission?: string }[];
  permission?: string;
  anyOf?: string[];
};

export const CHURCH_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/church", label: "Church", icon: "church" },
  { href: "/zones", label: "Zones", icon: "zones", permission: "zones:manage" },
  { href: "/members", label: "Members", icon: "members", permission: "members:read" },
  {
    href: "/families",
    label: "Families",
    icon: "families",
    permission: "families:manage",
    children: [{ href: "/children", label: "Children" }],
  },
  {
    href: "/departments",
    label: "Departments",
    icon: "departments",
    permission: "departments:manage",
  },
  {
    href: "/ministries",
    label: "Ministries",
    icon: "ministries",
    permission: "ministries:manage",
  },
  {
    href: "/services",
    label: "Services",
    icon: "services",
    permission: "services:read",
    children: [{ href: "/sermons", label: "Sermons" }],
  },
  {
    href: "/events",
    label: "Events",
    icon: "events",
    permission: "events:read",
  },
  {
    href: "/announcements",
    label: "Announcements",
    icon: "announcements",
    permission: "announcements:read",
  },
  {
    href: "/visitors",
    label: "Visitors",
    icon: "visitors",
    permission: "visitors:read",
  },
  {
    href: "/giving",
    label: "Giving",
    icon: "giving",
    permission: "finance:read",
    children: [{ href: "/expenses", label: "Expenses" }],
  },
  {
    href: "/reports",
    label: "Reports",
    icon: "reports",
    anyOf: ["reports:read", "finance:read"],
  },
  {
    href: "/pastoral",
    label: "Pastoral",
    icon: "pastoral",
    permission: "pastoral:read",
    children: [
      {
        href: "/prayer-requests",
        label: "Prayer requests",
        permission: "prayer:read",
      },
    ],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "users",
    permission: "users:manage",
    children: [{ href: "/admin/roles", label: "Roles" }],
  },
];

export function visibleNavItems(nav: NavItem[], permissions: string[]) {
  return nav
    .filter((item) => {
      if (item.anyOf?.length) {
        return item.anyOf.some((name) => permissions.includes(name));
      }
      return !item.permission || permissions.includes(item.permission);
    })
    .map((item) => ({
      ...item,
      children: item.children?.filter(
        (child) => !child.permission || permissions.includes(child.permission),
      ),
    }));
}

const ALWAYS_ALLOWED_PREFIXES = [
  "/change-password",
  "/platform/change-password",
];

export function isNavPathAllowed(pathname: string, items: NavItem[]) {
  if (
    ALWAYS_ALLOWED_PREFIXES.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return true;
  }
  return items.some((item) => navItemMatchesPath(item, pathname));
}

export function navItemMatchesPath(item: NavItem, pathname: string) {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }
  return (item.children ?? []).some(
    (child) =>
      pathname === child.href || pathname.startsWith(`${child.href}/`),
  );
}

export function openNavSectionsForPath(items: NavItem[], pathname: string) {
  return items
    .filter(
      (item) =>
        Boolean(item.children?.length) && navItemMatchesPath(item, pathname),
    )
    .map((item) => item.href);
}

export function toggleOpenNavSection(open: string[], href: string) {
  return open.includes(href)
    ? open.filter((value) => value !== href)
    : [...open, href];
}

