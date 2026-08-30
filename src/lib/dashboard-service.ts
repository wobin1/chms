import "server-only";
import { getVisibleMemberFilter, isZoneScoped } from "./zone-scope";
import type { AuthContext } from "./auth-types";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch } from "./tenant";
import { listAssignedZoneIds } from "./zone-service";

const ATTENDANCE_TREND_LIMIT = 8;
const ANNOUNCEMENT_LIMIT = 6;
const MEMBER_GROWTH_WEEKS = 8;
const FINANCE_WEEKS = 8;

function startOfUtcWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function emptyWeekBuckets(weeks: number): { weekStart: string; giving: number; expenses: number }[] {
  const now = new Date();
  const thisWeek = startOfUtcWeek(now);
  const buckets: { weekStart: string; giving: number; expenses: number }[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(thisWeek);
    weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
    buckets.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      giving: 0,
      expenses: 0,
    });
  }
  return buckets;
}

function moneyNumber(value: { toString(): string } | number | string): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

function buildMemberGrowth(
  createdAts: Date[],
  weeks: number,
): { weekStart: string; count: number }[] {
  const now = new Date();
  const thisWeek = startOfUtcWeek(now);
  const buckets: { weekStart: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(thisWeek);
    weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
    buckets.push({ weekStart: weekStart.toISOString().slice(0, 10), count: 0 });
  }
  const indexByWeek = new Map(buckets.map((b, i) => [b.weekStart, i]));
  for (const createdAt of createdAts) {
    const key = startOfUtcWeek(createdAt).toISOString().slice(0, 10);
    const index = indexByWeek.get(key);
    if (index !== undefined) {
      buckets[index]!.count += 1;
    }
  }
  let cumulative = 0;
  return buckets.map((bucket) => {
    cumulative += bucket.count;
    return { weekStart: bucket.weekStart, count: cumulative };
  });
}

