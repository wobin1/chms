import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const captureException = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireSession: (...args: unknown[]) => requireSession(...args),
}));

vi.mock("@/lib/monitoring", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

describe("ops sentry-test route", () => {
  beforeEach(() => {
    requireSession.mockReset();
    captureException.mockReset().mockResolvedValue(undefined);
  });

  it("rejects a church administrator", async () => {
    requireSession.mockResolvedValue({
      userId: "user-a",
      churchId: "church-a",
      permissions: ["members:manage"],
    });
    const { POST } = await import("@/app/api/v1/ops/sentry-test/route");
    const res = await POST();
    expect(res.status).toBe(403);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("lets Super Admin fire a test exception", async () => {
    requireSession.mockResolvedValue({
      userId: "admin-1",
      churchId: null,
      permissions: ["churches:manage"],
    });
    const { POST } = await import("@/app/api/v1/ops/sentry-test/route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ event: "ops.sentry_test" }),
    );
  });
});
