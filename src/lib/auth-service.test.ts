import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticate,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from "./auth-service";
import { hashPassword } from "./password";
import { UnauthorizedError, ValidationError } from "./errors";

const findUnique = vi.fn();
const update = vi.fn();
const auditCreate = vi.fn();
const tokenCreate = vi.fn();
const tokenFindFirst = vi.fn();
const tokenUpdate = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditCreate(...args),
    },
    passwordResetToken: {
      create: (...args: unknown[]) => tokenCreate(...args),
      findFirst: (...args: unknown[]) => tokenFindFirst(...args),
      update: (...args: unknown[]) => tokenUpdate(...args),
    },
  },
}));

vi.mock("./audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./mail", () => ({
  appBaseUrl: () => "http://localhost:3000",
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ sent: false }),
}));

const passwordHash = await hashPassword("ChangeMe!admin1");

function superAdminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "admin-1",
    name: "Platform Owner",
    email: "admin@chms.local",
    passwordHash,
    status: "ACTIVE",
    churchId: null,
    church: null,
    userRoles: [
      {
        role: {
          name: "Super Administrator",
          rolePermissions: [{ permission: { name: "churches:manage" } }],
        },
      },
    ],
    ...overrides,
  };
}

describe("authenticate", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset().mockResolvedValue({});
  });

  it("returns a Super Admin session with null churchId", async () => {
    findUnique.mockResolvedValue(superAdminRow());
    const result = await authenticate("admin@chms.local", "ChangeMe!admin1");
    expect(result.session.churchId).toBeNull();
    expect(result.session.userId).toBe("admin-1");
    expect(result.user.permissions).toContain("churches:manage");
  });

  it("uses a generic failure for a bad password", async () => {
    findUnique.mockResolvedValue(superAdminRow());
    await expect(
      authenticate("admin@chms.local", "nope"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("uses a generic failure when the email is unknown", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      authenticate("nobody@chms.local", "ChangeMe!admin1"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects users of a suspended church", async () => {
    findUnique.mockResolvedValue(
      superAdminRow({
        churchId: "church-a",
        church: { id: "church-a", status: "SUSPENDED", name: "A" },
        userRoles: [
          {
            role: {
              name: "Church Administrator",
              rolePermissions: [{ permission: { name: "members:read" } }],
            },
          },
        ],
      }),
    );
    await expect(
      authenticate("admin@church.example", "ChangeMe!admin1"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("changePassword", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset().mockResolvedValue({});
  });

  it("updates the hash when the current password matches", async () => {
    findUnique.mockResolvedValue(superAdminRow());
    await changePassword("admin-1", "ChangeMe!admin1", "A-new-pass-12");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "admin-1" },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      }),
    );
  });

  it("rejects the wrong current password", async () => {
    findUnique.mockResolvedValue(superAdminRow());
    await expect(
      changePassword("admin-1", "wrong", "A-new-pass-12"),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("password reset", () => {
  beforeEach(() => {
    findUnique.mockReset();
    tokenCreate.mockReset().mockResolvedValue({});
    tokenFindFirst.mockReset();
    tokenUpdate.mockReset().mockResolvedValue({});
    update.mockReset().mockResolvedValue({});
  });

  it("does not reveal whether the email exists", async () => {
    findUnique.mockResolvedValue(null);
    const missing = await requestPasswordReset("nobody@chms.local");
    expect(missing.ok).toBe(true);
    expect(missing.token).toBeUndefined();

    findUnique.mockResolvedValue(superAdminRow());
    const found = await requestPasswordReset("admin@chms.local");
    expect(found.ok).toBe(true);
    expect(found.token).toEqual(expect.any(String));
  });

  it("rejects an unknown reset token", async () => {
    tokenFindFirst.mockResolvedValue(null);
    await expect(
      resetPassword("not-a-real-token", "A-new-pass-12"),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
