"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type ChurchCount = { total: number };

async function fetchChurchCount(status?: string) {
  const params = new URLSearchParams({ page: "1", pageSize: "1" });
  if (status) params.set("status", status);
  const response = await fetch(`/api/v1/churches?${params}`);
  if (!response.ok) throw new Error("failed");
  const body = (await response.json()) as ChurchCount;
  return body.total;
}

export default function PlatformDashboardPage() {
  const total = useQuery({
    queryKey: ["churches", "count", "all"],
    queryFn: () => fetchChurchCount(),
  });
  const active = useQuery({
    queryKey: ["churches", "count", "active"],
    queryFn: () => fetchChurchCount("ACTIVE"),
  });
  const suspended = useQuery({
    queryKey: ["churches", "count", "suspended"],
    queryFn: () => fetchChurchCount("SUSPENDED"),
  });

  const totalCount = total.data ?? 0;
  const activeCount = active.data ?? 0;
  const suspendedCount = suspended.data ?? 0;
  const loading = total.isLoading || active.isLoading || suspended.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          Church counts only. Member records stay inside each church.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Total churches", value: loading ? "—" : totalCount },
          { label: "Active churches", value: loading ? "—" : activeCount },
          { label: "Suspended churches", value: loading ? "—" : suspendedCount },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <p className="text-sm text-text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-text">
              {card.value}
            </p>
          </article>
        ))}
      </div>
      <section className="rounded-xl border border-border bg-surface p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-text">Churches</h2>
        {totalCount === 0 && !loading ? (
          <>
            <p className="mt-3 text-text">No churches yet</p>
            <p className="mt-1 text-sm text-text-muted">
              Create a church to onboard the first congregation. Church data
              stays isolated per tenant.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-text-muted">
            {loading
              ? "Loading church counts…"
              : `${totalCount} church${totalCount === 1 ? "" : "es"} on this platform.`}
          </p>
        )}
        <Link href="/platform/churches" className="mt-4 inline-block text-sm text-accent">
          Manage churches
        </Link>
      </section>
    </div>
  );
}
