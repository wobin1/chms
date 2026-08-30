"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AttendanceGroupBy } from "@/features/reports/schema";
import { Select, VISITOR_STATUS_LABELS } from "@/features/services/labels";
import type { PublicUser } from "@/lib/auth-types";
import { formatDisplayDate, formatMoney } from "@/lib/ui";

type Tab = "membership" | "attendance" | "visitors" | "events" | "finance";

type MembershipReport = {
  total: number;
  byStatus: { name: string; count: number }[];
  byZone: { name: string; count: number }[];
};

type AttendanceReport = {
  groupBy: AttendanceGroupBy;
  rows: {
    key: string;
    label: string;
    total: number;
    byCategory: { name: string; count: number }[];
  }[];
};

type VisitorReport = {
  total: number;
  byStatus: { name: string; count: number }[];
};

type EventReport = {
  eventCount: number;
  attendanceTotal: number;
  rows: {
    name: string;
    startDate: string;
    location: string;
    attendanceCount: number;
  }[];
};

type FinanceReport = {
  givingTotal: string;
  expenseTotal: string;
  net: string;
  byGivingType: { name: string; total: string }[];
  byExpenseCategory: { name: string; total: string }[];
};

const ATTENDANCE_GROUPS: { value: AttendanceGroupBy; label: string }[] = [
  { value: "sunday", label: "By Sunday" },
  { value: "month", label: "By month" },
  { value: "year", label: "By year" },
  { value: "serviceType", label: "By service type" },
];

