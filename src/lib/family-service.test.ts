import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const familyFindMany = vi.fn();
const familyCount = vi.fn();
const familyFindFirst = vi.fn();
const familyCreate = vi.fn();
const familyMemberCreate = vi.fn();
const memberFindFirst = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    family: {
      findMany: (...args: unknown[]) => familyFindMany(...args),
      count: (...args: unknown[]) => familyCount(...args),
      findFirst: (...args: unknown[]) => familyFindFirst(...args),
      create: (...args: unknown[]) => familyCreate(...args),
    },
    familyMember: {
      create: (...args: unknown[]) => familyMemberCreate(...args),
    },
    member: {
      findFirst: (...args: unknown[]) => memberFindFirst(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
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

describe("family service isolation", () => {
  beforeEach(() => {
    familyFindMany.mockReset();
    familyCount.mockReset();
    familyFindFirst.mockReset();
    familyCreate.mockReset();
    familyMemberCreate.mockReset();
    memberFindFirst.mockReset();
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

  it("returns not found for a family in another church", async () => {
    familyFindFirst.mockResolvedValue(null);
    const { getFamily } = await import("./family-service");
    await expect(getFamily(churchAdmin, "family-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects adding a member from another church", async () => {
    familyFindFirst.mockResolvedValue({
      id: "family-a",
      churchId: "church-a",
      members: [],
    });
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

  it("rejects a zone leader creating a family", async () => {
    const { createFamily } = await import("./family-service");
    await expect(
      createFamily(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read"],
        },
        { name: "Adewale" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
