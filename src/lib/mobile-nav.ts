/** Matches Tailwind `md` — below this the sidebar is a hamburger drawer. */
export const MOBILE_NAV_MEDIA_QUERY = "(max-width: 767px)";

export function sidebarUsesIconOnly(
  collapsed: boolean,
  mobileDrawerOpen: boolean,
): boolean {
  return collapsed && !mobileDrawerOpen;
}