function downloadCsv(path: string) {
  window.location.assign(path);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("membership");
  const [groupBy, setGroupBy] = useState<AttendanceGroupBy>("sunday");

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const permissions = me.data?.permissions ?? [];
  const canMembership = permissions.includes("reports:read");
  const canAttendance =
    permissions.includes("reports:read") &&
    (permissions.includes("services:read") ||
      permissions.includes("attendance:manage"));
  const canVisitors =
    permissions.includes("reports:read") && permissions.includes("visitors:read");
  const canEvents =
    permissions.includes("reports:read") && permissions.includes("events:read");
  const canFinance = permissions.includes("finance:read");
  const canExportMembers = permissions.includes("members:export");

  const tabs = useMemo(() => {
    const items: { id: Tab; label: string }[] = [];
    if (canMembership) items.push({ id: "membership", label: "Membership" });
    if (canAttendance) items.push({ id: "attendance", label: "Attendance" });
    if (canVisitors) items.push({ id: "visitors", label: "Visitors" });
    if (canEvents) items.push({ id: "events", label: "Events" });
    if (canFinance) items.push({ id: "finance", label: "Finance" });
    return items;
  }, [canAttendance, canEvents, canFinance, canMembership, canVisitors]);

  const activeTab = tabs.some((item) => item.id === tab)
    ? tab
    : (tabs[0]?.id ?? "finance");

  const membership = useQuery({
    queryKey: ["reports", "membership"],
    enabled: activeTab === "membership" && canMembership,
    queryFn: async () => {
      const response = await fetch("/api/v1/reports/membership");
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as MembershipReport;
    },
  });
  const attendance = useQuery({
    queryKey: ["reports", "attendance", groupBy],
    enabled: activeTab === "attendance" && canAttendance,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/reports/attendance?groupBy=${groupBy}`,
      );
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as AttendanceReport;
    },
  });
  const visitors = useQuery({
    queryKey: ["reports", "visitors"],
    enabled: activeTab === "visitors" && canVisitors,
    queryFn: async () => {
      const response = await fetch("/api/v1/reports/visitors");
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as VisitorReport;
    },
  });
  const events = useQuery({
    queryKey: ["reports", "events"],
    enabled: activeTab === "events" && canEvents,
    queryFn: async () => {
      const response = await fetch("/api/v1/reports/events");
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as EventReport;
    },
  });
  const finance = useQuery({
    queryKey: ["reports", "finance"],
    enabled: activeTab === "finance" && canFinance,
    queryFn: async () => {
      const response = await fetch("/api/v1/reports/finance");
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as FinanceReport;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:block">
        <div>
          <h1 className="text-2xl font-bold text-text">Reports</h1>
          <p className="mt-1 text-sm text-text-muted">
            Counts and totals for this church only. Print or export for weekly
            operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {activeTab === "membership" ? (
            <Button
              variant="secondary"
              onClick={() => downloadCsv("/api/v1/reports/membership?format=csv")}
            >
              Export CSV
            </Button>
          ) : null}
          {activeTab === "membership" && canExportMembers ? (
            <Button
              variant="secondary"
              onClick={() => downloadCsv("/api/v1/members/export")}
            >
              Export members
            </Button>
          ) : null}
          {activeTab === "attendance" ? (
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  `/api/v1/reports/attendance?groupBy=${groupBy}&format=csv`,
                )
              }
            >
              Export CSV
            </Button>
          ) : null}
          {activeTab === "visitors" ? (
            <Button
              variant="secondary"
              onClick={() => downloadCsv("/api/v1/reports/visitors?format=csv")}
            >
              Export CSV
            </Button>
          ) : null}
          {activeTab === "events" ? (
            <Button
              variant="secondary"
              onClick={() => downloadCsv("/api/v1/reports/events?format=csv")}
            >
              Export CSV
            </Button>
          ) : null}
          {activeTab === "finance" ? (
            <Button
              variant="secondary"
              onClick={() => downloadCsv("/api/v1/reports/finance?format=csv")}
            >
              Export CSV
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden" role="tablist" aria-label="Report type">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            className={
              activeTab === item.id
                ? "rounded-full bg-text px-4 py-2 text-sm font-medium text-white"
                : "rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-accent-soft"
            }
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === "membership" ? (
        <QueryState
          variant="reports"
          isLoading={membership.isLoading}
          isError={membership.isError}
          isFetching={membership.isFetching && !membership.isLoading}
        >
          {membership.data ? (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Total members:{" "}
                <span className="font-semibold tabular-nums text-text">
                  {membership.data.total}
                </span>
              </p>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold">By status</h2>
                  <DataTable
                    columns={[
                      { accessorKey: "name", header: "Status" },
                      { accessorKey: "count", header: "Members" },
                    ]}
                    data={membership.data.byStatus}
                    emptyTitle="No membership statuses"
                    emptyDescription="Statuses are set up when the church is created."
                  />
                </section>
                <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold">By zone</h2>
                  <DataTable
                    columns={[
                      { accessorKey: "name", header: "Zone" },
                      { accessorKey: "count", header: "Members" },
                    ]}
                    data={membership.data.byZone}
                    emptyTitle="No zones yet"
                    emptyDescription="Add zones, then assign members."
                  />
                </section>
              </div>
            </div>
          ) : null}
        </QueryState>
      ) : null}

      {activeTab === "attendance" ? (
        <div className="space-y-4">
          <div className="max-w-xs print:hidden">
            <Label htmlFor="groupBy">Group by</Label>
            <Select
              id="groupBy"
              value={groupBy}
              onChange={(event) =>
                setGroupBy(event.target.value as AttendanceGroupBy)
              }
            >
              {ATTENDANCE_GROUPS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <QueryState
            isLoading={attendance.isLoading}
            isError={attendance.isError}
            isFetching={attendance.isFetching && !attendance.isLoading}
          >
            <DataTable
              columns={[
                { accessorKey: "label", header: "Period" },
                { accessorKey: "total", header: "Attendance" },
              ]}
              data={attendance.data?.rows ?? []}
              emptyTitle="No attendance recorded"
              emptyDescription="Record service attendance as counts, then return here."
            />
          </QueryState>
        </div>
      ) : null}

      {activeTab === "visitors" ? (
        <QueryState
          isLoading={visitors.isLoading}
          isError={visitors.isError}
          isFetching={visitors.isFetching && !visitors.isLoading}
        >
          {visitors.data ? (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Total visitors:{" "}
                <span className="font-semibold tabular-nums text-text">
                  {visitors.data.total}
                </span>
              </p>
              <DataTable
                columns={[
                  {
                    id: "status",
                    header: "Status",
                    cell: ({ row }) =>
                      VISITOR_STATUS_LABELS[
                        row.original.name as keyof typeof VISITOR_STATUS_LABELS
                      ] ?? row.original.name,
                  },
                  { accessorKey: "count", header: "Visitors" },
                ]}
                data={visitors.data.byStatus}
                emptyTitle="No visitors yet"
                emptyDescription="Register visitors, then they will appear in this report."
              />
            </div>
          ) : null}
        </QueryState>
      ) : null}

      {activeTab === "events" ? (
        <QueryState
          isLoading={events.isLoading}
          isError={events.isError}
          isFetching={events.isFetching && !events.isLoading}
        >
          {events.data ? (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                {events.data.eventCount} events · attendance{" "}
                <span className="font-semibold tabular-nums text-text">
                  {events.data.attendanceTotal}
                </span>
              </p>
              <DataTable
                columns={[
                  { accessorKey: "name", header: "Event" },
                  {
                    id: "startDate",
                    header: "Start",
                    cell: ({ row }) =>
                      formatDisplayDate(row.original.startDate),
                  },
                  { accessorKey: "location", header: "Location" },
                  { accessorKey: "attendanceCount", header: "Attendance" },
                ]}
                data={events.data.rows}
                emptyTitle="No events yet"
                emptyDescription="Add events and record a headcount to see them here."
              />
            </div>
          ) : null}
        </QueryState>
      ) : null}

      {activeTab === "finance" ? (
        <QueryState
          isLoading={finance.isLoading}
          isError={finance.isError}
          isFetching={finance.isFetching && !finance.isLoading}
        >
          {finance.data ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <p className="text-sm text-text-muted">Giving</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatMoney(finance.data.givingTotal)}
                  </p>
                </article>
                <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <p className="text-sm text-text-muted">Expenses</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatMoney(finance.data.expenseTotal)}
                  </p>
                </article>
                <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <p className="text-sm text-text-muted">Net</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">
                    {formatMoney(finance.data.net)}
                  </p>
                </article>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold">Giving by type</h2>
                  <DataTable
                    columns={[
                      { accessorKey: "name", header: "Type" },
                      {
                        id: "total",
                        header: "Amount",
                        cell: ({ row }) => formatMoney(row.original.total),
                      },
                    ]}
                    data={finance.data.byGivingType}
                    emptyTitle="No giving recorded"
                    emptyDescription="Record giving, then totals will show here."
                  />
                </section>
                <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <h2 className="mb-3 text-lg font-semibold">
                    Expenses by category
                  </h2>
                  <DataTable
                    columns={[
                      { accessorKey: "name", header: "Category" },
                      {
                        id: "total",
                        header: "Amount",
                        cell: ({ row }) => formatMoney(row.original.total),
                      },
                    ]}
                    data={finance.data.byExpenseCategory}
                    emptyTitle="No expenses recorded"
                    emptyDescription="Record expenses, then totals will show here."
                  />
                </section>
              </div>
            </div>
          ) : null}
        </QueryState>
      ) : null}
    </div>
  );
}
