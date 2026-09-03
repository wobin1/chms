"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { readApiError } from "@/lib/ui";

type ChurchRow = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  city: string | null;
};

export default function ChurchesPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"All" | "Active" | "Suspended">("All");
  const [suspendTarget, setSuspendTarget] = useState<ChurchRow | null>(null);

  const churches = usePaginatedList<ChurchRow>({
    queryKey: ["churches"],
    url: "/api/v1/churches",
    extraParams: {
      status: tab === "All" ? undefined : tab.toUpperCase(),
    },
  });

  const suspend = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/v1/churches/${id}/suspend`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to suspend"));
      }
    },
    onSuccess: () => {
      toast("success", "Church suspended.");
      setSuspendTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["churches"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const columns = useMemo<ColumnDef<ChurchRow>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "slug", header: "Slug" },
      { accessorKey: "city", header: "City" },
      { accessorKey: "status", header: "Status" },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View church"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/platform/churches/${row.original.id}`)}
            />
            <IconButton
              label="Edit church"
              icon={rowIcons.Pencil}
              tone="edit"
              onClick={() => router.push(`/platform/churches/${row.original.id}`)}
            />
            {row.original.status === "ACTIVE" ? (
              <IconButton
                label="Suspend church"
                icon={rowIcons.Trash2}
                tone="danger"
                disabled={suspend.isPending}
                onClick={() => setSuspendTarget(row.original)}
              />
            ) : null}
          </div>
        ),
      },
    ],
    [router, suspend.isPending],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["All", "Active", "Suspended"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={
              tab === item
                ? "rounded-full bg-text px-4 py-2 text-sm font-medium text-surface"
                : "rounded-full bg-surface px-4 py-2 text-sm font-medium text-text-muted ring-1 ring-border"
            }
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Churches</h1>
        <Link href="/platform/churches/new">
          <Button>+ Add church</Button>
        </Link>
      </div>
      <ListToolbar
        searchValue={churches.q}
        onSearchChange={churches.setQ}
        searchPlaceholder="Search churches"
        searchLabel="Search churches"
      />
      <QueryState
        isLoading={churches.isLoading}
        isError={churches.isError}
        isFetching={churches.isFetching && !churches.isLoading}
      >
        <DataTable
          columns={columns}
          data={churches.items}
          emptyTitle="No churches yet"
          emptyDescription="Add a church to onboard the first congregation. Each church is an isolated tenant."
          getRowHref={(row) => `/platform/churches/${row.id}`}
          pagination={{
            total: churches.total,
            page: churches.page,
            pageSize: churches.pageSize,
            onPageChange: churches.setPage,
            onPageSizeChange: churches.setPageSize,
          }}
        />
      </QueryState>
      <ConfirmDialog
        open={suspendTarget !== null}
        title="Suspend this church?"
        description={`${suspendTarget?.name ?? "This church"} users will not be able to sign in until it is reactivated.`}
        confirmLabel="Suspend"
        danger
        pending={suspend.isPending}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (suspendTarget) suspend.mutate(suspendTarget.id);
        }}
      />
    </div>
  );
}
