"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  Adults: "var(--accent)",
  Children: "var(--accent-muted)",
  Visitors: "var(--warning)",
  Workers: "var(--text-muted)",
};

function categoryColor(name: string, index: number) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name]!;
  const fallback = [
    "var(--accent)",
    "var(--accent-muted)",
    "var(--warning)",
    "var(--text-muted)",
  ];
  return fallback[index % fallback.length]!;
}

type AttendancePoint = {
  serviceId: string;
  name: string;
  serviceDate: string;
  total: number;
  categories: { name: string; count: number }[];
};

export function AttendanceTrendChart({
  points,
}: {
  points: AttendancePoint[];
}) {
  const categoryNames = Array.from(
    new Set(points.flatMap((point) => point.categories.map((c) => c.name))),
  );
  const data = points.map((point) => {
    const row: Record<string, string | number> = {
      label: new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(point.serviceDate)),
      total: point.total,
    };
    for (const category of point.categories) {
      row[category.name] = category.count;
    }
    for (const name of categoryNames) {
      if (row[name] === undefined) row[name] = 0;
    }
    return row;
  });

  return (
    <div className="mt-4 h-72 w-full" role="img" aria-label="Attendance by service">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
          />
          {categoryNames.map((name, index) => (
            <Bar
              key={name}
              dataKey={name}
              stackId="attendance"
              fill={categoryColor(name, index)}
              radius={
                index === categoryNames.length - 1
                  ? [4, 4, 0, 0]
                  : [0, 0, 0, 0]
              }
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MembersByZoneChart({
  zones,
}: {
  zones: { zoneId: string; name: string; members: number; newMembers: number }[];
}) {
  const data = zones.map((zone) => ({
    name: zone.name,
    members: zone.members,
    newMembers: zone.newMembers,
  }));

  return (
    <div className="mt-4 h-64 w-full" role="img" aria-label="Members by zone">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fill: "var(--text)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
            }}
          />
          <Bar
            dataKey="members"
            name="Members"
            fill="var(--accent)"
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FinanceTrendChart({
  points,
}: {
  points: { weekStart: string; giving: number; expenses: number }[];
}) {
  const data = points.map((point) => ({
    label: new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(point.weekStart)),
    Giving: point.giving,
    Expenses: point.expenses,
  }));

  return (
    <div
      className="mt-4 h-72 w-full"
      role="img"
      aria-label="Giving and expenses by week"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
          <Bar
            dataKey="Giving"
            fill="var(--accent)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="Expenses"
            fill="var(--warning)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
