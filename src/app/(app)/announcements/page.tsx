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
import { ANNOUNCEMENT_STATUS_LABELS } from "@/features/content/labels";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { formatDisplayDate } from "@/lib/ui";

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  status: keyof typeof ANNOUNCEMENT_STATUS_LABELS;
  createdBy: { name: string };
};

export default function AnnouncementsPage() {
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
  const canManage =
    me.data?.permissions.includes("announcements:manage") ?? false;

  const announcements = usePaginatedList<AnnouncementRow>({
    queryKey: ["announcements"],
    url: "/api/v1/announcements",
  });

  const columns = useMemo<ColumnDef<AnnouncementRow>[]>(
    () => [
      { accessorKey: "title", header: "Title" },
      {
        id: "dates",
        header: "Dates",
        cell: ({ row }) =>
          `${formatDisplayDate(row.original.startDate)} – ${formatDisplayDate(row.original.endDate)}`,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => ANNOUNCEMENT_STATUS_LABELS[row.original.status],
      },
      {
        id: "createdBy",
        header: "Posted by",
        cell: ({ row }) => row.original.createdBy.name,
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View announcement"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/announcements/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit announcement"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() =>
                  router.push(`/announcements/${row.original.id}/edit`)
                }
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
        title="Announcements"
        description="Church announcements with start and end dates."
        action={
          canManage ? (
            <Link href="/announcements/new">
              <Button>+ Add announcement</Button>
            </Link>
          ) : undefined
        }
      />
      <ListToolbar
        searchValue={announcements.q}
        onSearchChange={announcements.setQ}
        searchPlaceholder="Search title or content"
        searchLabel="Search announcements"
      />
      <QueryState
        isLoading={announcements.isLoading}
        isError={announcements.isError}
        isFetching={announcements.isFetching && !announcements.isLoading}
      >
        <DataTable
          columns={columns}
          data={announcements.items}
          emptyTitle="No announcements yet"
          emptyDescription="Add an announcement with a start and end date for this church."
          pagination={{
            total: announcements.total,
            page: announcements.page,
            pageSize: announcements.pageSize,
            onPageChange: announcements.setPage,
            onPageSizeChange: announcements.setPageSize,
          }}
        />
      </QueryState>
    </div>
  );
}
