import "server-only";
import { Prisma } from "@prisma/client";
import type { AttendanceGroupBy } from "@/features/reports/schema";
import type { AuthContext } from "./auth-types";
import { prisma } from "./db";
import { requirePermission } from "./permissions";
import { requireChurch } from "./tenant";
import { getVisibleMemberFilter, isZoneScoped } from "./zone-scope";
import { listAssignedZoneIds } from "./zone-service";

export type NamedCount = { name: string; count: number };

export type MembershipReport = {
  total: number;
  byStatus: NamedCount[];
  byZone: NamedCount[];
};

export type AttendanceReport = {
  groupBy: AttendanceGroupBy;
  rows: {
    key: string;
    label: string;
    total: number;
    byCategory: NamedCount[];
  }[];
};

export type VisitorReport = {
  total: number;
  byStatus: NamedCount[];
};

export type EventReport = {
  eventCount: number;
  attendanceTotal: number;
  rows: { name: string; startDate: Date; location: string; attendanceCount: number }[];
};

export type FinanceReport = {
  givingTotal: string;
  expenseTotal: string;
  net: string;
  byGivingType: { name: string; total: string }[];
  byExpenseCategory: { name: string; total: string }[];
};

function csvCell(value: string | number | null | undefined) {
  const safe = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(safe)) {
    return `"${safe.replaceAll('"', '""')}"`;
  }
  return safe;
}

function toCsv(headers: string[], rows: (string | number)[][]) {
  return [headers, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n")
    .concat("\n");
}

function moneyString(value: Prisma.Decimal | string | number) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toFixed(2);
  return value.toFixed(2);
}

function addMoney(left: string, right: string) {
  return (Number(left) + Number(right)).toFixed(2);
}

export function membershipReportToCsv(report: MembershipReport) {
  return toCsv(
    ["Section", "Name", "Count"],
    [
      ["Total", "Members", report.total],
      ...report.byStatus.map((row) => ["Status", row.name, row.count]),
      ...report.byZone.map((row) => ["Zone", row.name, row.count]),
    ],
  );
}

export function attendanceReportToCsv(report: AttendanceReport) {
  return toCsv(
    ["Period", "Total"],
    report.rows.map((row) => [row.label, row.total]),
  );
}

export function visitorReportToCsv(report: VisitorReport) {
  return toCsv(
    ["Status", "Count"],
    [
      ["Total", report.total],
      ...report.byStatus.map((row) => [row.name, row.count]),
    ],
  );
}

export function eventReportToCsv(report: EventReport) {
  return toCsv(
    ["Event", "Start", "Location", "Attendance"],
    [
      ["Total events", report.eventCount, "", report.attendanceTotal],
      ...report.rows.map((row) => [
        row.name,
        row.startDate.toISOString().slice(0, 10),
        row.location,
        row.attendanceCount,
      ]),
    ],
  );
}

export function financeReportToCsv(report: FinanceReport) {
  return toCsv(
    ["Section", "Name", "Amount"],
    [
      ["Total", "Giving", report.givingTotal],
      ["Total", "Expenses", report.expenseTotal],
      ["Total", "Net", report.net],
      ...report.byGivingType.map((row) => ["Giving type", row.name, row.total]),
      ...report.byExpenseCategory.map((row) => [
        "Expense category",
        row.name,
        row.total,
      ]),
    ],
  );
}

