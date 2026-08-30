import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, ValidationError } from "./errors";

const userFindFirst = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const memberFindFirst = vi.fn();
const userRoleDeleteMany = vi.fn();
const userRoleCreate = vi.fn();
const roleFindFirst = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => userFindFirst(...args),
      findUnique: (...args: unknown[]) => userFindUnique(...args),
      findMany: vi.fn(),
      create: vi.fn(),
      update: (...args: unknown[]) => userUpdate(...args),
    },
    member: {
      findFirst: (...args: unknown[]) => memberFindFirst(...args),
    },
    role: {
      findFirst: (...args: unknown[]) => roleFindFirst(...args),
      findMany: vi.fn(),
    },
    userRole: {
      deleteMany: (...args: unknown[]) => userRoleDeleteMany(...args),
      create: (...args: unknown[]) => userRoleCreate(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["users:manage"],
};

describe("church user isolation", () => {
  beforeEach(() => {
    userFindFirst.mockReset();
    userFindUnique.mockReset();
    userUpdate.mockReset();
    memberFindFirst.mockReset();
    userRoleDeleteMany.mockReset();
    userRoleCreate.mockReset();
    roleFindFirst.mockReset();
  });

  it("returns not found for a user in another church", async () => {
    userFindFirst.mockResolvedValue(null);
    const { getChurchUser } = await import("./user-service");
    await expect(getChurchUser(churchAdmin, "user-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("does not link a member from another church", async () => {
    userFindFirst.mockResolvedValue({
      id: "user-a2",
      churchId: "church-a",
      userRoles: [],
    });
    memberFindFirst.mockResolvedValue(null);
    const { updateChurchUser } = await import("./user-service");
    await expect(
      updateChurchUser(churchAdmin, "user-a2", {
        memberId: "member-b",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("rejects linking when the member id is missing from this church", async () => {
    memberFindFirst.mockResolvedValue(null);
    roleFindFirst.mockResolvedValue({ id: "role-zl", churchId: "church-a" });
    userFindUnique.mockResolvedValue(null);
    const { createChurchUser } = await import("./user-service");
    await expect(
      createChurchUser(churchAdmin, {
        name: "Hope Leader",
        email: "hope@church-a.example",
        password: "A-new-pass-12",
        roleName: "Zone Leader",
        memberId: "member-b",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("church user rules", () => {
  beforeEach(() => {
    userFindFirst.mockReset();
    userUpdate.mockReset();
  });

  it("does not let a user disable their own account", async () => {
    userFindFirst.mockResolvedValue({
      id: "user-a",
      churchId: "church-a",
      userRoles: [],
    });
    const { updateChurchUser } = await import("./user-service");
    await expect(
      updateChurchUser(churchAdmin, "user-a", { status: "DISABLED" }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(userUpdate).not.toHaveBeenCalled();
  });
});

describe("church roles isolation", () => {
  beforeEach(() => {
    roleFindFirst.mockReset();
  });

  it("returns not found for a role in another church", async () => {
    roleFindFirst.mockResolvedValue(null);
    const { getChurchRole } = await import("./user-service");
    await expect(getChurchRole(churchAdmin, "role-b")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects platform permissions on a church role", async () => {
    roleFindFirst.mockResolvedValue({
      id: "role-admin",
      churchId: "church-a",
      name: "Church Administrator",
      description: null,
      rolePermissions: [],
    });
    const { updateChurchRolePermissions } = await import("./user-service");
    await expect(
      updateChurchRolePermissions(churchAdmin, "role-admin", [
        "users:manage",
        "churches:manage",
      ]),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
