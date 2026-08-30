"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { ListToolbar } from "@/components/list-toolbar";
import { Select } from "@/components/ui/select";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { readApiError } from "@/lib/ui";

type Member = {
  id: string;
  membershipNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  deletedAt: string | null;
  zone: { name: string } | null;
  membershipStatus: { name: string };
};

type Zone = { id: string; name: string };
type Status = { id: string; name: string };

type ConfirmTarget = {
  id: string;
  name: string;
  action: "deactivate" | "restore";
};

export default function MembersPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [zoneId, setZoneId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("members:manage") ?? false;
  const canExport = me.data?.permissions.includes("members:export") ?? false;
  const canFilterGroups =
    (me.data?.permissions.includes("departments:read") ?? false) ||
    (me.data?.permissions.includes("ministries:read") ?? false);

  const members = usePaginatedList<Member>({
    queryKey: ["members"],
    url: "/api/v1/members",
    extraParams: {
      zoneId: zoneId || undefined,
      statusId: statusId || undefined,
      departmentId: departmentId || undefined,
      ministryId: ministryId || undefined,
      includeDeleted: includeDeleted || undefined,
    },
  });
  const zones = useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/zones?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as Zone[] };
      return (await response.json()) as { items: Zone[] };
    },
  });
  const statuses = useQuery({
    queryKey: ["membership-statuses"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/membership-statuses?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as Status[] };
      return (await response.json()) as { items: Status[] };
    },
  });
  const departments = useQuery({
    queryKey: ["departments"],
    enabled: canFilterGroups,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/departments?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as Status[] };
      return (await response.json()) as { items: Status[] };
    },
  });
  const ministries = useQuery({
    queryKey: ["ministries"],
    enabled: canFilterGroups,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/ministries?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as Status[] };
      return (await response.json()) as { items: Status[] };
    },
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/members/${id}/deactivate`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to deactivate"));
      }
    },
    onSuccess: () => {
      toast("success", "Member deactivated.");
      setConfirmTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast("error", err.message),
  });
  const restore = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/members/${id}/restore`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to restore"));
      }
    },
    onSuccess: () => {
      toast("success", "Member restored.");
      setConfirmTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const columns = useMemo<ColumnDef<Member>[]>(
    () => [
      { accessorKey: "membershipNumber", header: "No." },
      { accessorKey: "lastName", header: "Last name" },
      { accessorKey: "firstName", header: "First name" },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        id: "zone",
        header: "Zone",
        cell: ({ row }) => row.original.zone?.name ?? "Unassigned",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => row.original.membershipStatus.name,
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View member"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/members/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit member"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/members/${row.original.id}/edit`)}
              />
            ) : null}
            {canManage && row.original.deletedAt ? (
              <Button
                variant="secondary"
                disabled={restore.isPending}
                onClick={() =>
                  setConfirmTarget({
                    id: row.original.id,
                    name: `${row.original.firstName} ${row.original.lastName}`,
                    action: "restore",
                  })
                }
              >
                Restore
              </Button>
            ) : null}
            {canManage && !row.original.deletedAt ? (
              <IconButton
                label="Deactivate member"
                icon={rowIcons.Trash2}
                tone="danger"
                disabled={deactivate.isPending}
                onClick={() =>
                  setConfirmTarget({
                    id: row.original.id,
                    name: `${row.original.firstName} ${row.original.lastName}`,
                    action: "deactivate",
                  })
                }
              />
            ) : null}
          </div>
        ),
      },
    ],
    [canManage, deactivate.isPending, restore.isPending, router],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Members</h1>
        <div className="flex flex-wrap gap-2">
          {canExport ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                void (async () => {
                  const response = await fetch("/api/v1/members/export");
                  if (!response.ok) {
                    toast(
                      "error",
                      await readApiError(response, "Unable to export members"),
                    );
                    return;
                  }
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "members.csv";
                  link.click();
                  URL.revokeObjectURL(url);
                })();
              }}
            >
              Export CSV
            </Button>
          ) : null}
          {canManage ? (
            <Link href="/members/new">
              <Button>+ Add member</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <ListToolbar
        searchValue={members.q}
        onSearchChange={members.setQ}
        searchPlaceholder="Search name or number"
        searchLabel="Search members"
        filters={
          <>
            <Select
              compact
              aria-label="Filter by zone"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
            >
              <option value="">All zones</option>
              {(zones.data?.items ?? []).map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </Select>
            <Select
              compact
              aria-label="Filter by status"
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
            >
              <option value="">All statuses</option>
              {(statuses.data?.items ?? []).map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
            {canFilterGroups ? (
              <>
                <Select
                  compact
                  aria-label="Filter by department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">All departments</option>
                  {(departments.data?.items ?? []).map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
                <Select
                  compact
                  aria-label="Filter by ministry"
                  value={ministryId}
                  onChange={(e) => setMinistryId(e.target.value)}
                >
                  <option value="">All ministries</option>
                  {(ministries.data?.items ?? []).map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </Select>
              </>
            ) : null}
            {canManage ? (
              <label className="flex items-center gap-2 text-sm text-text-muted">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                Include deactivated
              </label>
            ) : null}
          </>
        }
      />
      <QueryState
        isLoading={members.isLoading}
        isError={members.isError}
        isFetching={members.isFetching && !members.isLoading}
      >
        <DataTable
          columns={columns}
          data={members.items}
          emptyTitle="No members yet"
          emptyDescription="Add a member for this church. Membership numbers are unique per church."
          pagination={{
            total: members.total,
            page: members.page,
            pageSize: members.pageSize,
            onPageChange: members.setPage,
            onPageSizeChange: members.setPageSize,
          }}
        />
      </QueryState>
      <ConfirmDialog
        open={confirmTarget !== null}
        title={
          confirmTarget?.action === "restore"
            ? "Restore this member?"
            : "Deactivate this member?"
        }
        description={
          confirmTarget?.action === "restore"
            ? `${confirmTarget.name} will appear in the active member list again.`
            : `${confirmTarget?.name ?? "This member"} stays on file and can be restored later.`
        }
        confirmLabel={
          confirmTarget?.action === "restore" ? "Restore" : "Deactivate"
        }
        danger={confirmTarget?.action === "deactivate"}
        pending={deactivate.isPending || restore.isPending}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.action === "restore") {
            restore.mutate(confirmTarget.id);
          } else {
            deactivate.mutate(confirmTarget.id);
          }
        }}
      />
    </div>
  );
}
