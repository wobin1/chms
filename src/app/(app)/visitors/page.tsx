"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { VISITOR_STATUS_LABELS } from "@/features/services/labels";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { formatDisplayDate, readApiError } from "@/lib/ui";

type VisitorRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: keyof typeof VISITOR_STATUS_LABELS;
  firstVisitDate: string | null;
  visits: unknown[];
};

export default function VisitorsPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
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
  const canManage = me.data?.permissions.includes("visitors:manage") ?? false;

  const visitors = usePaginatedList<VisitorRow>({
    queryKey: ["visitors"],
    url: "/api/v1/visitors",
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/visitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: phone || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to add visitor"));
      }
    },
    onSuccess: () => {
      setFirstName("");
      setLastName("");
      setPhone("");
      setError(null);
      setCreateOpen(false);
      toast("success", "Visitor registered.");
      void queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
    onError: (err) => {
      setError(err.message);
      toast("error", err.message);
    },
  });

  function closeCreateDialog() {
    if (create.isPending) return;
    setCreateOpen(false);
    setFirstName("");
    setLastName("");
    setPhone("");
    setError(null);
  }

  const columns = useMemo<ColumnDef<VisitorRow>[]>(
    () => [
      { accessorKey: "lastName", header: "Last name" },
      { accessorKey: "firstName", header: "First name" },
      {
        id: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => VISITOR_STATUS_LABELS[row.original.status],
      },
      {
        id: "firstVisit",
        header: "First visit",
        cell: ({ row }) => formatDisplayDate(row.original.firstVisitDate),
      },
      {
        id: "visits",
        header: "Visits",
        cell: ({ row }) => row.original.visits.length,
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View visitor"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/visitors/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit visitor"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/visitors/${row.original.id}/edit`)}
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
        title="Visitors"
        description="Register visitors and link visits to services."
        action={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + Add visitor
            </Button>
          ) : undefined
        }
      />
      <ListToolbar
        searchValue={visitors.q}
        onSearchChange={visitors.setQ}
        searchPlaceholder="Search name or phone"
        searchLabel="Search visitors"
      />
      <QueryState
        isLoading={visitors.isLoading}
        isError={visitors.isError}
        isFetching={visitors.isFetching && !visitors.isLoading}
      >
        <DataTable
          columns={columns}
          data={visitors.items}
          emptyTitle="No visitors yet"
          emptyDescription="Register a visitor for this church, then link visits to a service."
          getRowHref={(row) => `/visitors/${row.id}`}
          pagination={{
            total: visitors.total,
            page: visitors.page,
            pageSize: visitors.pageSize,
            onPageChange: visitors.setPage,
            onPageSizeChange: visitors.setPageSize,
          }}
        />
      </QueryState>
      {canManage ? (
        <FormDialog
          title="Add visitor"
          description="Enter basic details. You can add more on the visitor profile."
          open={createOpen}
          pending={create.isPending}
          submitLabel="Add visitor"
          onCancel={closeCreateDialog}
          onSubmit={() => create.mutate()}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
