import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const childFindMany = vi.fn();
const childCount = vi.fn();
const childFindFirst = vi.fn();
const childCreate = vi.fn();
const childGuardianCreate = vi.fn();
const familyFindFirst = vi.fn();
const memberFindFirst = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    child: {
      findMany: (...args: unknown[]) => childFindMany(...args),
      count: (...args: unknown[]) => childCount(...args),
      findFirst: (...args: unknown[]) => childFindFirst(...args),
      create: (...args: unknown[]) => childCreate(...args),
    },
    childGuardian: {
      create: (...args: unknown[]) => childGuardianCreate(...args),
    },
    family: {
      findFirst: (...args: unknown[]) => familyFindFirst(...args),
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
  permissions: ["children:manage", "children:read"],
};

describe("child service isolation", () => {
  beforeEach(() => {
    childFindMany.mockReset();
    childCount.mockReset();
    childFindFirst.mockReset();
    childCreate.mockReset();
    childGuardianCreate.mockReset();
    familyFindFirst.mockReset();
    memberFindFirst.mockReset();
  });

  it("lists children only for the session church", async () => {
    childFindMany.mockResolvedValue([]);
    childCount.mockResolvedValue(0);
    const { listChildren } = await import("./child-service");
    const result = await listChildren(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(childFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("returns not found for a child in another church", async () => {
    childFindFirst.mockResolvedValue(null);
    const { getChild } = await import("./child-service");
    await expect(getChild(churchAdmin, "child-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects registering a child on another church's family", async () => {
    familyFindFirst.mockResolvedValue(null);
    const { createChild } = await import("./child-service");
    await expect(
      createChild(churchAdmin, {
        familyId: "family-b",
        firstName: "Tomi",
        lastName: "Adewale",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(childCreate).not.toHaveBeenCalled();
  });

  it("rejects a guardian who is not a member of this church", async () => {
    familyFindFirst.mockResolvedValue({
      id: "family-a",
      churchId: "church-a",
    });
    memberFindFirst.mockResolvedValue(null);
    const { createChild } = await import("./child-service");
    await expect(
      createChild(churchAdmin, {
        familyId: "family-a",
        firstName: "Tomi",
        lastName: "Adewale",
        guardians: [
          { memberId: "member-b", relationship: "Mother" },
          { memberId: "member-a", relationship: "Father" },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(childCreate).not.toHaveBeenCalled();
  });

  it("registers a child with more than one guardian from this church", async () => {
    familyFindFirst.mockResolvedValue({
      id: "family-a",
      churchId: "church-a",
    });
    memberFindFirst
      .mockResolvedValueOnce({ id: "member-1", churchId: "church-a" })
      .mockResolvedValueOnce({ id: "member-2", churchId: "church-a" });
    childCreate.mockResolvedValue({ id: "child-a" });
    const { createChild } = await import("./child-service");
    await createChild(churchAdmin, {
      familyId: "family-a",
      firstName: "Tomi",
      lastName: "Adewale",
      guardians: [
        { memberId: "member-1", relationship: "Mother" },
        { memberId: "member-2", relationship: "Father" },
      ],
    });
    expect(childCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          churchId: "church-a",
          familyId: "family-a",
          guardians: {
            create: [
              { memberId: "member-1", relationship: "Mother" },
              { memberId: "member-2", relationship: "Father" },
            ],
          },
        }),
      }),
    );
  });

  it("rejects adding a guardian from another church", async () => {
    childFindFirst.mockResolvedValue({
      id: "child-a",
      churchId: "church-a",
      guardians: [],
    });
    memberFindFirst.mockResolvedValue(null);
    const { addChildGuardian } = await import("./child-service");
    await expect(
      addChildGuardian(churchAdmin, "child-a", {
        memberId: "member-b",
        relationship: "Uncle",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(childGuardianCreate).not.toHaveBeenCalled();
  });

  it("rejects a zone leader registering a child", async () => {
    const { createChild } = await import("./child-service");
    await expect(
      createChild(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read"],
        },
        { familyId: "family-a", firstName: "Tomi", lastName: "Adewale" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
