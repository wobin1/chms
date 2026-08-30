import { describe, expect, it } from "vitest";
import { requirePermission } from "./permissions";
import { ForbiddenError } from "./errors";
import type { AuthContext } from "./auth-types";

const admin: AuthContext = {
  userId: "admin-1",
  churchId: null,
  permissions: ["churches:manage"],
};

const secretary: AuthContext = {
  userId: "user-2",
  churchId: "church-a",
  permissions: ["members:read"],
};

describe("requirePermission", () => {
  it("allows a matching permission", () => {
    expect(() => requirePermission(admin, "churches:manage")).not.toThrow();
  });

  it("rejects a missing permission", () => {
    expect(() => requirePermission(secretary, "churches:manage")).toThrow(
      ForbiddenError,
    );
  });
});
