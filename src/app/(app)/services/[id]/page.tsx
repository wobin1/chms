"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/back-link";
import {
  Chip,
  DetailField,
  ProfileHero,
  SectionCard,
  StatusBadge,
} from "@/components/detail/layout";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SERVICE_STATUS_LABELS } from "@/features/services/labels";
import type { PublicUser } from "@/lib/auth-types";
import { displayValue, formatDisplayDate, readApiError } from "@/lib/ui";

type NamedLookup = { id: string; name: string; sortOrder?: number };
type ServiceVisit = {
  id: string;
  visitDate: string;
  visitor: { id: string; firstName: string; lastName: string };
};
type ServiceDetail = {
  id: string;
  name: string;
  serviceDate: string;
  theme: string | null;
  scripture: string | null;
  preacher: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  status: keyof typeof SERVICE_STATUS_LABELS;
  serviceTypeId: string;
  serviceType: { id: string; name: string };
  attendance: {
    attendanceCategoryId: string;
    count: number;
    attendanceCategory: { id: string; name: string; sortOrder: number };
  }[];
  visits: ServiceVisit[];
};

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState<Record<string, string>>({});

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("services:manage") ?? false;
  const canSaveAttendance =
    me.data?.permissions.includes("attendance:manage") ?? false;

  const service = useQuery({
    queryKey: ["services", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/services/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as ServiceDetail;
    },
  });
  const categories = useQuery({
    queryKey: ["attendance-categories"],
    queryFn: async () => {
      const response = await fetch("/api/v1/attendance-categories");
      if (!response.ok) return { items: [] as NamedLookup[] };
      return (await response.json()) as { items: NamedLookup[] };
    },
  });

  useEffect(() => {
    const items = categories.data?.items ?? [];
    if (!service.data || items.length === 0) return;
    const next: Record<string, string> = {};
    for (const category of items) {
      const existing = service.data.attendance.find(
        (row) => row.attendanceCategoryId === category.id,
      );
      next[category.id] = String(existing?.count ?? 0);
    }
    setCounts(next);
  }, [categories.data, service.data]);

  const saveAttendance = useMutation({
    mutationFn: async () => {
      const items = (categories.data?.items ?? []).map((category) => {
        const raw = counts[category.id] ?? "0";
        const count = Number.parseInt(raw, 10);
        return { attendanceCategoryId: category.id, count };
      });
      const response = await fetch(`/api/v1/services/${params.id}/attendance`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save attendance"));
      }
    },
    onSuccess: () => {
      toast("success", "Attendance counts saved.");
      void queryClient.invalidateQueries({ queryKey: ["services", params.id] });
    },
    onError: (err) => toast("error", err.message),
  });

  const total = useMemo(
    () =>
      Object.values(counts).reduce((sum, value) => {
        const count = Number.parseInt(value, 10);
        return sum + (Number.isFinite(count) ? count : 0);
      }, 0),
    [counts],
  );

  const data = service.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/services">Back to services</BackLink>
      <QueryState
        variant="detail"
        isLoading={service.isLoading}
        isError={service.isError}
        isFetching={service.isFetching && !service.isLoading}
        errorLabel="This service was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={data.name}
              subtitle={data.serviceType.name}
              badges={
                <>
                  <StatusBadge
                    active={data.status !== "CANCELLED"}
                    activeLabel={SERVICE_STATUS_LABELS[data.status]}
                    inactiveLabel={SERVICE_STATUS_LABELS.CANCELLED}
                  />
                  <Chip>{formatDisplayDate(data.serviceDate)}</Chip>
                  {data.preacher ? <Chip>{data.preacher}</Chip> : null}
                </>
              }
              actions={
                canManage ? (
                  <Link href={`/services/${data.id}/edit`}>
                    <Button>Edit service</Button>
                  </Link>
                ) : undefined
              }
            />

            <SectionCard title="Details">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="Name" value={data.name} />
                <DetailField
                  label="Date"
                  value={formatDisplayDate(data.serviceDate)}
                />
                <DetailField label="Type" value={data.serviceType.name} />
                <DetailField
                  label="Status"
                  value={SERVICE_STATUS_LABELS[data.status]}
                />
                <DetailField
                  label="Preacher"
                  value={displayValue(data.preacher)}
                />
                <DetailField label="Theme" value={displayValue(data.theme)} />
                <DetailField
                  label="Scripture"
                  value={displayValue(data.scripture)}
                />
                <DetailField
                  label="Time"
                  value={
                    data.startTime || data.endTime
                      ? `${data.startTime ?? "—"} – ${data.endTime ?? "—"}`
                      : "—"
                  }
                />
              </dl>
            </SectionCard>

            {data.notes ? (
              <SectionCard title="Notes">
                <p className="text-sm leading-relaxed text-text">{data.notes}</p>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Attendance counts"
              description="Enter totals for this service. Do not record which members attended."
            >
              {(categories.data?.items ?? []).length === 0 ? (
                <p className="text-sm text-text-muted">
                  Add attendance categories on the{" "}
                  <Link href="/services" className="text-accent">
                    services
                  </Link>{" "}
                  page first.
                </p>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveAttendance.mutate();
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(categories.data?.items ?? []).map((category) => (
                      <div key={category.id}>
                        <Label htmlFor={`count-${category.id}`}>
                          {category.name}
                        </Label>
                        <Input
                          id={`count-${category.id}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={counts[category.id] ?? "0"}
                          onChange={(event) =>
                            setCounts((current) => ({
                              ...current,
                              [category.id]: event.target.value,
                            }))
                          }
                          disabled={!canSaveAttendance}
                          required
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-text">Total: {total}</p>
                  {canSaveAttendance ? (
                    <Button type="submit" loading={saveAttendance.isPending} disabled={saveAttendance.isPending}>
                      Save attendance counts
                    </Button>
                  ) : null}
                </form>
              )}
            </SectionCard>

            <SectionCard
              title="Visitors at this service"
              description="Names of registered visitors linked to this service — not a member roll-call."
            >
              {data.visits.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No visitors recorded for this service yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.visits.map((visit) => (
                    <li
                      key={visit.id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <Link
                        href={`/visitors/${visit.visitor.id}`}
                        className="font-medium text-accent"
                      >
                        {visit.visitor.lastName}, {visit.visitor.firstName}
                      </Link>
                      <span className="text-text-muted">
                        {formatDisplayDate(visit.visitDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
