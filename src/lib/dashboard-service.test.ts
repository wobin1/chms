import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError } from "./errors";

const memberCount = vi.fn();
const memberGroupBy = vi.fn();
const memberFindMany = vi.fn();
const zoneFindMany = vi.fn();
const serviceFindFirst = vi.fn();
const serviceFindMany = vi.fn();
const visitorCount = vi.fn();
const announcementFindMany = vi.fn();
const givingFindMany = vi.fn();
const expenseFindMany = vi.fn();
const listAssignedZoneIds = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    member: {
      count: (...args: unknown[]) => memberCount(...args),
      groupBy: (...args: unknown[]) => memberGroupBy(...args),
      findMany: (...args: unknown[]) => memberFindMany(...args),
    },
    zone: {
      findMany: (...args: unknown[]) => zoneFindMany(...args),
    },
    service: {
      findFirst: (...args: unknown[]) => serviceFindFirst(...args),
      findMany: (...args: unknown[]) => serviceFindMany(...args),
    },
    visitor: {
      count: (...args: unknown[]) => visitorCount(...args),
    },
    announcement: {
      findMany: (...args: unknown[]) => announcementFindMany(...args),
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
    "members:manage",
    "members:read",
    "services:read",
    "visitors:read",
    "announcements:read",
    "finance:read",
  ],
};

const zoneLeader = {
  userId: "user-zl",
  churchId: "church-a",
  permissions: ["zones:read", "members:read"],
};

describe("church dashboard isolation", () => {
  beforeEach(() => {
    memberCount.mockReset().mockResolvedValue(0);
    memberGroupBy.mockReset().mockResolvedValue([]);
    memberFindMany.mockReset().mockResolvedValue([]);
    zoneFindMany.mockReset().mockResolvedValue([]);
    serviceFindFirst.mockReset().mockResolvedValue(null);
    serviceFindMany.mockReset().mockResolvedValue([]);
    visitorCount.mockReset().mockResolvedValue(0);
    announcementFindMany.mockReset().mockResolvedValue([]);
    givingFindMany.mockReset().mockResolvedValue([]);
    expenseFindMany.mockReset().mockResolvedValue([]);
    listAssignedZoneIds.mockReset().mockResolvedValue(["zone-hope"]);
  });

  it("counts members for a church administrator across the church", async () => {
    const { getChurchDashboard } = await import("./dashboard-service");
    await getChurchDashboard(churchAdmin);
    expect(memberCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          deletedAt: null,
        }),
      }),
    );
    const firstWhere = memberCount.mock.calls[0]?.[0]?.where as {
      zoneId?: unknown;
    };
    expect(firstWhere.zoneId).toBeUndefined();
  });

  it("limits a zone leader dashboard to assigned zones", async () => {
    const { getChurchDashboard } = await import("./dashboard-service");
    await getChurchDashboard(zoneLeader);
    expect(memberCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          deletedAt: null,
          zoneId: { in: ["zone-hope"] },
        }),
      }),
    );
    expect(visitorCount).not.toHaveBeenCalled();
    expect(serviceFindFirst).not.toHaveBeenCalled();
    expect(serviceFindMany).not.toHaveBeenCalled();
    expect(announcementFindMany).not.toHaveBeenCalled();
    expect(givingFindMany).not.toHaveBeenCalled();
    expect(expenseFindMany).not.toHaveBeenCalled();
  });

  it("does not let a church user omit churchId from dashboard queries", async () => {
    const { getChurchDashboard } = await import("./dashboard-service");
    await getChurchDashboard(churchAdmin);
    for (const call of memberCount.mock.calls) {
      expect(call[0].where.churchId).toBe("church-a");
    }
  });

  it("loads attendance trend only for the session church", async () => {
    serviceFindMany.mockResolvedValue([
      {
        id: "svc-1",
        name: "Sunday Service",
        serviceDate: new Date("2026-08-24"),
        attendance: [
          {
            count: 100,
            attendanceCategory: { name: "Adults", sortOrder: 0 },
          },
          {
            count: 40,
            attendanceCategory: { name: "Children", sortOrder: 1 },
          },
        ],
      },
    ]);
    const { getChurchDashboard } = await import("./dashboard-service");
    const dashboard = await getChurchDashboard(churchAdmin);
    expect(serviceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          attendance: { some: {} },
        }),
      }),
    );
    expect(dashboard.attendanceTrend).toEqual([
      {
        serviceId: "svc-1",
        name: "Sunday Service",
        serviceDate: new Date("2026-08-24"),
        total: 140,
        categories: [
          { name: "Adults", count: 100 },
          { name: "Children", count: 40 },
        ],
      },
    ]);
  });

  it("loads recent announcements only for the session church", async () => {
    announcementFindMany.mockResolvedValue([
      {
        id: "ann-1",
        title: "Choir practice Friday",
        startDate: new Date("2026-08-28"),
        endDate: new Date("2026-08-30"),
      },
    ]);
    const { getChurchDashboard } = await import("./dashboard-service");
    const dashboard = await getChurchDashboard(churchAdmin);
    expect(announcementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          churchId: "church-a",
          status: "PUBLISHED",
        }),
      }),
    );
    expect(dashboard.recentAnnouncements).toEqual([
      {
        id: "ann-1",
        title: "Choir practice Friday",
        startDate: new Date("2026-08-28"),
        endDate: new Date("2026-08-30"),
      },
    ]);
  });

  it("loads finance trend only for the session church", async () => {
    givingFindMany.mockResolvedValue([
      { amount: 1200, createdAt: new Date("2026-08-24T10:00:00Z") },
      { amount: 800, createdAt: new Date("2026-08-25T10:00:00Z") },
    ]);
    expenseFindMany.mockResolvedValue([
      { amount: 350, expenseDate: new Date("2026-08-26") },
    ]);
    const { getChurchDashboard } = await import("./dashboard-service");
    const dashboard = await getChurchDashboard(churchAdmin);
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
    expect(dashboard.financeTrend).not.toBeNull();
    expect(dashboard.financeTrend!.length).toBeGreaterThan(0);
    const givingTotal = dashboard.financeTrend!.reduce(
      (sum, row) => sum + row.giving,
      0,
    );
    const expenseTotal = dashboard.financeTrend!.reduce(
      (sum, row) => sum + row.expenses,
      0,
    );
    expect(givingTotal).toBe(2000);
    expect(expenseTotal).toBe(350);
  });
});

describe("church dashboard access", () => {
  it("rejects a platform admin with no church context", async () => {
    const { getChurchDashboard } = await import("./dashboard-service");
    await expect(
      getChurchDashboard({
        userId: "admin-1",
        churchId: null,
        permissions: ["churches:manage"],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
