"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { EVENT_STATUS_LABELS } from "@/features/events/labels";
import type { PublicUser } from "@/lib/auth-types";
import { displayValue, formatDisplayDate, readApiError } from "@/lib/ui";

type ChurchEvent = {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string;
  location: string;
  status: keyof typeof EVENT_STATUS_LABELS;
  attendance: { attendanceCount: number } | null;
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [count, setCount] = useState("0");

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("events:manage") ?? false;

  const event = useQuery({
    queryKey: ["events", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/events/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as ChurchEvent;
    },
  });

  useEffect(() => {
    if (!event.data) return;
    setCount(String(event.data.attendance?.attendanceCount ?? 0));
  }, [event.data]);

  const saveAttendance = useMutation({
    mutationFn: async () => {
      const attendanceCount = Number(count);
      const response = await fetch(`/api/v1/events/${params.id}/attendance`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attendanceCount }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to save attendance count"),
        );
      }
    },
    onSuccess: () => {
      toast("success", "Attendance count saved.");
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const data = event.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/events">Back to events</BackLink>
      <QueryState
        variant="detail"
        isLoading={event.isLoading}
        isError={event.isError}
        isFetching={event.isFetching && !event.isLoading}
        errorLabel="This event was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={data.name}
              subtitle={data.eventType}
              badges={
                <>
                  <StatusBadge
                    active={data.status !== "CANCELLED"}
                    activeLabel={EVENT_STATUS_LABELS[data.status]}
                    inactiveLabel={EVENT_STATUS_LABELS.CANCELLED}
                  />
                  <Chip>{data.location}</Chip>
                  <Chip>
                    {formatDisplayDate(data.startDate)} –{" "}
                    {formatDisplayDate(data.endDate)}
                  </Chip>
                </>
              }
              actions={
                canManage ? (
                  <Link href={`/events/${data.id}/edit`}>
                    <Button>Edit event</Button>
                  </Link>
                ) : undefined
              }
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Details">
                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailField label="Event name" value={data.name} />
                  <DetailField label="Type" value={data.eventType} />
                  <DetailField label="Location" value={data.location} />
                  <DetailField
                    label="Status"
                    value={EVENT_STATUS_LABELS[data.status]}
                  />
                  <DetailField
                    label="Start date"
                    value={formatDisplayDate(data.startDate)}
                  />
                  <DetailField
                    label="End date"
                    value={formatDisplayDate(data.endDate)}
                  />
                </dl>
              </SectionCard>

              <SectionCard
                title="Attendance"
                description="Totals only — not a member roll-call."
              >
                <form
                  className="flex flex-wrap items-end gap-3"
                  onSubmit={(formEvent) => {
                    formEvent.preventDefault();
                    saveAttendance.mutate();
                  }}
                >
                  <div className="min-w-32 flex-1">
                    <Label htmlFor="attendanceCount">Count</Label>
                    <Input
                      id="attendanceCount"
                      type="number"
                      min={0}
                      step={1}
                      value={count}
                      onChange={(changeEvent) => setCount(changeEvent.target.value)}
                      readOnly={!canManage}
                    />
                  </div>
                  {canManage ? (
                    <Button type="submit" loading={saveAttendance.isPending} disabled={saveAttendance.isPending}>
                      Save count
                    </Button>
                  ) : null}
                </form>
              </SectionCard>
            </div>

            <SectionCard title="Description">
              {data.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {data.description}
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-text-muted">
                  No description added.
                </p>
              )}
            </SectionCard>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
