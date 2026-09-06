import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const familyFindMany = vi.fn();
const familyCount = vi.fn();
const familyFindFirst = vi.fn();
const familyCreate = vi.fn();
const familyUpdate = vi.fn();
const familyMemberCreate = vi.fn();
const memberFindFirst = vi.fn();
const zoneFindFirst = vi.fn();
const zoneUpdate = vi.fn();
const listAssignedZoneIds = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    family: {
      findMany: (...args: unknown[]) => familyFindMany(...args),
      count: (...args: unknown[]) => familyCount(...args),
      findFirst: (...args: unknown[]) => familyFindFirst(...args),
      create: (...args: unknown[]) => familyCreate(...args),
      update: (...args: unknown[]) => familyUpdate(...args),
    },
    familyMember: {
      create: (...args: unknown[]) => familyMemberCreate(...args),
    },
    member: {
      findFirst: (...args: unknown[]) => memberFindFirst(...args),
    },
    zone: {
      findFirst: (...args: unknown[]) => zoneFindFirst(...args),
      update: (...args: unknown[]) => zoneUpdate(...args),
    },
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
  permissions: ["families:manage", "families:read"],
};

const otherChurchAdmin = {
  userId: "user-b",
  churchId: "church-b",
  permissions: ["families:manage", "families:read"],
};

const zoneLeader = {
  userId: "zl",
  churchId: "church-a",
  permissions: ["members:read", "zones:read", "families:read"],
};

const hopeFamily = {
  id: "family-a",
  churchId: "church-a",
  zoneId: "zone-hope",
  name: "Adewale",
  members: [],
  children: [],
  zone: { id: "zone-hope", name: "Hope", familyOfTheWeekId: null },
};

