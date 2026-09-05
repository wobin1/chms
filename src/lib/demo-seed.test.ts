import { describe, expect, it } from "vitest";
import {
  assertCanSeedDemoAdminInProduction,
  resolveDemoAdminPassword,
  shouldSeedDashboardDemo,
  shouldSeedDemoChurch,
} from "./demo-seed";

describe("shouldSeedDemoChurch", () => {
  it("seeds by default in production", () => {
    expect(shouldSeedDemoChurch({ isProduction: true })).toBe(true);
  });

  it("seeds by default outside production", () => {
    expect(shouldSeedDemoChurch({ isProduction: false })).toBe(true);
  });

  it("can be disabled with SEED_DEMO_CHURCH=false", () => {
    expect(
      shouldSeedDemoChurch({
        isProduction: true,
        flagFromEnv: "false",
      }),
    ).toBe(false);
  });

  it("still seeds when SEED_DEMO_CHURCH=true", () => {
    expect(
      shouldSeedDemoChurch({
        isProduction: true,
        flagFromEnv: "true",
      }),
    ).toBe(true);
  });
});

describe("shouldSeedDashboardDemo", () => {
  it("seeds by default in production", () => {
    expect(shouldSeedDashboardDemo({ isProduction: true })).toBe(true);
  });

  it("seeds by default outside production", () => {
    expect(shouldSeedDashboardDemo({ isProduction: false })).toBe(true);
  });

  it("can be disabled with SEED_DASHBOARD_DEMO=false", () => {
    expect(
      shouldSeedDashboardDemo({
        isProduction: true,
        flagFromEnv: "false",
      }),
    ).toBe(false);
  });
});

describe("resolveDemoAdminPassword", () => {
  it("uses env password in production", () => {
    expect(
      resolveDemoAdminPassword({
        isProduction: true,
        passwordFromEnv: "ProdDemoPass1!",
        defaultPassword: "ChangeMe!church1",
      }),
    ).toBe("ProdDemoPass1!");
  });

  it("requires env password in production when creating demo admin", () => {
    expect(
      resolveDemoAdminPassword({
        isProduction: true,
        defaultPassword: "ChangeMe!church1",
      }),
    ).toBeNull();
  });

  it("falls back to default outside production", () => {
    expect(
      resolveDemoAdminPassword({
        isProduction: false,
        defaultPassword: "ChangeMe!church1",
      }),
    ).toBe("ChangeMe!church1");
  });
});

describe("assertCanSeedDemoAdminInProduction", () => {
  it("throws when production would create demo church without password", () => {
    expect(() =>
      assertCanSeedDemoAdminInProduction({
        isProduction: true,
        password: null,
        willCreateDemoChurch: true,
      }),
    ).toThrow(/SEED_DEMO_ADMIN_PASSWORD is required/);
  });

  it("allows production when demo church will not be created", () => {
    expect(() =>
      assertCanSeedDemoAdminInProduction({
        isProduction: true,
        password: null,
        willCreateDemoChurch: false,
      }),
    ).not.toThrow();
  });

  it("allows production when demo password env is set", () => {
    expect(() =>
      assertCanSeedDemoAdminInProduction({
        isProduction: true,
        password: "ProdDemoPass1!",
        willCreateDemoChurch: true,
      }),
    ).not.toThrow();
  });
});
