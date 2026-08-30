import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "./errors";

const memberCount = vi.fn();
const memberGroupBy = vi.fn();
const zoneFindMany = vi.fn();
const serviceFindMany = vi.fn();
const visitorCount = vi.fn();
const visitorGroupBy = vi.fn();
const eventFindMany = vi.fn();
const givingFindMany = vi.fn();
const expenseFindMany = vi.fn();
const listAssignedZoneIds = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    member: {
      count: (...args: unknown[]) => memberCount(...args),
      groupBy: (...args: unknown[]) => memberGroupBy(...args),
    },
    zone: {
      findMany: (...args: unknown[]) => zoneFindMany(...args),
    },
    membershipStatus: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    service: {
      findMany: (...args: unknown[]) => serviceFindMany(...args),
    },
    visitor: {
      count: (...args: unknown[]) => visitorCount(...args),
      groupBy: (...args: unknown[]) => visitorGroupBy(...args),
    },
    event: {
      findMany: (...args: unknown[]) => eventFindMany(...args),
    },
    giving: {
      findMany: (...args: unknown[]) => givingFindMany(...args),
    },
    expense: {
      findMany: (...args: unknown[]) => expenseFindMany(...args),
    },
  },
}));

vi.mock("./zone-service", () => ({
  listAssignedZoneIds: (...args: unknown[]) => listAssignedZoneIds(...args),
}));

const churchAdmin = {
  userId: "user-a",
  churchId: "church-a",
  permissions: [
    "reports:read",
    "members:manage",
    "members:read",
    "services:read",
    "visitors:read",
    "events:read",
    "finance:read",
  ],
};

const accountant = {
  userId: "acct",
  churchId: "church-a",
  permissions: ["finance:read", "finance:manage"],
};

const zoneLeader = {
  userId: "zl",
  churchId: "church-a",
  permissions: ["zones:read", "members:read"],
};

describe("report service isolation", () => {
  beforeEach(() => {
    memberCount.mockReset().mockResolvedValue(0);
    memberGroupBy.mockReset().mockResolvedValue([]);
    zoneFindMany.mockReset().mockResolvedValue([]);
    serviceFindMany.mockReset().mockResolvedValue([]);
    visitorCount.mockReset().mockResolvedValue(0);
    visitorGroupBy.mockReset().mockResolvedValue([]);
    eventFindMany.mockReset().mockResolvedValue([]);
    givingFindMany.mockReset().mockResolvedValue([]);
    expenseFindMany.mockReset().mockResolvedValue([]);
    listAssignedZoneIds.mockReset().mockResolvedValue(["zone-hope"]);
  });

  it("scopes the membership report to the session church", async () => {
    const { getMembershipReport } = await import("./report-service");
    await getMembershipReport(churchAdmin);
    expect(memberCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          deletedAt: null,
        }),
      }),
    );
  });

  it("limits a zone-scoped membership report to assigned zones", async () => {
    const { getMembershipReport } = await import("./report-service");
    await getMembershipReport({
      ...zoneLeader,
      permissions: ["reports:read", "zones:read", "members:read"],
    });
    expect(memberCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          zoneId: { in: ["zone-hope"] },
        }),
      }),
    );
  });

  it("rejects a zone leader without reports:read", async () => {
    const { getMembershipReport } = await import("./report-service");
    await expect(getMembershipReport(zoneLeader)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("loads attendance only for the session church and returns counts", async () => {
    serviceFindMany.mockResolvedValue([
      {
        serviceDate: new Date("2026-08-02T00:00:00.000Z"),
        serviceType: { name: "Sunday Service" },
        attendance: [{ count: 40, attendanceCategory: { name: "Adults" } }],
      },
    ]);
    const { getAttendanceReport } = await import("./report-service");
    const report = await getAttendanceReport(churchAdmin, "sunday");
    expect(serviceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
    expect(report.rows[0]?.total).toBe(40);
    expect(JSON.stringify(report)).not.toContain("memberId");
  });

  it("scopes visitor, event, and finance reports to the session church", async () => {
    const { getVisitorReport, getEventReport, getFinanceReport } = await import(
      "./report-service"
    );
    await getVisitorReport(churchAdmin);
    await getEventReport(churchAdmin);
    await getFinanceReport(churchAdmin);
    expect(visitorCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
    expect(eventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
    expect(givingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
    expect(expenseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ churchId: "church-a" }),
      }),
    );
  });

  it("rejects a finance report without finance:read", async () => {
    const { getFinanceReport } = await import("./report-service");
    await expect(
      getFinanceReport({
        userId: "user-a",
        churchId: "church-a",
        permissions: ["reports:read", "members:read"],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(givingFindMany).not.toHaveBeenCalled();
  });

  it("lets an accountant read the finance report for their church", async () => {
    givingFindMany.mockResolvedValue([
      { amount: { toFixed: () => "50.00" }, givingType: { name: "Tithe" } },
    ]);
    expenseFindMany.mockResolvedValue([
      { amount: { toFixed: () => "10.00" }, category: { name: "Utilities" } },
    ]);
    const { getFinanceReport } = await import("./report-service");
    const report = await getFinanceReport(accountant);
    expect(report.givingTotal).toBe("50.00");
    expect(report.expenseTotal).toBe("10.00");
    expect(JSON.stringify(report)).not.toContain("memberId");
  });

  it("builds a membership CSV from this church's aggregates only", async () => {
    const { membershipReportToCsv } = await import("./report-service");
    const csv = membershipReportToCsv({
      total: 3,
      byStatus: [{ name: "Active", count: 3 }],
      byZone: [{ name: "Hope", count: 3 }],
    });
    expect(csv).toContain("Hope");
    expect(csv).toContain("Active");
    expect(csv).not.toContain("church-b");
  });
});