describe("family service isolation", () => {
  beforeEach(() => {
    familyFindMany.mockReset();
    familyCount.mockReset();
    familyFindFirst.mockReset();
    familyCreate.mockReset();
    familyUpdate.mockReset();
    familyMemberCreate.mockReset();
    memberFindFirst.mockReset();
    zoneFindFirst.mockReset().mockResolvedValue({
      id: "zone-hope",
      churchId: "church-a",
    });
    zoneUpdate.mockReset().mockResolvedValue({});
    listAssignedZoneIds.mockReset().mockResolvedValue(["zone-hope"]);
  });

  it("lists families only for the session church", async () => {
    familyFindMany.mockResolvedValue([]);
    familyCount.mockResolvedValue(0);
    const { listFamilies } = await import("./family-service");
    const result = await listFamilies(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(familyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("lists only families in a zone leader's assigned zones", async () => {
    familyFindMany.mockResolvedValue([]);
    familyCount.mockResolvedValue(0);
    const { listFamilies } = await import("./family-service");
    await listFamilies(zoneLeader);
    expect(listAssignedZoneIds).toHaveBeenCalledWith("zl", "church-a");
    expect(familyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          zoneId: { in: ["zone-hope"] },
        }),
      }),
    );
  });

  it("returns not found for a family in another church", async () => {
    familyFindFirst.mockResolvedValue(null);
    const { getFamily } = await import("./family-service");
    await expect(getFamily(churchAdmin, "family-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns not found when a zone leader opens another zone's family", async () => {
    familyFindFirst.mockResolvedValue({
      ...hopeFamily,
      zoneId: "zone-other",
      zone: { id: "zone-other", name: "Other", familyOfTheWeekId: null },
    });
    const { getFamily } = await import("./family-service");
    await expect(getFamily(zoneLeader, "family-other")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects adding a member from another church", async () => {
    familyFindFirst.mockResolvedValue(hopeFamily);
    memberFindFirst.mockResolvedValue(null);
    const { addFamilyMember } = await import("./family-service");
    await expect(
      addFamilyMember(churchAdmin, "family-a", {
        memberId: "member-b",
        relationship: "Child",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(familyMemberCreate).not.toHaveBeenCalled();
  });

  it("does not let a church user manage another church's family", async () => {
    familyFindFirst.mockResolvedValue(null);
    const { addFamilyMember } = await import("./family-service");
    await expect(
      addFamilyMember(otherChurchAdmin, "family-a", {
        memberId: "member-a",
        relationship: "Head",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a batch that includes a member from another church", async () => {
    familyFindFirst.mockResolvedValue(hopeFamily);
    memberFindFirst.mockResolvedValue(null);
    const { addFamilyMembers } = await import("./family-service");
    await expect(
      addFamilyMembers(churchAdmin, "family-a", [
        { memberId: "member-b", relationship: "Child" },
      ]),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(familyMemberCreate).not.toHaveBeenCalled();
  });

  it("rejects a zone leader creating a family", async () => {
    const { createFamily } = await import("./family-service");
    await expect(
      createFamily(zoneLeader, { name: "Adewale", zoneId: "zone-hope" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a family zone from another church", async () => {
    zoneFindFirst.mockResolvedValue(null);
    const { createFamily } = await import("./family-service");
    await expect(
      createFamily(churchAdmin, { name: "Adewale", zoneId: "zone-b" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(familyCreate).not.toHaveBeenCalled();
  });

  it("sets family of the week on the family's zone", async () => {
    familyFindFirst.mockResolvedValue({
      ...hopeFamily,
      zone: { id: "zone-hope", name: "Hope", familyOfTheWeekId: "family-old" },
    });
    const { updateFamily } = await import("./family-service");
    const result = await updateFamily(churchAdmin, "family-a", {
      familyOfTheWeek: true,
    });
    expect(zoneUpdate).toHaveBeenCalledWith({
      where: { id: "zone-hope" },
      data: { familyOfTheWeekId: "family-a" },
    });
    expect(familyUpdate).not.toHaveBeenCalled();
    expect(result.isFamilyOfTheWeek).toBe(true);
  });

  it("does not let a church user set another church's family of the week", async () => {
    familyFindFirst.mockResolvedValue(null);
    const { updateFamily } = await import("./family-service");
    await expect(
      updateFamily(otherChurchAdmin, "family-a", { familyOfTheWeek: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(zoneUpdate).not.toHaveBeenCalled();
  });

  it("lets a zone leader set family of the week for an assigned zone", async () => {
    familyFindFirst.mockResolvedValue({
      ...hopeFamily,
      zone: { id: "zone-hope", name: "Hope", familyOfTheWeekId: null },
    });
    const { updateFamily } = await import("./family-service");
    const result = await updateFamily(zoneLeader, "family-a", {
      familyOfTheWeek: true,
    });
    expect(zoneUpdate).toHaveBeenCalledWith({
      where: { id: "zone-hope" },
      data: { familyOfTheWeekId: "family-a" },
    });
    expect(result.isFamilyOfTheWeek).toBe(true);
  });

  it("does not let a zone leader set family of the week in another zone", async () => {
    familyFindFirst.mockResolvedValue({
      ...hopeFamily,
      zoneId: "zone-other",
      zone: { id: "zone-other", name: "Other", familyOfTheWeekId: null },
    });
    const { updateFamily } = await import("./family-service");
    await expect(
      updateFamily(zoneLeader, "family-other", { familyOfTheWeek: true }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(zoneUpdate).not.toHaveBeenCalled();
  });

  it("rejects a zone leader renaming a family", async () => {
    familyFindFirst.mockResolvedValue(hopeFamily);
    const { updateFamily } = await import("./family-service");
    await expect(
      updateFamily(zoneLeader, "family-a", { name: "Renamed" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(familyUpdate).not.toHaveBeenCalled();
    expect(zoneUpdate).not.toHaveBeenCalled();
  });

  it("lists families for a zone in the session church", async () => {
    familyFindMany.mockResolvedValue([]);
    familyCount.mockResolvedValue(0);
    const { listZoneFamilies } = await import("./family-service");
    await listZoneFamilies(churchAdmin, "zone-hope");
    expect(familyFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          zoneId: "zone-hope",
        }),
      }),
    );
  });

  it("returns not found when listing families for another church's zone", async () => {
    zoneFindFirst.mockResolvedValue(null);
    const { listZoneFamilies } = await import("./family-service");
    await expect(
      listZoneFamilies(churchAdmin, "zone-b"),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(familyFindMany).not.toHaveBeenCalled();
  });

  it("returns not found when a zone leader lists another zone's families", async () => {
    zoneFindFirst.mockResolvedValue({ id: "zone-other", churchId: "church-a" });
    const { listZoneFamilies } = await import("./family-service");
    await expect(
      listZoneFamilies(zoneLeader, "zone-other"),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(familyFindMany).not.toHaveBeenCalled();
  });
});
