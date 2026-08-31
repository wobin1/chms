import { describe, expect, it } from "vitest";
import {
  assertCanSeedSuperAdminInProduction,
  resolveSuperAdminCredentials,
  superAdminUserUpsertData,
} from "./super-admin-seed";

describe("resolveSuperAdminCredentials", () => {
  it("uses env email and password in production", () => {
    expect(
      resolveSuperAdminCredentials({
        isProduction: true,
        emailFromEnv: "Owner@Example.com",
        passwordFromEnv: "SecretPass123!",
        defaultPassword: "ChangeMe!admin1",
      }),
    ).toEqual({
      email: "owner@example.com",
      password: "SecretPass123!",
    });
  });

  it("falls back to defaults outside production", () => {
    expect(
      resolveSuperAdminCredentials({
        isProduction: false,
        defaultPassword: "ChangeMe!admin1",
      }),
    ).toEqual({
      email: "admin@chms.local",
      password: "ChangeMe!admin1",
    });
  });

  it("returns null password in production when env password is missing", () => {
    expect(
      resolveSuperAdminCredentials({
        isProduction: true,
        defaultPassword: "ChangeMe!admin1",
      }),
    ).toEqual({
      email: "admin@chms.local",
      password: null,
    });
  });
});

describe("assertCanSeedSuperAdminInProduction", () => {
  it("throws when production has no password and no existing super admin", () => {
    expect(() =>
      assertCanSeedSuperAdminInProduction({
        isProduction: true,
        password: null,
        superAdminExists: false,
      }),
    ).toThrow(/SEED_SUPER_ADMIN_PASSWORD is required/);
  });

  it("allows production redeploy when the super admin already exists", () => {
    expect(() =>
      assertCanSeedSuperAdminInProduction({
        isProduction: true,
        password: null,
        superAdminExists: true,
      }),
    ).not.toThrow();
  });

  it("allows first production bootstrap when password env is set", () => {
    expect(() =>
      assertCanSeedSuperAdminInProduction({
        isProduction: true,
        password: "SecretPass123!",
        superAdminExists: false,
      }),
    ).not.toThrow();
  });
});

describe("superAdminUserUpsertData", () => {
  it("does not overwrite password on update", () => {
    const data = superAdminUserUpsertData(
      "admin@chms.local",
      "$2b$12$hash",
    );

    expect(data.create.passwordHash).toBe("$2b$12$hash");
    expect(data.update).toEqual({
      name: "Platform Owner",
      status: "ACTIVE",
      churchId: null,
    });
  });
});
