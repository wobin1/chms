import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "./errors";

const departmentFindFirst = vi.fn();
const memberDepartmentCreate = vi.fn();
const memberFindFirst = vi.fn();
const ministryFindFirst = vi.fn();
const memberMinistryCreate = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    department: {
      findFirst: (...args: unknown[]) => departmentFindFirst(...args),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    memberDepartment: {
      create: (...args: unknown[]) => memberDepartmentCreate(...args),
    },
    ministry: {
      findFirst: (...args: unknown[]) => ministryFindFirst(...args),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    memberMinistry: {
      create: (...args: unknown[]) => memberMinistryCreate(...args),
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
  permissions: [
    "departments:manage",
    "departments:read",
    "ministries:manage",
    "ministries:read",
  ],
};

describe("department and ministry assignment isolation", () => {
  beforeEach(() => {
    departmentFindFirst.mockReset();
    memberDepartmentCreate.mockReset();
    ministryFindFirst.mockReset();
    memberMinistryCreate.mockReset();
    memberFindFirst.mockReset();
  });

  it("rejects assigning another church's member to a department", async () => {
    departmentFindFirst.mockResolvedValue({
      id: "dept-choir",
      churchId: "church-a",
      members: [],
    });
    memberFindFirst.mockResolvedValue(null);
    const { assignDepartmentMember } = await import("./department-service");
    await expect(
      assignDepartmentMember(churchAdmin, "dept-choir", {
        memberId: "member-b",
        role: "Singer",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(memberDepartmentCreate).not.toHaveBeenCalled();
  });

  it("rejects assigning another church's member to a ministry", async () => {
    ministryFindFirst.mockResolvedValue({
      id: "min-youth",
      churchId: "church-a",
      members: [],
    });
    memberFindFirst.mockResolvedValue(null);
    const { assignMinistryMember } = await import("./ministry-service");
    await expect(
      assignMinistryMember(churchAdmin, "min-youth", {
        memberId: "member-b",
        role: "Leader",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(memberMinistryCreate).not.toHaveBeenCalled();
  });
});
