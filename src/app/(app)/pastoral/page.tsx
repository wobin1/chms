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
import {
  PASTORAL_PRIORITY_LABELS,
  PASTORAL_STATUS_LABELS,
} from "@/features/care/labels";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";

type PastoralRow = {
  id: string;
  title: string;
  caseType: string;
  priority: keyof typeof PASTORAL_PRIORITY_LABELS;
  status: keyof typeof PASTORAL_STATUS_LABELS;
  member: {
    firstName: string;
    lastName: string;
    membershipNumber: string;
    zone: { name: string } | null;
  };
  assignedTo: { name: string } | null;
};

function memberLabel(member: {
  firstName: string;
  lastName: string;
  membershipNumber: string;
}) {
  return `${member.lastName}, ${member.firstName} (${member.membershipNumber})`;
}

export default function PastoralPage() {
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
  const canManage = me.data?.permissions.includes("pastoral:manage") ?? false;

  const cases = usePaginatedList<PastoralRow>({
    queryKey: ["pastoral"],
    url: "/api/v1/pastoral",
  });

  const columns = useMemo<ColumnDef<PastoralRow>[]>(
    () => [
      {
        id: "member",
        header: "Member",
        cell: ({ row }) => memberLabel(row.original.member),
      },
      { accessorKey: "caseType", header: "Type" },
      { accessorKey: "title", header: "Title" },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => PASTORAL_PRIORITY_LABELS[row.original.priority],
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => PASTORAL_STATUS_LABELS[row.original.status],
      },
      {
        id: "zone",
        header: "Zone",
        cell: ({ row }) => row.original.member.zone?.name ?? "—",
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View pastoral case"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/pastoral/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit pastoral case"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/pastoral/${row.original.id}/edit`)}
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
        title="Pastoral care"
        description="Pastoral cases on members of this church."
        action={
          canManage ? (
            <Link href="/pastoral/new">
              <Button>+ Add case</Button>
            </Link>
          ) : undefined
        }
      />
      <ListToolbar
        searchValue={cases.q}
        onSearchChange={cases.setQ}
        searchPlaceholder="Search member, type, or title"
        searchLabel="Search pastoral cases"
      />
      <QueryState
        isLoading={cases.isLoading}
        isError={cases.isError}
        isFetching={cases.isFetching && !cases.isLoading}
      >
        <DataTable
          columns={columns}
          data={cases.items}
          emptyTitle="No pastoral cases yet"
          emptyDescription="Open a case on a member of this church. Notes stay restricted."
          pagination={{
            total: cases.total,
            page: cases.page,
            pageSize: cases.pageSize,
            onPageChange: cases.setPage,
            onPageSizeChange: cases.setPageSize,
          }}
        />
      </QueryState>
    </div>
  );
}
