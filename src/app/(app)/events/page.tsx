"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DataTable } from "@/components/data-table";
import { ListPageHeader } from "@/components/detail/layout";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { EVENT_STATUS_LABELS } from "@/features/events/labels";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { formatDisplayDate } from "@/lib/ui";

type EventRow = {
  id: string;
  name: string;
  eventType: string;
  startDate: string;
  endDate: string;
  location: string;
  status: keyof typeof EVENT_STATUS_LABELS;
  attendance: { attendanceCount: number } | null;
};

export default function EventsPage() {
  const router = useRouter();

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

  const events = usePaginatedList<EventRow>({
    queryKey: ["events"],
    url: "/api/v1/events",
  });

  const columns = useMemo<ColumnDef<EventRow>[]>(
    () => [
      { accessorKey: "name", header: "Event" },
      { accessorKey: "eventType", header: "Type" },
      {
        id: "dates",
        header: "Dates",
        cell: ({ row }) =>
          `${formatDisplayDate(row.original.startDate)} – ${formatDisplayDate(row.original.endDate)}`,
      },
      { accessorKey: "location", header: "Location" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => EVENT_STATUS_LABELS[row.original.status],
      },
      {
        id: "attendance",
        header: "Attendance",
        cell: ({ row }) => row.original.attendance?.attendanceCount ?? "—",
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View event"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/events/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit event"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/events/${row.original.id}/edit`)}
              />
            ) : null}
          </div>
        ),
      },
    ],
    [canManage, router],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Events"
        description="Church events with dates, location, and attendance counts."
        action={
          canManage ? (
            <Link href="/events/new">
              <Button>+ Add event</Button>
            </Link>
          ) : undefined
        }
      />
      <ListToolbar
        searchValue={events.q}
        onSearchChange={events.setQ}
        searchPlaceholder="Search event, type, or location"
        searchLabel="Search events"
      />
      <QueryState
        isLoading={events.isLoading}
        isError={events.isError}
        isFetching={events.isFetching && !events.isLoading}
      >
        <DataTable
          columns={columns}
          data={events.items}
          emptyTitle="No events yet"
          emptyDescription="Add an event with dates and a location. Attendance is a count, not a member list."
          pagination={{
            total: events.total,
            page: events.page,
            pageSize: events.pageSize,
            onPageChange: events.setPage,
            onPageSizeChange: events.setPageSize,
          }}
        />
      </QueryState>
    </div>
  );
}
