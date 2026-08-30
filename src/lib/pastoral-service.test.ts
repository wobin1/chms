import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const caseFindMany = vi.fn();
const caseCount = vi.fn();
const caseFindFirst = vi.fn();
const caseCreate = vi.fn();
const memberFindFirst = vi.fn();
const listAssignedZoneIds = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    pastoralCase: {
      findMany: (...args: unknown[]) => caseFindMany(...args),
      count: (...args: unknown[]) => caseCount(...args),
      findFirst: (...args: unknown[]) => caseFindFirst(...args),
      create: (...args: unknown[]) => caseCreate(...args),
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

vi.mock("./zone-service", () => ({
  listAssignedZoneIds: (...args: unknown[]) => listAssignedZoneIds(...args),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["pastoral:manage", "pastoral:read", "members:manage"],
};

const zoneLeader = {
  userId: "zl",
  churchId: "church-a",
  permissions: ["pastoral:read", "zones:read", "members:read"],
};

describe("pastoral case isolation", () => {
  beforeEach(() => {
    caseFindMany.mockReset();
    caseCount.mockReset();
    caseFindFirst.mockReset();
    caseCreate.mockReset();
    memberFindFirst.mockReset();
    listAssignedZoneIds.mockReset().mockResolvedValue(["zone-hope"]);
  });

  it("lists cases only for the session church", async () => {
    caseFindMany.mockResolvedValue([]);
    caseCount.mockResolvedValue(0);
    const { listPastoralCases } = await import("./pastoral-service");
    const result = await listPastoralCases(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(caseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("limits a zone leader to cases whose members are in assigned zones", async () => {
    caseFindMany.mockResolvedValue([]);
    caseCount.mockResolvedValue(0);
    const { listPastoralCases } = await import("./pastoral-service");
    await listPastoralCases(zoneLeader);
    expect(caseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          member: expect.objectContaining({
            zoneId: { in: ["zone-hope"] },
          }),
        }),
      }),
    );
  });

  it("returns not found for a case in another church", async () => {
    caseFindFirst.mockResolvedValue(null);
    const { getPastoralCase } = await import("./pastoral-service");
    await expect(getPastoralCase(churchAdmin, "case-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns not found when a zone leader opens another zone's case", async () => {
    caseFindFirst.mockResolvedValue(null);
    const { getPastoralCase } = await import("./pastoral-service");
    await expect(getPastoralCase(zoneLeader, "case-love")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(caseFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "case-love",
          churchId: "church-a",
          member: expect.objectContaining({
            zoneId: { in: ["zone-hope"] },
          }),
        }),
      }),
    );
  });

  it("rejects an accountant opening a pastoral case", async () => {
    const { createPastoralCase } = await import("./pastoral-service");
    await expect(
      createPastoralCase(
        {
          userId: "acct",
          churchId: "church-a",
          permissions: ["finance:read", "finance:manage"],
        },
        {
          memberId: "member-a",
          caseType: "Counselling",
          title: "Hospital follow-up",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(caseCreate).not.toHaveBeenCalled();
  });

  it("rejects creating a case for a member of another church", async () => {
    memberFindFirst.mockResolvedValue(null);
    const { createPastoralCase } = await import("./pastoral-service");
    await expect(
      createPastoralCase(churchAdmin, {
        memberId: "member-b",
        caseType: "Counselling",
        title: "Hospital follow-up",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(caseCreate).not.toHaveBeenCalled();
  });
});
