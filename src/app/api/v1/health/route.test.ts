import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("returns ok when the database responds", async () => {
    queryRaw.mockResolvedValue([{ ok: 1 }]);
    const { GET } = await import("@/app/api/v1/health/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body).not.toHaveProperty("databaseUrl");
  });

  it("returns 503 when the database is down", async () => {
    queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const { GET } = await import("@/app/api/v1/health/route");
    const res = await GET();
    expect(res.status).toBe(503);
  });
});
