import { describe, expect, it } from "vitest";
import { isPublicPath, resolveAuthRedirect } from "./auth-gate";
import type { SessionClaims } from "./auth-types";

const superAdmin: SessionClaims = { userId: "a", churchId: null };
const churchUser: SessionClaims = { userId: "u", churchId: "church-a" };

describe("resolveAuthRedirect", () => {
  it("sends signed-out visitors to login for app URLs", () => {
    expect(resolveAuthRedirect("/platform/dashboard", null)).toBe("/login");
    expect(resolveAuthRedirect("/dashboard", null)).toBe("/login");
  });

  it("does not send unknown public URLs to login (so /register 404s)", () => {
    expect(resolveAuthRedirect("/register", null)).toBeNull();
  });

  it("allows login and password-reset pages without a session", () => {
    expect(resolveAuthRedirect("/login", null)).toBeNull();
    expect(resolveAuthRedirect("/forgot-password", null)).toBeNull();
    expect(resolveAuthRedirect("/reset-password", null)).toBeNull();
  });

  it("keeps session APIs public except /me", () => {
    expect(isPublicPath("/api/v1/auth/login")).toBe(true);
    expect(isPublicPath("/api/v1/auth/logout")).toBe(true);
    expect(isPublicPath("/api/v1/auth/me")).toBe(false);
  });

  it("sends Super Admin to the platform shell", () => {
    expect(resolveAuthRedirect("/dashboard", superAdmin)).toBe(
      "/platform/dashboard",
    );
    expect(resolveAuthRedirect("/login", superAdmin)).toBe(
      "/platform/dashboard",
    );
  });

  it("keeps church users out of platform routes", () => {
    expect(resolveAuthRedirect("/platform/dashboard", churchUser)).toBe(
      "/dashboard",
    );
  });
});
