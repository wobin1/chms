"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
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
import { readApiError } from "@/lib/ui";

type Family = {
  id: string;
  name: string;
  address: string | null;
  _count: { members: number; children: number };
};

export default function FamiliesPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const families = usePaginatedList<Family>({
    queryKey: ["families"],
    url: "/api/v1/families",
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/families", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create family"));
      }
    },
    onSuccess: () => {
      setName("");
      setError(null);
      setCreateOpen(false);
      toast("success", "Family added.");
      void queryClient.invalidateQueries({ queryKey: ["families"] });
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

  const columns = useMemo<ColumnDef<Family>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        id: "address",
        header: "Address",
        cell: ({ row }) => row.original.address ?? "—",
      },
      {
        id: "members",
        header: "Members",
        cell: ({ row }) => row.original._count.members,
      },
      {
        id: "children",
        header: "Children",
        cell: ({ row }) => row.original._count.children,
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View family"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/families/${row.original.id}`)}
            />
            <IconButton
              label="Edit family"
              icon={rowIcons.Pencil}
              tone="edit"
              onClick={() => router.push(`/families/${row.original.id}`)}
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
        title="Families"
        description="Household groupings for members of this church."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            + Add family
          </Button>
        }
      />
      <ListToolbar
        searchValue={families.q}
        onSearchChange={families.setQ}
        searchPlaceholder="Search family name or address"
        searchLabel="Search families"
      />
      <QueryState
        isLoading={families.isLoading}
        isError={families.isError}
        isFetching={families.isFetching && !families.isLoading}
      >
        <DataTable
          columns={columns}
          data={families.items}
          emptyTitle="No families yet"
          emptyDescription="Add a family, then assign members of this church only."
          pagination={{
            total: families.total,
            page: families.page,
            pageSize: families.pageSize,
            onPageChange: families.setPage,
            onPageSizeChange: families.setPageSize,
          }}
        />
      </QueryState>
      <FormDialog
        title="Add family"
        description="Choose a household name. You can assign members after creating it."
        open={createOpen}
        pending={create.isPending}
        submitLabel="Add family"
        onCancel={closeCreateDialog}
        onSubmit={() => create.mutate()}
      >
        <div>
          <Label htmlFor="familyName">Name</Label>
          <Input
            id="familyName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adewale"
            required
            autoFocus
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
