import { describe, expect, it } from "vitest";
import { tenantWhere, requireChurch } from "./tenant";
import { ForbiddenError } from "./errors";
import type { AuthContext } from "./auth-types";

const churchUser: AuthContext = {
  userId: "user-1",
  churchId: "church-a",
  permissions: ["members:read"],
};

const superAdmin: AuthContext = {
  userId: "admin-1",
  churchId: null,
  permissions: ["churches:manage"],
};

describe("tenantWhere", () => {
  it("always includes churchId from the session, never from the caller as the source of truth", () => {
    expect(tenantWhere("church-a")).toEqual({ churchId: "church-a" });
  });

  it("merges extra filters without dropping churchId", () => {
    expect(tenantWhere("church-a", { zoneId: "zone-1" })).toEqual({
      churchId: "church-a",
      zoneId: "zone-1",
    });
  });
});

describe("requireChurch", () => {
  it("returns the church id for a church user", () => {
    expect(requireChurch(churchUser)).toBe("church-a");
  });

  it("rejects Super Administrator because they have no tenant", () => {
    expect(() => requireChurch(superAdmin)).toThrow(ForbiddenError);
  });
});
