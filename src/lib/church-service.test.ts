import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";

const churchFindMany = vi.fn();
const churchFindUnique = vi.fn();
const churchCreate = vi.fn();
const churchUpdate = vi.fn();
const userFindUnique = vi.fn();
const transaction = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    church: {
      findMany: (...args: unknown[]) => churchFindMany(...args),
      findUnique: (...args: unknown[]) => churchFindUnique(...args),
      create: (...args: unknown[]) => churchCreate(...args),
      update: (...args: unknown[]) => churchUpdate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => userFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

const superAdmin = {
  userId: "admin-1",
  churchId: null,
  permissions: ["churches:manage"],
};

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: ["members:manage"],
};

describe("church platform APIs", () => {
  beforeEach(() => {
    churchFindMany.mockReset();
    churchFindUnique.mockReset();
    churchCreate.mockReset();
    churchUpdate.mockReset();
    userFindUnique.mockReset();
    transaction.mockReset();
  });

  it("rejects a church administrator listing churches", async () => {
    const { listChurches } = await import("./church-service");
    await expect(listChurches(churchAdmin)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("rejects a church administrator creating a church", async () => {
    const { createChurch } = await import("./church-service");
    await expect(
      createChurch(churchAdmin, {
        name: "Other",
        slug: "other",
        admin: {
          name: "Ada",
          email: "ada@other.example",
          password: "A-new-pass-12",
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates a church and first administrator for Super Admin", async () => {
    userFindUnique.mockResolvedValue(null);
    const created = {
      id: "church-a",
      name: "ECWA Janruwa",
      slug: "ecwa-janruwa",
      status: "ACTIVE",
    };
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        church: { create: vi.fn().mockResolvedValue(created) },
        permission: {
          findMany: vi.fn().mockResolvedValue([
            { id: "p1", name: "church:update" },
            { id: "p2", name: "zones:manage" },
            { id: "p3", name: "zones:read" },
            { id: "p4", name: "members:manage" },
            { id: "p5", name: "members:read" },
            { id: "p6", name: "users:manage" },
            { id: "p7", name: "families:manage" },
            { id: "p8", name: "families:read" },
            { id: "p19", name: "children:manage" },
            { id: "p20", name: "children:read" },
            { id: "p9", name: "departments:manage" },
            { id: "p10", name: "departments:read" },
            { id: "p11", name: "ministries:manage" },
            { id: "p12", name: "ministries:read" },
            { id: "p13", name: "services:manage" },
            { id: "p14", name: "services:read" },
            { id: "p15", name: "attendance:manage" },
            { id: "p16", name: "visitors:manage" },
            { id: "p17", name: "visitors:read" },
            { id: "p18", name: "members:export" },
            { id: "p21", name: "events:manage" },
            { id: "p22", name: "events:read" },
            { id: "p23", name: "finance:manage" },
            { id: "p24", name: "finance:read" },
            { id: "p25", name: "sermons:manage" },
            { id: "p26", name: "sermons:read" },
            { id: "p27", name: "announcements:manage" },
            { id: "p28", name: "announcements:read" },
            { id: "p29", name: "reports:read" },
            { id: "p30", name: "pastoral:manage" },
            { id: "p31", name: "pastoral:read" },
            { id: "p32", name: "prayer:manage" },
            { id: "p33", name: "prayer:read" },
          ]),
        },
        role: { create: vi.fn().mockResolvedValue({ id: "role-admin" }) },
        rolePermission: { createMany: vi.fn() },
        membershipStatus: { createMany: vi.fn() },
        serviceType: { createMany: vi.fn() },
        attendanceCategory: { createMany: vi.fn() },
        givingType: { createMany: vi.fn() },
        expenseCategory: { createMany: vi.fn() },
        user: { create: vi.fn().mockResolvedValue({ id: "admin-user" }) },
        userRole: { create: vi.fn() },
      };
      return fn(tx);
    });

    const { createChurch } = await import("./church-service");
    const result = await createChurch(superAdmin, {
      name: "ECWA Janruwa",
      slug: "ecwa-janruwa",
      admin: {
        name: "Janruwa Admin",
        email: "admin@janruwa.example",
        password: "A-new-pass-12",
      },
    });
    expect(result.id).toBe("church-a");
  });

  it("conflicts when the church administrator email is already used", async () => {
    userFindUnique.mockResolvedValue({ id: "existing" });
    const { createChurch } = await import("./church-service");
    await expect(
      createChurch(superAdmin, {
        name: "ECWA Janruwa",
        slug: "ecwa-janruwa",
        admin: {
          name: "Janruwa Admin",
          email: "admin@janruwa.example",
          password: "A-new-pass-12",
        },
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("current church profile", () => {
  it("loads only the session church", async () => {
    churchFindUnique.mockResolvedValue({
      id: "church-a",
      name: "ECWA Janruwa",
    });
    const { getCurrentChurch } = await import("./church-service");
    const church = await getCurrentChurch(churchAdmin);
    expect(church.id).toBe("church-a");
    expect(churchFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "church-a" },
      }),
    );
  });

  it("does not let a church user load another church by id", async () => {
    const { getChurchByIdForSession } = await import("./church-service");
    await expect(
      getChurchByIdForSession(churchAdmin, "church-b"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
