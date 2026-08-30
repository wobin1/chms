"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { Chip, ListPageHeader, SectionCard } from "@/components/detail/layout";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { formatDisplayDate, formatMoney, readApiError } from "@/lib/ui";

type GivingType = { id: string; name: string; status: "ACTIVE" | "INACTIVE" };
type GivingRow = {
  id: string;
  amount: string;
  paymentMethod: string;
  createdAt: string;
  givingType: { name: string };
  member: { firstName: string; lastName: string } | null;
  service: { name: string } | null;
};

export default function GivingPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("finance:manage") ?? false;

  const types = useQuery({
    queryKey: ["giving-types"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/giving-types?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as { items: GivingType[] };
    },
  });
  const giving = usePaginatedList<GivingRow>({
    queryKey: ["giving"],
    url: "/api/v1/giving",
  });

  const createType = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/giving-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: typeName }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to add giving type"));
      }
    },
    onSuccess: () => {
      setTypeName("");
      setTypeError(null);
      setTypeDialogOpen(false);
      toast("success", "Giving type added for this church.");
      void queryClient.invalidateQueries({ queryKey: ["giving-types"] });
    },
    onError: (err) => {
      setTypeError(err.message);
      toast("error", err.message);
    },
  });

  const columns = useMemo<ColumnDef<GivingRow>[]>(
    () => [
      {
        id: "when",
        header: "Recorded",
        cell: ({ row }) => formatDisplayDate(row.original.createdAt),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => row.original.givingType.name,
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => formatMoney(row.original.amount),
      },
      { accessorKey: "paymentMethod", header: "Method" },
      {
        id: "member",
        header: "Member",
        cell: ({ row }) =>
          row.original.member
            ? `${row.original.member.lastName}, ${row.original.member.firstName}`
            : "Anonymous",
      },
      {
        id: "service",
        header: "Service",
        cell: ({ row }) => row.original.service?.name ?? "—",
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Giving"
        description="Giving records for this church."
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTypeDialogOpen(true)}
              >
                Add type
              </Button>
              <Link href="/giving/new">
                <Button>+ Record giving</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {canManage ? (
        <SectionCard
          title="Giving types"
          description="Types belong to this church only."
        >
          <div className="flex flex-wrap gap-2">
            {(types.data?.items ?? []).length === 0 ? (
              <p className="text-sm text-text-muted">No giving types yet.</p>
            ) : (
              (types.data?.items ?? []).map((type) => (
                <Chip key={type.id}>
                  {type.name}
                  {type.status === "INACTIVE" ? " (inactive)" : ""}
                </Chip>
              ))
            )}
          </div>
        </SectionCard>
      ) : null}

      <ListToolbar
        searchValue={giving.q}
        onSearchChange={giving.setQ}
        searchPlaceholder="Search type or member"
        searchLabel="Search giving"
      />
      <QueryState
        isLoading={giving.isLoading}
        isError={giving.isError}
        isFetching={giving.isFetching && !giving.isLoading}
      >
        <DataTable
          columns={columns}
          data={giving.items}
          emptyTitle="No giving recorded"
          emptyDescription="Record giving for this church. Member is optional for anonymous gifts."
          pagination={{
            total: giving.total,
            page: giving.page,
            pageSize: giving.pageSize,
            onPageChange: giving.setPage,
            onPageSizeChange: giving.setPageSize,
          }}
        />
      </QueryState>

      {canManage ? (
        <FormDialog
          title="Add giving type"
          description="Choose a label such as Tithe or Offering for this church."
          open={typeDialogOpen}
          pending={createType.isPending}
          submitLabel="Add type"
          onCancel={() => {
            if (createType.isPending) return;
            setTypeDialogOpen(false);
            setTypeName("");
            setTypeError(null);
          }}
          onSubmit={() => createType.mutate()}
        >
          <div>
            <Label htmlFor="typeName">Type name</Label>
            <Input
              id="typeName"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Tithe, Offering"
              required
              autoFocus
            />
            {typeError ? (
              <p className="mt-2 text-sm text-danger" role="alert">
                {typeError}
              </p>
            ) : null}
          </div>
        </FormDialog>
      ) : null}
    </div>
  );
}
