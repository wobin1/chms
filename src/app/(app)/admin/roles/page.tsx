"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { BackLink } from "@/components/back-link";
import { DataTable } from "@/components/data-table";
import { QueryState } from "@/components/query-state";
import { IconButton, rowIcons } from "@/components/ui/icon-button";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  _count: { userRoles: number };
};

export default function RolesPage() {
  const router = useRouter();
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await fetch("/api/v1/roles");
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as { items: RoleRow[] };
    },
  });

  const columns = useMemo<ColumnDef<RoleRow>[]>(
    () => [
      { accessorKey: "name", header: "Role" },
      {
        id: "description",
        header: "Description",
        cell: ({ row }) => row.original.description ?? "—",
      },
      {
        id: "users",
        header: "Users",
        cell: ({ row }) => row.original._count.userRoles,
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View role"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/admin/roles/${row.original.id}`)}
            />
            <IconButton
              label="Edit role"
              icon={rowIcons.Pencil}
              tone="edit"
              onClick={() => router.push(`/admin/roles/${row.original.id}`)}
            />
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="space-y-6">
      <BackLink href="/admin/users">Back to users</BackLink>
      <h1 className="text-2xl font-bold text-text">Roles</h1>
      <p className="text-sm text-text-muted">
        Permissions apply only inside this church. Platform permissions cannot
        be granted here.
      </p>
      <QueryState
        isLoading={roles.isLoading}
        isError={roles.isError}
        isFetching={roles.isFetching && !roles.isLoading}
      >
        <DataTable
          columns={columns}
          data={roles.data?.items ?? []}
          emptyTitle="No roles"
          emptyDescription="Roles are created with the church."
        />
      </QueryState>
    </div>
  );
}
