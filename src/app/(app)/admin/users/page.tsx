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

type UserRow = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  member: {
    id: string;
    firstName: string;
    lastName: string;
    membershipNumber: string;
  } | null;
  userRoles: { role: { name: string } }[];
};

export default function UsersPage() {
  const router = useRouter();

  const users = usePaginatedList<UserRow>({
    queryKey: ["users"],
    url: "/api/v1/users",
  });

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "email", header: "Email" },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) =>
          row.original.userRoles.map((item) => item.role.name).join(", ") || "—",
      },
      { accessorKey: "status", header: "Status" },
      {
        id: "member",
        header: "Member",
        cell: ({ row }) =>
          row.original.member
            ? `${row.original.member.lastName}, ${row.original.member.firstName}`
            : "—",
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View user"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/admin/users/${row.original.id}`)}
            />
            <IconButton
              label="Edit user"
              icon={rowIcons.Pencil}
              tone="edit"
              onClick={() => router.push(`/admin/users/${row.original.id}/edit`)}
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
        title="Users"
        description="Church staff accounts and role assignments."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/roles">
              <Button variant="secondary">Roles and permissions</Button>
            </Link>
            <Link href="/admin/users/new">
              <Button>+ Add user</Button>
            </Link>
          </div>
        }
      />
      <ListToolbar
        searchValue={users.q}
        onSearchChange={users.setQ}
        searchPlaceholder="Search name or email"
        searchLabel="Search users"
      />
      <QueryState
        isLoading={users.isLoading}
        isError={users.isError}
        isFetching={users.isFetching && !users.isLoading}
      >
        <DataTable
          columns={columns}
          data={users.items}
          emptyTitle="No users yet"
          emptyDescription="Add a user for this church and assign a role."
          getRowHref={(row) => `/admin/users/${row.id}`}
          pagination={{
            total: users.total,
            page: users.page,
            pageSize: users.pageSize,
            onPageChange: users.setPage,
            onPageSizeChange: users.setPageSize,
          }}
        />
      </QueryState>
    </div>
  );
}
