import { describe, expect, it } from "vitest";
import { constrainZoneFilter, getVisibleMemberFilter } from "./zone-scope";

describe("getVisibleMemberFilter", () => {
  it("lets a church administrator see all non-deleted members of their church", () => {
    expect(
      getVisibleMemberFilter({
        churchId: "church-a",
        permissions: ["members:manage", "members:read"],
        assignedZoneIds: ["zone-hope"],
      }),
    ).toEqual({ churchId: "church-a", deletedAt: null });
  });

  it("limits a zone leader to members in their assigned zones", () => {
    expect(
      getVisibleMemberFilter({
        churchId: "church-a",
        permissions: ["members:read"],
        assignedZoneIds: ["zone-hope"],
      }),
    ).toEqual({
      churchId: "church-a",
      deletedAt: null,
      zoneId: { in: ["zone-hope"] },
    });
  });

  it("returns no members when a zone leader has no assigned zones", () => {
    expect(
      getVisibleMemberFilter({
        churchId: "church-a",
        permissions: ["members:read"],
        assignedZoneIds: [],
      }),
    ).toEqual({
      churchId: "church-a",
      deletedAt: null,
      zoneId: { in: [] },
    });
  });

  it("keeps a zone leader inside assigned zones even if they filter by another zone", () => {
    expect(
      constrainZoneFilter(
        {
          churchId: "church-a",
          deletedAt: null,
          zoneId: { in: ["zone-hope"] },
        },
        "zone-love",
      ),
    ).toEqual({
      churchId: "church-a",
      deletedAt: null,
      zoneId: { in: [] },
    });
  });

  it("allows a zone leader to filter to one of their assigned zones", () => {
    expect(
      constrainZoneFilter(
        {
          churchId: "church-a",
          deletedAt: null,
          zoneId: { in: ["zone-hope", "zone-peace"] },
        },
        "zone-hope",
      ),
    ).toEqual({
      churchId: "church-a",
      deletedAt: null,
      zoneId: "zone-hope",
    });
  });

  it("lets a church administrator filter by any zone in their church", () => {
    expect(
      constrainZoneFilter(
        { churchId: "church-a", deletedAt: null },
        "zone-love",
      ),
    ).toEqual({
      churchId: "church-a",
      deletedAt: null,
      zoneId: "zone-love",
    });
  });

  it("does not let a zone leader with no assignments filter into another zone", () => {
    expect(
      constrainZoneFilter(
        {
          churchId: "church-a",
          deletedAt: null,
          zoneId: { in: [] },
        },
        "zone-love",
      ),
    ).toEqual({
      churchId: "church-a",
      deletedAt: null,
      zoneId: { in: [] },
    });
  });
});
