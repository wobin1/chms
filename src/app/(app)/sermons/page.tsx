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
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { formatDisplayDate } from "@/lib/ui";

type SermonRow = {
  id: string;
  title: string;
  preacher: string;
  scripture: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  service: { id: string; name: string; serviceDate: string };
};

export default function SermonsPage() {
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
  const canManage = me.data?.permissions.includes("sermons:manage") ?? false;

  const sermons = usePaginatedList<SermonRow>({
    queryKey: ["sermons"],
    url: "/api/v1/sermons",
  });

  const columns = useMemo<ColumnDef<SermonRow>[]>(
    () => [
      { accessorKey: "title", header: "Title" },
      { accessorKey: "preacher", header: "Preacher" },
      {
        id: "service",
        header: "Service",
        cell: ({ row }) =>
          `${row.original.service.name} · ${formatDisplayDate(row.original.service.serviceDate)}`,
      },
      {
        id: "media",
        header: "Media",
        cell: ({ row }) => {
          const parts = [
            row.original.audioUrl ? "Audio" : null,
            row.original.videoUrl ? "Video" : null,
            row.original.documentUrl ? "Document" : null,
          ].filter(Boolean);
          return parts.length ? parts.join(", ") : "—";
        },
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View sermon"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/sermons/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit sermon"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/sermons/${row.original.id}/edit`)}
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
        title="Sermons"
        description="Sermons linked to services with optional media."
        action={
          canManage ? (
            <Link href="/sermons/new">
              <Button>+ Add sermon</Button>
            </Link>
          ) : undefined
        }
      />
      <ListToolbar
        searchValue={sermons.q}
        onSearchChange={sermons.setQ}
        searchPlaceholder="Search title, preacher, or service"
        searchLabel="Search sermons"
      />
      <QueryState
        isLoading={sermons.isLoading}
        isError={sermons.isError}
        isFetching={sermons.isFetching && !sermons.isLoading}
      >
        <DataTable
          columns={columns}
          data={sermons.items}
          emptyTitle="No sermons yet"
          emptyDescription="Add a sermon on a service of this church. Media links are optional."
          pagination={{
            total: sermons.total,
            page: sermons.page,
            pageSize: sermons.pageSize,
            onPageChange: sermons.setPage,
            onPageSizeChange: sermons.setPageSize,
          }}
        />
      </QueryState>
    </div>
  );
}
