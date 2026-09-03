"use client";

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
import { formatDisplayDate } from "@/lib/ui";

type Guardian = {
  relationship: string;
  member: { firstName: string; lastName: string };
};

type ChildRow = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  family: { id: string; name: string };
  guardians: Guardian[];
};

export default function ChildrenPage() {
  const router = useRouter();

  const children = usePaginatedList<ChildRow>({
    queryKey: ["children"],
    url: "/api/v1/children",
  });

  const columns = useMemo<ColumnDef<ChildRow>[]>(
    () => [
      { accessorKey: "lastName", header: "Last name" },
      { accessorKey: "firstName", header: "First name" },
      {
        id: "family",
        header: "Family",
        cell: ({ row }) => row.original.family.name,
      },
      {
        id: "dob",
        header: "Date of birth",
        cell: ({ row }) => formatDisplayDate(row.original.dateOfBirth),
      },
      {
        id: "guardians",
        header: "Guardians",
        cell: ({ row }) =>
          row.original.guardians.length
            ? row.original.guardians
                .map(
                  (guardian) =>
                    `${guardian.member.lastName}, ${guardian.member.firstName} (${guardian.relationship})`,
                )
                .join("; ")
            : "—",
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View child"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/children/${row.original.id}`)}
            />
            <IconButton
              label="Edit child"
              icon={rowIcons.Pencil}
              tone="edit"
              onClick={() => router.push(`/children/${row.original.id}/edit`)}
            />
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Children"
        description="Children registered on families of this church."
        action={
          <Link href="/children/new">
            <Button>+ Add child</Button>
          </Link>
        }
      />
      <ListToolbar
        searchValue={children.q}
        onSearchChange={children.setQ}
        searchPlaceholder="Search child or family"
        searchLabel="Search children"
      />
      <QueryState
        isLoading={children.isLoading}
        isError={children.isError}
        isFetching={children.isFetching && !children.isLoading}
      >
        <DataTable
          columns={columns}
          data={children.items}
          emptyTitle="No children yet"
          emptyDescription="Register a child on a family of this church. More than one guardian can be set."
          getRowHref={(row) => `/children/${row.id}`}
          pagination={{
            total: children.total,
            page: children.page,
            pageSize: children.pageSize,
            onPageChange: children.setPage,
            onPageSizeChange: children.setPageSize,
          }}
        />
      </QueryState>
    </div>
  );
}