export async function getChurchDashboard(session: AuthContext) {
  requirePermission(session, "members:read");
  const churchId = requireChurch(session);
  const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
  const memberWhere = getVisibleMemberFilter({
    churchId,
    permissions: session.permissions,
    assignedZoneIds,
  });
  const scoped = isZoneScoped(session);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);

  const growthSince = new Date();
  growthSince.setUTCDate(growthSince.getUTCDate() - MEMBER_GROWTH_WEEKS * 7);

  const [total, active, unassigned, newMembers, growthRows] = await Promise.all([
    prisma.member.count({ where: memberWhere }),
    prisma.member.count({
      where: { ...memberWhere, membershipStatus: { name: "Active" } },
    }),
    scoped
      ? Promise.resolve(0)
      : prisma.member.count({ where: { ...memberWhere, zoneId: null } }),
    prisma.member.count({
      where: { ...memberWhere, createdAt: { gte: since } },
    }),
    prisma.member.findMany({
      where: { ...memberWhere, createdAt: { gte: growthSince } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const zones = await prisma.zone.findMany({
    where: scoped
      ? { churchId, status: "ACTIVE", id: { in: assignedZoneIds } }
      : { churchId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const [grouped, newGrouped] = await Promise.all([
    prisma.member.groupBy({
      by: ["zoneId"],
      where: memberWhere,
      _count: { _all: true },
    }),
    prisma.member.groupBy({
      by: ["zoneId"],
      where: { ...memberWhere, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const countByZone = new Map(
    grouped.map((row) => [row.zoneId, row._count._all]),
  );
  const newByZone = new Map(
    newGrouped.map((row) => [row.zoneId, row._count._all]),
  );
  const byZone = zones.map((zone) => ({
    zoneId: zone.id,
    name: zone.name,
    members: countByZone.get(zone.id) ?? 0,
    newMembers: newByZone.get(zone.id) ?? 0,
  }));

  let latestAttendance: {
    serviceId: string;
    name: string;
    serviceDate: Date;
    total: number;
    categories: { name: string; count: number }[];
  } | null = null;
  let attendanceTrend: {
    serviceId: string;
    name: string;
    serviceDate: Date;
    total: number;
    categories: { name: string; count: number }[];
  }[] | null = null;

  if (
    session.permissions.includes("services:read") ||
    session.permissions.includes("attendance:manage")
  ) {
    const services = await prisma.service.findMany({
      where: { churchId, attendance: { some: {} } },
      orderBy: { serviceDate: "desc" },
      take: ATTENDANCE_TREND_LIMIT,
      include: {
        attendance: {
          include: {
            attendanceCategory: { select: { name: true, sortOrder: true } },
          },
          orderBy: { attendanceCategory: { sortOrder: "asc" } },
        },
      },
    });
    attendanceTrend = services
      .map((service) => ({
        serviceId: service.id,
        name: service.name,
        serviceDate: service.serviceDate,
        total: service.attendance.reduce((sum, row) => sum + row.count, 0),
        categories: service.attendance.map((row) => ({
          name: row.attendanceCategory.name,
          count: row.count,
        })),
      }))
      .reverse();

    const newest = services[0];
    if (newest) {
      latestAttendance = {
        serviceId: newest.id,
        name: newest.name,
        serviceDate: newest.serviceDate,
        total: newest.attendance.reduce((sum, row) => sum + row.count, 0),
        categories: newest.attendance.map((row) => ({
          name: row.attendanceCategory.name,
          count: row.count,
        })),
      };
    }
  }

  let visitors: { total: number } | null = null;
  if (session.permissions.includes("visitors:read")) {
    visitors = {
      total: await prisma.visitor.count({ where: { churchId } }),
    };
  }

  let recentAnnouncements: {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
  }[] | null = null;
  if (session.permissions.includes("announcements:read")) {
    recentAnnouncements = await prisma.announcement.findMany({
      where: { churchId, status: "PUBLISHED" },
      orderBy: { startDate: "desc" },
      take: ANNOUNCEMENT_LIMIT,
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
      },
    });
  }

  let financeTrend: {
    weekStart: string;
    giving: number;
    expenses: number;
  }[] | null = null;
  if (session.permissions.includes("finance:read")) {
    const financeSince = new Date();
    financeSince.setUTCDate(financeSince.getUTCDate() - FINANCE_WEEKS * 7);
    const [givingRows, expenseRows] = await Promise.all([
      prisma.giving.findMany({
        where: { churchId, createdAt: { gte: financeSince } },
        select: { amount: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: { churchId, expenseDate: { gte: financeSince } },
        select: { amount: true, expenseDate: true },
      }),
    ]);
    const buckets = emptyWeekBuckets(FINANCE_WEEKS);
    const indexByWeek = new Map(buckets.map((b, i) => [b.weekStart, i]));
    for (const row of givingRows) {
      const key = startOfUtcWeek(row.createdAt).toISOString().slice(0, 10);
      const index = indexByWeek.get(key);
      if (index !== undefined) {
        buckets[index]!.giving += moneyNumber(row.amount);
      }
    }
    for (const row of expenseRows) {
      const key = startOfUtcWeek(row.expenseDate).toISOString().slice(0, 10);
      const index = indexByWeek.get(key);
      if (index !== undefined) {
        buckets[index]!.expenses += moneyNumber(row.amount);
      }
    }
    financeTrend = buckets.map((bucket) => ({
      weekStart: bucket.weekStart,
      giving: Math.round(bucket.giving * 100) / 100,
      expenses: Math.round(bucket.expenses * 100) / 100,
    }));
  }

  const baseline = Math.max(0, total - growthRows.length);
  const memberGrowth = buildMemberGrowth(
    growthRows.map((row) => row.createdAt),
    MEMBER_GROWTH_WEEKS,
  ).map((point) => ({
    weekStart: point.weekStart,
    count: baseline + point.count,
  }));

  return {
    scope: scoped ? ("zone" as const) : ("church" as const),
    members: {
      total,
      active,
      unassigned: scoped ? null : unassigned,
      newMembers,
    },
    memberGrowth,
    byZone,
    latestAttendance,
    attendanceTrend,
    visitors,
    recentAnnouncements,
    financeTrend,
  };
}
