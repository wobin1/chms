"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { QueryState } from "@/components/query-state";
import {
  AttendanceTrendChart,
  FinanceTrendChart,
  MembersByZoneChart,
} from "@/components/dashboard/charts";
import { formatDisplayDate, formatMoney } from "@/lib/ui";

type Dashboard = {
  scope: "church" | "zone";
  members: {
    total: number;
    active: number;
    unassigned: number | null;
    newMembers: number;
  };
  memberGrowth: { weekStart: string; count: number }[];
  byZone: {
    zoneId: string;
    name: string;
    members: number;
    newMembers: number;
  }[];
  latestAttendance: {
    serviceId: string;
    name: string;
    serviceDate: string;
    total: number;
    categories: { name: string; count: number }[];
  } | null;
  attendanceTrend: {
    serviceId: string;
    name: string;
    serviceDate: string;
    total: number;
    categories: { name: string; count: number }[];
  }[] | null;
  visitors: { total: number } | null;
  recentAnnouncements: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
  }[] | null;
  financeTrend: {
    weekStart: string;
    giving: number;
    expenses: number;
  }[] | null;
};

function KpiCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-text-muted">{label}</p>
        {href ? (
          <Link href={href} className="text-xs font-medium text-accent">
            See details
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-text">{value}</p>
    </article>
  );
}

export default function ChurchDashboardPage() {
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/v1/dashboard");
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as Dashboard;
    },
  });

  const data = dashboard.data;
  const financeTotals = data?.financeTrend
    ? {
        giving: data.financeTrend.reduce((sum, row) => sum + row.giving, 0),
        expenses: data.financeTrend.reduce((sum, row) => sum + row.expenses, 0),
      }
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          {data?.scope === "zone"
            ? "Numbers for your assigned zone only."
            : "Overview for this church."}
        </p>
      </div>
      <QueryState
        variant="dashboard"
        isLoading={dashboard.isLoading}
        isError={dashboard.isError}
        isFetching={dashboard.isFetching && !dashboard.isLoading}
      >
        {data ? (
          <div className="space-y-8">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total members"
                value={data.members.total}
                href="/members"
              />
              <KpiCard
                label="Active members"
                value={data.members.active}
                href="/members"
              />
              <KpiCard
                label="New members (30 days)"
                value={data.members.newMembers}
              />
              {data.visitors ? (
                <KpiCard
                  label="Visitors"
                  value={data.visitors.total}
                  href="/visitors"
                />
              ) : data.members.unassigned !== null ? (
                <KpiCard
                  label="Unassigned"
                  value={data.members.unassigned}
                  href="/members"
                />
              ) : (
                <KpiCard
                  label="Latest attendance"
                  value={data.latestAttendance?.total ?? 0}
                  href={
                    data.latestAttendance
                      ? `/services/${data.latestAttendance.serviceId}`
                      : undefined
                  }
                />
              )}
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm xl:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text">
                      Attendance trend
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Counts by category for recent services — not a roll-call.
                    </p>
                  </div>
                  <Link href="/services" className="text-sm font-medium text-accent">
                    See details
                  </Link>
                </div>
                {data.attendanceTrend && data.attendanceTrend.length > 0 ? (
                  <AttendanceTrendChart points={data.attendanceTrend} />
                ) : (
                  <p className="mt-4 text-sm text-text-muted">
                    No attendance counts recorded yet, or this is outside your
                    role.
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-text">
                    Latest attendance
                  </h2>
                  {data.latestAttendance ? (
                    <Link
                      href={`/services/${data.latestAttendance.serviceId}`}
                      className="text-sm font-medium text-accent"
                    >
                      Open service
                    </Link>
                  ) : null}
                </div>
                {data.latestAttendance ? (
                  <ul className="mt-4 divide-y divide-border">
                    <li className="py-3 first:pt-0">
                      <p className="text-sm font-medium text-text">
                        {data.latestAttendance.name}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {formatDisplayDate(data.latestAttendance.serviceDate)} ·{" "}
                        {data.latestAttendance.total} total
                      </p>
                    </li>
                    {data.latestAttendance.categories.map((category) => (
                      <li
                        key={category.name}
                        className="flex items-baseline justify-between gap-3 py-3 last:pb-0"
                      >
                        <p className="text-sm font-medium text-text">
                          {category.name}
                        </p>
                        <p className="text-sm tabular-nums text-text-muted">
                          {category.count}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-text-muted">
                    No attendance counts recorded yet, or this is outside your
                    role.
                  </p>
                )}
              </section>
            </div>

            {data.financeTrend ? (
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-text">
                      Giving vs expenses
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      Weekly totals for the last eight weeks.
                    </p>
                    {financeTotals ? (
                      <p className="mt-2 text-sm text-text-muted">
                        Period giving{" "}
                        <span className="font-medium tabular-nums text-text">
                          {formatMoney(financeTotals.giving)}
                        </span>
                        {" · "}
                        expenses{" "}
                        <span className="font-medium tabular-nums text-text">
                          {formatMoney(financeTotals.expenses)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <Link href="/giving" className="text-sm font-medium text-accent">
                    See details
                  </Link>
                </div>
                {data.financeTrend.some(
                  (row) => row.giving > 0 || row.expenses > 0,
                ) ? (
                  <FinanceTrendChart points={data.financeTrend} />
                ) : (
                  <p className="mt-4 text-sm text-text-muted">
                    No giving or expenses recorded in this period yet. Add them
                    under Giving.
                  </p>
                )}
              </section>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-3">
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-text">Notices</h2>
                  {data.recentAnnouncements ? (
                    <Link
                      href="/announcements"
                      className="text-sm font-medium text-accent"
                    >
                      See details
                    </Link>
                  ) : null}
                </div>
                {data.recentAnnouncements &&
                data.recentAnnouncements.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border">
                    {data.recentAnnouncements.map((item) => (
                      <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                        <p className="text-sm font-medium text-text">{item.title}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {formatDisplayDate(item.startDate)}
                          {item.endDate !== item.startDate
                            ? ` – ${formatDisplayDate(item.endDate)}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-text-muted">
                    {data.recentAnnouncements === null
                      ? "Announcements are outside your role."
                      : "No published announcements yet. Add one from Announcements."}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm xl:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-text">
                    Members by zone
                  </h2>
                  <Link href="/zones" className="text-sm font-medium text-accent">
                    See details
                  </Link>
                </div>
                {data.byZone.length === 0 ? (
                  <p className="mt-4 text-sm text-text-muted">
                    No zones to compare yet. Create zones, then assign members.
                  </p>
                ) : (
                  <MembersByZoneChart zones={data.byZone} />
                )}
              </section>
            </div>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