export async function getMembershipReport(session: AuthContext) {
  requirePermission(session, "reports:read");
  const churchId = requireChurch(session);
  const assignedZoneIds = await listAssignedZoneIds(session.userId, churchId);
  const memberWhere = getVisibleMemberFilter({
    churchId,
    permissions: session.permissions,
    assignedZoneIds,
  });
  const scoped = isZoneScoped(session);

  const [total, statusGroups, zoneGroups, statuses, zones] = await Promise.all([
    prisma.member.count({ where: memberWhere }),
    prisma.member.groupBy({
      by: ["membershipStatusId"],
      where: memberWhere,
      _count: { _all: true },
    }),
    prisma.member.groupBy({
      by: ["zoneId"],
      where: memberWhere,
      _count: { _all: true },
    }),
    prisma.membershipStatus.findMany({
      where: { churchId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.zone.findMany({
      where: scoped
        ? { churchId, id: { in: assignedZoneIds } }
        : { churchId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const countByStatus = new Map(
    statusGroups.map((row) => [row.membershipStatusId, row._count._all]),
  );
  const countByZone = new Map(
    zoneGroups.map((row) => [row.zoneId, row._count._all]),
  );
  const unassigned = countByZone.get(null) ?? 0;

  return {
    total,
    byStatus: statuses.map((status) => ({
      name: status.name,
      count: countByStatus.get(status.id) ?? 0,
    })),
    byZone: [
      ...zones.map((zone) => ({
        name: zone.name,
        count: countByZone.get(zone.id) ?? 0,
      })),
      ...(unassigned > 0 || !scoped
        ? [{ name: "Unassigned", count: unassigned }]
        : []),
    ],
  } satisfies MembershipReport;
}

function attendanceBucket(
  groupBy: AttendanceGroupBy,
  serviceDate: Date,
  serviceTypeName: string,
) {
  const iso = serviceDate.toISOString().slice(0, 10);
  if (groupBy === "month") {
    return { key: iso.slice(0, 7), label: iso.slice(0, 7) };
  }
  if (groupBy === "year") {
    return { key: iso.slice(0, 4), label: iso.slice(0, 4) };
  }
  if (groupBy === "serviceType") {
    return { key: serviceTypeName, label: serviceTypeName };
  }
  return { key: iso, label: iso };
}

export async function getAttendanceReport(
  session: AuthContext,
  groupBy: AttendanceGroupBy = "sunday",
) {
  requirePermission(session, "reports:read");
  if (
    !session.permissions.includes("services:read") &&
    !session.permissions.includes("attendance:manage")
  ) {
    requirePermission(session, "services:read");
  }
  const churchId = requireChurch(session);
  const services = await prisma.service.findMany({
    where: { churchId },
    orderBy: { serviceDate: "asc" },
    select: {
      serviceDate: true,
      serviceType: { select: { name: true } },
      attendance: {
        select: {
          count: true,
          attendanceCategory: { select: { name: true } },
        },
      },
    },
  });

  const buckets = new Map<
    string,
    { label: string; total: number; byCategory: Map<string, number> }
  >();
  for (const service of services) {
    const { key, label } = attendanceBucket(
      groupBy,
      service.serviceDate,
      service.serviceType.name,
    );
    const bucket = buckets.get(key) ?? {
      label,
      total: 0,
      byCategory: new Map<string, number>(),
    };
    for (const row of service.attendance) {
      bucket.total += row.count;
      const category = row.attendanceCategory.name;
      bucket.byCategory.set(
        category,
        (bucket.byCategory.get(category) ?? 0) + row.count,
      );
    }
    buckets.set(key, bucket);
  }

  return {
    groupBy,
    rows: [...buckets.entries()].map(([key, bucket]) => ({
      key,
      label: bucket.label,
      total: bucket.total,
      byCategory: [...bucket.byCategory.entries()].map(([name, count]) => ({
        name,
        count,
      })),
    })),
  } satisfies AttendanceReport;
}

export async function getVisitorReport(session: AuthContext) {
  requirePermission(session, "reports:read");
  requirePermission(session, "visitors:read");
  const churchId = requireChurch(session);
  const [total, statusGroups] = await Promise.all([
    prisma.visitor.count({ where: { churchId } }),
    prisma.visitor.groupBy({
      by: ["status"],
      where: { churchId },
      _count: { _all: true },
    }),
  ]);
  return {
    total,
    byStatus: statusGroups.map((row) => ({
      name: row.status,
      count: row._count._all,
    })),
  } satisfies VisitorReport;
}

export async function getEventReport(session: AuthContext) {
  requirePermission(session, "reports:read");
  requirePermission(session, "events:read");
  const churchId = requireChurch(session);
  const events = await prisma.event.findMany({
    where: { churchId },
    orderBy: { startDate: "desc" },
    select: {
      name: true,
      startDate: true,
      location: true,
      attendance: { select: { attendanceCount: true } },
    },
  });
  const rows = events.map((event) => ({
    name: event.name,
    startDate: event.startDate,
    location: event.location,
    attendanceCount: event.attendance?.attendanceCount ?? 0,
  }));
  return {
    eventCount: rows.length,
    attendanceTotal: rows.reduce((sum, row) => sum + row.attendanceCount, 0),
    rows,
  } satisfies EventReport;
}

export async function getFinanceReport(session: AuthContext) {
  requirePermission(session, "finance:read");
  const churchId = requireChurch(session);
  const [giving, expenses] = await Promise.all([
    prisma.giving.findMany({
      where: { churchId },
      select: {
        amount: true,
        givingType: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { churchId },
      select: {
        amount: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const byGivingType = new Map<string, string>();
  let givingTotal = "0.00";
  for (const row of giving) {
    const amount = moneyString(row.amount);
    givingTotal = addMoney(givingTotal, amount);
    byGivingType.set(
      row.givingType.name,
      addMoney(byGivingType.get(row.givingType.name) ?? "0.00", amount),
    );
  }

  const byExpenseCategory = new Map<string, string>();
  let expenseTotal = "0.00";
  for (const row of expenses) {
    const amount = moneyString(row.amount);
    expenseTotal = addMoney(expenseTotal, amount);
    byExpenseCategory.set(
      row.category.name,
      addMoney(byExpenseCategory.get(row.category.name) ?? "0.00", amount),
    );
  }

  return {
    givingTotal,
    expenseTotal,
    net: (Number(givingTotal) - Number(expenseTotal)).toFixed(2),
    byGivingType: [...byGivingType.entries()].map(([name, total]) => ({
      name,
      total,
    })),
    byExpenseCategory: [...byExpenseCategory.entries()].map(([name, total]) => ({
      name,
      total,
    })),
  } satisfies FinanceReport;
}
