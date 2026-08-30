"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ChevronsLeft,
  Church,
  Heart,
  HeartHandshake,
  Home,
  Layers,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MessageSquare,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedPage } from "@/components/animated-page";
import { SearchInput } from "@/components/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import type { PublicUser } from "@/lib/auth-types";
import {
  isNavPathAllowed,
  navItemMatchesPath,
  openNavSectionsForPath,
  toggleOpenNavSection,
  visibleNavItems,
  type NavItem,
} from "@/lib/nav";

export type { NavItem };

const icons = {
  home: Home,
  dashboard: LayoutDashboard,
  church: Building2,
  zones: MapPin,
  members: Users,
  families: UsersRound,
  departments: Layers,
  ministries: HeartHandshake,
  services: CalendarDays,
  events: CalendarRange,
  visitors: UserPlus,
  giving: CircleDollarSign,
  announcements: Megaphone,
  reports: BarChart3,
  pastoral: Heart,
  users: Users,
};

async function fetchMe(): Promise<PublicUser> {
  const response = await fetch("/api/v1/auth/me");
  if (!response.ok) {
    throw new Error("unauthenticated");
  }
  const body = (await response.json()) as { user: PublicUser };
  return body.user;
}

export function AppShell({
  nav,
  changePasswordHref = "/change-password",
  children,
}: {
  nav: NavItem[];
  changePasswordHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    retry: false,
  });

  useEffect(() => {
    if (me.isError) {
      router.replace("/login");
    }
  }, [me.isError, router]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const user = me.data;

  const visibleNav = useMemo(
    () => visibleNavItems(nav, user?.permissions ?? []),
    [nav, user?.permissions],
  );

  useEffect(() => {
    if (!user) return;
    if (!isNavPathAllowed(pathname, visibleNav)) {
      router.replace(
        user.isPlatformAdmin ? "/platform/dashboard" : "/dashboard",
      );
    }
  }, [pathname, router, user, visibleNav]);

  useEffect(() => {
    const required = openNavSectionsForPath(visibleNav, pathname);
    if (required.length === 0) return;
    setOpenSections((current) => {
      const missing = required.filter((href) => !current.includes(href));
      return missing.length === 0 ? current : [...current, ...missing];
    });
  }, [pathname, visibleNav]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside
        className={cn(
          "sticky top-0 flex h-svh max-h-svh flex-col overflow-hidden border-r border-border bg-surface transition-[width] duration-200 print:hidden",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <div className="flex shrink-0 items-center gap-2 px-4 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
            <Church className="h-5 w-5" aria-hidden />
          </span>
          {collapsed ? null : (
            <span className="text-lg font-bold tracking-tight text-text">
              CHMS
            </span>
          )}
        </div>
        <nav
          className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 pb-2"
          aria-label="Main"
        >
          {visibleNav.map((item) => {
            const Icon = icons[item.icon];
            const hasChildren = Boolean(item.children?.length);
            const sectionOpen =
              !collapsed && hasChildren && openSections.includes(item.href);
            const active = navItemMatchesPath(item, pathname);
            const selfActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <div key={item.href}>
                <div
                  className={cn(
                    "nav-item-shell motion-nav-item flex items-center rounded-full",
                    active && "nav-item-active",
                    active
                      ? selfActive
                        ? "bg-accent text-white"
                        : "bg-accent-soft text-accent"
                      : "text-text-muted hover:bg-accent-soft hover:text-text",
                  )}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "nav-item-link flex min-w-0 flex-1 items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium",
                      hasChildren && !collapsed ? "pr-1" : "",
                    )}
                  >
                    <Icon className="nav-item-icon h-4 w-4 shrink-0" aria-hidden />
                    {collapsed ? (
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                  {hasChildren && !collapsed ? (
                    <button
                      type="button"
                      className={cn(
                        "nav-submenu-toggle mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        active && selfActive
                          ? "text-white/90 hover:bg-white/15"
                          : "text-text-muted hover:bg-canvas hover:text-text",
                      )}
                      aria-label={
                        sectionOpen
                          ? `Collapse ${item.label}`
                          : `Expand ${item.label}`
                      }
                      aria-expanded={sectionOpen}
                      onClick={() =>
                        setOpenSections((current) =>
                          toggleOpenNavSection(current, item.href),
                        )
                      }
                    >
                      {sectionOpen ? (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  ) : null}
                </div>
                {hasChildren ? (
                <div
                  className={cn(
                    "nav-submenu",
                    sectionOpen && "nav-submenu-open",
                  )}
                  aria-hidden={!sectionOpen}
                >
                  <div className="min-h-0 overflow-hidden">
                    {item.children?.map((child) => {
                      const childActive =
                        pathname === child.href ||
                        pathname.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "nav-child-link motion-nav-item ml-8 mt-1 flex items-center gap-2 rounded-full px-3 py-2 text-sm",
                            childActive
                              ? "nav-child-active bg-accent-soft font-medium text-accent"
                              : "text-text-muted hover:bg-accent-soft/60 hover:text-text",
                          )}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-accent"
                            aria-hidden
                          />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <button
          type="button"
          className="m-3 inline-flex shrink-0 items-center justify-center rounded-xl border border-border p-2 text-text-muted hover:bg-accent-soft"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <ChevronsLeft
            className={cn("h-4 w-4", collapsed && "rotate-180")}
            aria-hidden
          />
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-surface px-6 py-3 print:hidden">
          <div className="min-w-0 flex-1" />
          <SearchInput
            value=""
            onChange={() => {}}
            placeholder="Search members, events, visitors…"
            aria-label="Global search"
            variant="header"
            className="mx-auto w-full max-w-md shrink-0"
          />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
          </button>
          <ThemeToggle />
          <div ref={accountRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-canvas"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-controls={menuId}
              onClick={() => setAccountOpen((value) => !value)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                {user?.name.slice(0, 1) ?? "?"}
              </span>
              <span className="hidden text-left sm:block">
                {user ? (
                  <>
                    <span className="block text-sm font-semibold text-text">
                      {user.name}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {user.roleLabel}
                    </span>
                  </>
                ) : (
                  <span className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden />
            </button>
            {accountOpen ? (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 mt-2 w-48 motion-dropdown rounded-xl border border-border bg-surface p-1 shadow-sm"
              >
                <Link
                  href={changePasswordHref}
                  role="menuitem"
                  className="block rounded-lg px-3 py-2 text-sm text-text hover:bg-accent-soft"
                  onClick={() => setAccountOpen(false)}
                >
                  Change password
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          <AnimatedPage>{children}</AnimatedPage>
        </main>
      </div>
    </div>
  );
}
