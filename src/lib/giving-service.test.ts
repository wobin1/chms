import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, NotFoundError } from "./errors";

const givingFindMany = vi.fn();
const givingCount = vi.fn();
const givingFindFirst = vi.fn();
const givingCreate = vi.fn();
const givingTypeFindFirst = vi.fn();
const memberFindFirst = vi.fn();
const serviceFindFirst = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    giving: {
      findMany: (...args: unknown[]) => givingFindMany(...args),
      count: (...args: unknown[]) => givingCount(...args),
      findFirst: (...args: unknown[]) => givingFindFirst(...args),
      create: (...args: unknown[]) => givingCreate(...args),
    },
    givingType: {
      findFirst: (...args: unknown[]) => givingTypeFindFirst(...args),
    },
    member: {
      findFirst: (...args: unknown[]) => memberFindFirst(...args),
    },
    service: {
      findFirst: (...args: unknown[]) => serviceFindFirst(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["finance:manage", "finance:read"],
};

describe("giving service isolation", () => {
  beforeEach(() => {
    givingFindMany.mockReset();
    givingCount.mockReset();
    givingFindFirst.mockReset();
    givingCreate.mockReset();
    givingTypeFindFirst.mockReset();
    memberFindFirst.mockReset();
    serviceFindFirst.mockReset();
  });

  it("lists giving only for the session church", async () => {
    givingFindMany.mockResolvedValue([]);
    givingCount.mockResolvedValue(0);
    const { listGiving } = await import("./giving-service");
    const result = await listGiving(churchAdmin);
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
    expect(givingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("returns not found for giving in another church", async () => {
    givingFindFirst.mockResolvedValue(null);
    const { getGiving } = await import("./giving-service");
    await expect(getGiving(churchAdmin, "giving-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("records anonymous giving when memberId is omitted", async () => {
    givingTypeFindFirst.mockResolvedValue({
      id: "type-a",
      churchId: "church-a",
    });
    givingCreate.mockResolvedValue({ id: "giving-a", amount: "50.00" });
    const { createGiving } = await import("./giving-service");
    await createGiving(churchAdmin, {
      givingTypeId: "type-a",
      amount: "50.00",
      paymentMethod: "Cash",
    });
    expect(givingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          churchId: "church-a",
          memberId: null,
          recordedById: "user-a",
        }),
      }),
    );
    expect(memberFindFirst).not.toHaveBeenCalled();
  });

  it("rejects a member from another church on a giving record", async () => {
    givingTypeFindFirst.mockResolvedValue({
      id: "type-a",
      churchId: "church-a",
    });
    memberFindFirst.mockResolvedValue(null);
    const { createGiving } = await import("./giving-service");
    await expect(
      createGiving(churchAdmin, {
        givingTypeId: "type-a",
        amount: "20.00",
        paymentMethod: "Cash",
        memberId: "member-b",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(givingCreate).not.toHaveBeenCalled();
  });

  it("rejects a giving type from another church", async () => {
    givingTypeFindFirst.mockResolvedValue(null);
    const { createGiving } = await import("./giving-service");
    await expect(
      createGiving(churchAdmin, {
        givingTypeId: "type-b",
        amount: "20.00",
        paymentMethod: "Cash",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(givingCreate).not.toHaveBeenCalled();
  });

  it("lets an accountant list giving for their church", async () => {
    givingFindMany.mockResolvedValue([]);
    givingCount.mockResolvedValue(0);
    const { listGiving } = await import("./giving-service");
    await listGiving({
      userId: "acct",
      churchId: "church-a",
      permissions: ["finance:read", "finance:manage"],
    });
    expect(givingFindMany).toHaveBeenCalled();
  });

  it("rejects a zone leader recording giving", async () => {
    const { createGiving } = await import("./giving-service");
    await expect(
      createGiving(
        {
          userId: "zl",
          churchId: "church-a",
          permissions: ["members:read", "zones:read"],
        },
        {
          givingTypeId: "type-a",
          amount: "10.00",
          paymentMethod: "Cash",
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
