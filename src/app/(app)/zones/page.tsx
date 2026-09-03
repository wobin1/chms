"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { ListPageHeader } from "@/components/detail/layout";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { readApiError } from "@/lib/ui";

type Zone = {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  _count: { members: number };
};

export default function ZonesPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("zones:manage") ?? false;

  const zones = usePaginatedList<Zone>({
    queryKey: ["zones"],
    url: "/api/v1/zones",
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/zones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create zone"));
      }
    },
    onSuccess: () => {
      setName("");
      setError(null);
      setCreateOpen(false);
      toast("success", "Zone added.");
      void queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (err) => {
      setError(err.message);
      toast("error", err.message);
    },
  });

  function closeCreateDialog() {
    if (create.isPending) return;
    setCreateOpen(false);
    setName("");
    setError(null);
  }

  const columns = useMemo<ColumnDef<Zone>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "status", header: "Status" },
      {
        id: "members",
        header: "Members",
        cell: ({ row }) => row.original._count.members,
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View zone"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/zones/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit zone"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/zones/${row.original.id}`)}
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
        title="Zones"
        description="Geographic or pastoral groupings for members of this church."
        action={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + Add zone
            </Button>
          ) : undefined
        }
      />
      <ListToolbar
        searchValue={zones.q}
        onSearchChange={zones.setQ}
        searchPlaceholder="Search zone name"
        searchLabel="Search zones"
      />
      <QueryState
        isLoading={zones.isLoading}
        isError={zones.isError}
        isFetching={zones.isFetching && !zones.isLoading}
      >
        <DataTable
          columns={columns}
          data={zones.items}
          emptyTitle="No zones yet"
          emptyDescription="Add a zone name used by this church. Names are yours to choose."
          pagination={{
            total: zones.total,
            page: zones.page,
            pageSize: zones.pageSize,
            onPageChange: zones.setPage,
            onPageSizeChange: zones.setPageSize,
          }}
        />
      </QueryState>
      {canManage ? (
        <p className="text-sm text-text-muted">
          Need a zone leader account first?{" "}
          <Link href="/admin/users" className="text-accent">
            Create a user
          </Link>
          .
        </p>
      ) : null}
      <FormDialog
        title="Add zone"
        description="Choose a name for this zone. You can add leaders and members after creating it."
        open={createOpen}
        pending={create.isPending}
        submitLabel="Add zone"
        onCancel={closeCreateDialog}
        onSubmit={() => create.mutate()}
      >
        <div>
          <Label htmlFor="zoneName">Name</Label>
          <Input
            id="zoneName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hope"
            required
          />
          {error ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </FormDialog>
    </div>
  );
}
