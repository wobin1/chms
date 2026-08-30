import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const requestFindMany = vi.fn();
const requestCount = vi.fn();
const requestFindFirst = vi.fn();
const requestCreate = vi.fn();
const requestUpdate = vi.fn();
const memberFindFirst = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    prayerRequest: {
      findMany: (...args: unknown[]) => requestFindMany(...args),
      count: (...args: unknown[]) => requestCount(...args),
      findFirst: (...args: unknown[]) => requestFindFirst(...args),
      create: (...args: unknown[]) => requestCreate(...args),
      update: (...args: unknown[]) => requestUpdate(...args),
    },
    member: {
      findFirst: (...args: unknown[]) => memberFindFirst(...args),
    },
    user: { findFirst: vi.fn() },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["prayer:manage", "prayer:read"],
};

describe("prayer request isolation", () => {
  beforeEach(() => {
    requestFindMany.mockReset();
    requestCount.mockReset();
    requestFindFirst.mockReset();
    requestCreate.mockReset();
    requestUpdate.mockReset();
    memberFindFirst.mockReset();
  });

  it("lists prayer requests only for the session church", async () => {
    requestFindMany.mockResolvedValue([]);
    requestCount.mockResolvedValue(0);
    const { listPrayerRequests } = await import("./prayer-service");
    const result = await listPrayerRequests(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(requestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("returns not found for a request in another church", async () => {
    requestFindFirst.mockResolvedValue(null);
    const { getPrayerRequest } = await import("./prayer-service");
    await expect(
      getPrayerRequest(churchAdmin, "prayer-b"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("creates an anonymous prayer request for this church", async () => {
    requestCreate.mockResolvedValue({ id: "prayer-a", status: "OPEN" });
    const { createPrayerRequest } = await import("./prayer-service");
    await createPrayerRequest(churchAdmin, {
      title: "Healing for a visitor",
    });
    expect(requestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          churchId: "church-a",
          memberId: null,
          title: "Healing for a visitor",
        }),
      }),
    );
  });

  it("rejects linking a member from another church", async () => {
    memberFindFirst.mockResolvedValue(null);
    const { createPrayerRequest } = await import("./prayer-service");
    await expect(
      createPrayerRequest(churchAdmin, {
        title: "Healing",
        memberId: "member-b",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(requestCreate).not.toHaveBeenCalled();
  });

  it("closes a prayer request of this church", async () => {
    requestFindFirst.mockResolvedValue({
      id: "prayer-a",
      churchId: "church-a",
      status: "OPEN",
    });
    requestUpdate.mockResolvedValue({ id: "prayer-a", status: "CLOSED" });
    const { updatePrayerRequest } = await import("./prayer-service");
    await updatePrayerRequest(churchAdmin, "prayer-a", { status: "CLOSED" });
    expect(requestUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prayer-a" },
        data: expect.objectContaining({ status: "CLOSED" }),
      }),
    );
  });

  it("rejects a zone leader without prayer permission", async () => {
    const { createPrayerRequest } = await import("./prayer-service");
    await expect(
      createPrayerRequest(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read", "pastoral:read"],
        },
        { title: "Healing" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
