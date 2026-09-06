import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "./errors";

const memberFindMany = vi.fn();
const churchFindUnique = vi.fn();
const listAssignedZoneIds = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    member: {
      findMany: (...args: unknown[]) => memberFindMany(...args),
    },
    church: {
      findUnique: (...args: unknown[]) => churchFindUnique(...args),
    },
  },
}));

vi.mock("./zone-service", () => ({
  listAssignedZoneIds: (...args: unknown[]) => listAssignedZoneIds(...args),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["members:read", "members:manage"],
};

const otherChurchAdmin = {
  userId: "user-b",
  churchId: "church-b",
  permissions: ["members:read", "members:manage"],
};

const zoneLeader = {
  userId: "zl",
  churchId: "church-a",
  permissions: ["members:read", "zones:read"],
};

const ada = {
  id: "member-ada",
  firstName: "Adaeze",
  lastName: "Okonkwo",
  dateOfBirth: new Date("1990-09-12T00:00:00.000Z"),
  photoUrl: null,
  zone: { id: "zone-hope", name: "Hope" },
};

const john = {
  id: "member-john",
  firstName: "John",
  lastName: "Bello",
  dateOfBirth: new Date("1988-03-02T00:00:00.000Z"),
  photoUrl: null,
  zone: { id: "zone-love", name: "Love" },
};

describe("celebrant service isolation", () => {
  beforeEach(() => {
    memberFindMany.mockReset();
    churchFindUnique.mockReset().mockResolvedValue({ name: "ECWA Demo" });
    listAssignedZoneIds.mockReset().mockResolvedValue(["zone-hope"]);
  });

  it("lists monthly celebrants only for the session church", async () => {
    memberFindMany.mockResolvedValue([ada, john]);
    const { listCelebrants } = await import("./celebrant-service");
    const result = await listCelebrants(churchAdmin, {
      period: "month",
      on: "2026-09-06",
    });
    expect(memberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          deletedAt: null,
          dateOfBirth: { not: null },
        }),
      }),
    );
    expect(result.items.map((row) => row.id)).toEqual(["member-ada"]);
    expect(result.churchName).toBe("ECWA Demo");
  });

  it("does not let a church user list another church's celebrants", async () => {
    memberFindMany.mockResolvedValue([]);
    const { listCelebrants } = await import("./celebrant-service");
    await listCelebrants(otherChurchAdmin, { period: "month", on: "2026-09-06" });
    expect(memberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-b" }),
      }),
    );
  });

  it("limits a zone leader to celebrants in assigned zones", async () => {
    memberFindMany.mockResolvedValue([ada]);
    const { listCelebrants } = await import("./celebrant-service");
    await listCelebrants(zoneLeader, { period: "month", on: "2026-09-06" });
    expect(listAssignedZoneIds).toHaveBeenCalledWith("zl", "church-a");
    expect(memberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          zoneId: { in: ["zone-hope"] },
        }),
      }),
    );
  });

  it("rejects a user without members:read", async () => {
    const { listCelebrants } = await import("./celebrant-service");
    await expect(
      listCelebrants(
        { userId: "acc", churchId: "church-a", permissions: ["finance:read"] },
        { period: "month", on: "2026-09-06" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(memberFindMany).not.toHaveBeenCalled();
  });
});
