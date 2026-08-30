import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authenticate = vi.fn();
const changePassword = vi.fn();
const requestPasswordReset = vi.fn();
const resetPassword = vi.fn();
const requireSession = vi.fn();
const toPublicUser = vi.fn();
const cookieSet = vi.fn();
const cookieDelete = vi.fn();

vi.mock("@/lib/auth-service", () => ({
  authenticate: (...args: unknown[]) => authenticate(...args),
  changePassword: (...args: unknown[]) => changePassword(...args),
  requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
  resetPassword: (...args: unknown[]) => resetPassword(...args),
}));

vi.mock("@/lib/auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
  toPublicUser: (...args: unknown[]) => toPublicUser(...args),
  SESSION_COOKIE: "chms_session",
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    set: cookieSet,
    delete: cookieDelete,
    get: () => undefined,
  }),
}));

describe("auth routes", () => {
  beforeEach(() => {
    authenticate.mockReset();
    changePassword.mockReset();
    requestPasswordReset.mockReset();
    resetPassword.mockReset();
    requireSession.mockReset();
    toPublicUser.mockReset();
    cookieSet.mockReset();
    cookieDelete.mockReset();
  });

  it("POST /api/v1/auth/login sets a session cookie for Super Admin", async () => {
    authenticate.mockResolvedValue({
      session: { userId: "admin-1", churchId: null },
      user: {
        id: "admin-1",
        name: "Platform Owner",
        churchId: null,
        permissions: ["churches:manage"],
        roleLabel: "Super Administrator",
        isPlatformAdmin: true,
      },
    });
    const { POST } = await import("@/app/api/v1/auth/login/route");
    const req = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@chms.local",
        password: "ChangeMe!admin1",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(cookieSet).toHaveBeenCalled();
  });

  it("POST /api/v1/auth/login returns 401 without leaking account existence", async () => {
    const { UnauthorizedError } = await import("@/lib/errors");
    authenticate.mockRejectedValue(new UnauthorizedError("Invalid email or password"));
    const { POST } = await import("@/app/api/v1/auth/login/route");
    const req = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@chms.local",
        password: "wrong",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });

  it("GET /api/v1/auth/me rejects unauthenticated calls", async () => {
    const { UnauthorizedError } = await import("@/lib/errors");
    requireSession.mockRejectedValue(new UnauthorizedError());
    const { GET } = await import("@/app/api/v1/auth/me/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/auth/logout clears the session cookie", async () => {
    const { POST } = await import("@/app/api/v1/auth/logout/route");
    const res = await POST();
    expect(res.status).toBe(204);
    expect(cookieDelete).toHaveBeenCalled();
  });
});
