"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ListPageHeader } from "@/components/detail/layout";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { FamilyOfTheWeekBadge } from "@/features/families/components/family-of-the-week-badge";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { readApiError } from "@/lib/ui";

type Family = {
  id: string;
  name: string;
  address: string | null;
  isFamilyOfTheWeek?: boolean;
  zone: { id: string; name: string };
  _count: { members: number; children: number };
};

type Zone = { id: string; name: string };

export default function FamiliesPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [weekConfirm, setWeekConfirm] = useState<{
    familyId: string;
    name: string;
    action: "set" | "clear";
  } | null>(null);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("families:manage") ?? false;
  const canSetFamilyOfTheWeek =
    me.data?.permissions.includes("families:read") ?? false;

  const families = usePaginatedList<Family>({
    queryKey: ["families"],
    url: "/api/v1/families",
  });
  const zones = useQuery({
    queryKey: ["zones"],
    enabled: canManage,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/zones?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as Zone[] };
      return (await response.json()) as { items: Zone[] };
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/families", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, zoneId }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create family"));
      }
    },
    onSuccess: () => {
      setName("");
      setZoneId("");
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
    setZoneId("");
    setError(null);
  }

  const setWeek = useMutation({
    mutationFn: async (payload: {
      familyId: string;
      familyOfTheWeek: boolean;
    }) => {
      const response = await fetch(`/api/v1/families/${payload.familyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ familyOfTheWeek: payload.familyOfTheWeek }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to update family of the week"),
        );
      }
    },
    onSuccess: (_data, payload) => {
      toast(
        "success",
        payload.familyOfTheWeek
          ? "Set as family of the week."
          : "Family of the week cleared.",
      );
      setWeekConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ["families"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const columns = useMemo<ColumnDef<Family>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.isFamilyOfTheWeek ? <FamilyOfTheWeekBadge /> : null}
          </div>
        ),
      },
      {
        id: "zone",
        header: "Zone",
        cell: ({ row }) => row.original.zone?.name ?? "—",
      },
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
          <div className="flex flex-wrap items-center gap-2">
            <IconButton
              label="View family"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/families/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit family"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/families/${row.original.id}`)}
              />
            ) : null}
            {canSetFamilyOfTheWeek ? (
              <Button
                type="button"
                variant="ghost"
                disabled={setWeek.isPending}
                onClick={() =>
                  setWeekConfirm({
                    familyId: row.original.id,
                    name: row.original.name,
                    action: row.original.isFamilyOfTheWeek ? "clear" : "set",
                  })
                }
              >
                {row.original.isFamilyOfTheWeek
                  ? "Remove family of the week"
                  : "Set as family of the week"}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canManage, canSetFamilyOfTheWeek, router, setWeek.isPending],
  );

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Families"
        description={
          canManage
            ? "Households in this church, grouped by zone."
            : "Households in your zone. Set family of the week from this list."
        }
        action={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + Add family
            </Button>
          ) : null
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
          emptyDescription={
            canManage
              ? "Add a family in a zone, then assign members of this church only."
              : "No families in your zone yet."
          }
          getRowHref={(row) => `/families/${row.id}`}
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
        description="Choose a household name and the zone this family belongs to."
        open={createOpen}
        pending={create.isPending}
        submitLabel="Add family"
        onCancel={closeCreateDialog}
        onSubmit={() => {
          if (!name.trim() || !zoneId) return;
          create.mutate();
        }}
      >
        <div className="space-y-4">
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
          </div>
          <div>
            <Label htmlFor="familyZone">Zone</Label>
            <Select
              id="familyZone"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              required
            >
              <option value="">Select a zone</option>
              {(zones.data?.items ?? []).map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </Select>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </FormDialog>
      <ConfirmDialog
        open={weekConfirm !== null}
        title={
          weekConfirm?.action === "clear"
            ? "Remove family of the week?"
            : "Set as family of the week?"
        }
        description={
          weekConfirm?.action === "clear"
            ? `${weekConfirm.name} will no longer be featured as family of the week.`
            : `This replaces any current family of the week in this family's zone with ${weekConfirm?.name ?? "this family"}.`
        }
        confirmLabel={
          weekConfirm?.action === "clear"
            ? "Remove"
            : "Set as family of the week"
        }
        danger={weekConfirm?.action === "clear"}
        pending={setWeek.isPending}
        onCancel={() => setWeekConfirm(null)}
        onConfirm={() => {
          if (!weekConfirm) return;
          setWeek.mutate({
            familyId: weekConfirm.familyId,
            familyOfTheWeek: weekConfirm.action === "set",
          });
        }}
      />
    </div>
  );
}
