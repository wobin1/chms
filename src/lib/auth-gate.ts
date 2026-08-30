import type { SessionClaims } from "./auth-types";

const PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_API_PREFIXES = [
  "/api/v1/health",
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
];

export function isPublicPath(pathname: string) {
  if (PUBLIC_PAGE_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  return PUBLIC_API_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

const PROTECTED_PAGE_PREFIXES = [
  "/platform",
  "/dashboard",
  "/church",
  "/zones",
  "/members",
  "/families",
  "/children",
  "/departments",
  "/ministries",
  "/services",
  "/events",
  "/visitors",
  "/giving",
  "/expenses",
  "/admin",
  "/change-password",
];

export function isProtectedPage(pathname: string) {
  if (pathname === "/") {
    return true;
  }
  return PROTECTED_PAGE_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isPlatformPath(pathname: string) {
  return pathname === "/platform" || pathname.startsWith("/platform/");
}

export function resolveAuthRedirect(
  pathname: string,
  session: SessionClaims | null,
): string | null {
  if (isApiPath(pathname)) {
    return null;
  }

  if (!session) {
    if (isPublicPath(pathname) || !isProtectedPage(pathname)) {
      return null;
    }
    return "/login";
  }

  const isSuperAdmin = session.churchId === null;

  if (isPublicPath(pathname) || pathname === "/") {
    return isSuperAdmin ? "/platform/dashboard" : "/dashboard";
  }

  if (isSuperAdmin && isProtectedPage(pathname) && !isPlatformPath(pathname)) {
    return "/platform/dashboard";
  }

  if (!isSuperAdmin && isPlatformPath(pathname)) {
    return "/dashboard";
  }

  return null;
}
