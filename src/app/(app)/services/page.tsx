"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import {
  SERVICE_STATUS_LABELS,
} from "@/features/services/labels";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { formatDisplayDate, readApiError } from "@/lib/ui";

type NamedLookup = { id: string; name: string; sortOrder?: number };
type ServiceRow = {
  id: string;
  name: string;
  serviceDate: string;
  status: keyof typeof SERVICE_STATUS_LABELS;
  preacher: string | null;
  serviceType: { id: string; name: string };
  attendance: { count: number }[];
  _count: { visits: number };
};

export default function ServicesPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("services:manage") ?? false;

  const types = useQuery({
    queryKey: ["service-types"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/service-types?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as { items: NamedLookup[] };
    },
  });
  const categories = useQuery({
    queryKey: ["attendance-categories"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/attendance-categories?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as { items: NamedLookup[] };
    },
  });
  const services = usePaginatedList<ServiceRow>({
    queryKey: ["services"],
    url: "/api/v1/services",
  });

  const createType = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/service-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: typeName }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to add service type"));
      }
    },
    onSuccess: () => {
      setTypeName("");
      setTypeError(null);
      setTypeDialogOpen(false);
      toast("success", "Service type added for this church.");
      void queryClient.invalidateQueries({ queryKey: ["service-types"] });
    },
    onError: (err) => {
      setTypeError(err.message);
      toast("error", err.message);
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      const sortOrder = categories.data?.items.length ?? 0;
      const response = await fetch("/api/v1/attendance-categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: categoryName, sortOrder }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to add attendance category"),
        );
      }
    },
    onSuccess: () => {
      setCategoryName("");
      setCategoryError(null);
      setCategoryDialogOpen(false);
      toast("success", "Attendance category added for this church.");
      void queryClient.invalidateQueries({ queryKey: ["attendance-categories"] });
    },
    onError: (err) => {
      setCategoryError(err.message);
      toast("error", err.message);
    },
  });

  const columns = useMemo<ColumnDef<ServiceRow>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => formatDisplayDate(row.original.serviceDate),
      },
      { accessorKey: "name", header: "Service" },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => row.original.serviceType.name,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => SERVICE_STATUS_LABELS[row.original.status],
      },
      {
        id: "total",
        header: "Attendance",
        cell: ({ row }) =>
          row.original.attendance.reduce((sum, item) => sum + item.count, 0),
      },
      {
        id: "visitors",
        header: "Visitors",
        cell: ({ row }) => row.original._count.visits,
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View service"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/services/${row.original.id}`)}
            />
            {canManage ? (
              <IconButton
                label="Edit service"
                icon={rowIcons.Pencil}
                tone="edit"
                onClick={() => router.push(`/services/${row.original.id}/edit`)}
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
        title="Services"
        description="Church services with attendance counts and visitor links."
        action={
          canManage ? (
            <Link href="/services/new">
              <Button>+ Add service</Button>
            </Link>
          ) : undefined
        }
      />

      {canManage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Service types"
            description="Names belong to this church. Another church can reuse the same labels."
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTypeDialogOpen(true)}
              >
                Add type
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2">
              {(types.data?.items ?? []).length === 0 ? (
                <p className="text-sm text-text-muted">No types yet.</p>
              ) : (
                (types.data?.items ?? []).map((type) => (
                  <Chip key={type.id}>{type.name}</Chip>
                ))
              )}
            </div>
          </SectionCard>
          <SectionCard
            title="Attendance categories"
            description="Counts are totals per category. There is no member roll-call."
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCategoryDialogOpen(true)}
              >
                Add category
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2">
              {(categories.data?.items ?? []).length === 0 ? (
                <p className="text-sm text-text-muted">No categories yet.</p>
              ) : (
                (categories.data?.items ?? []).map((category) => (
                  <Chip key={category.id}>{category.name}</Chip>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      <ListToolbar
        searchValue={services.q}
        onSearchChange={services.setQ}
        searchPlaceholder="Search service name or type"
        searchLabel="Search services"
      />
      <QueryState
        isLoading={services.isLoading}
        isError={services.isError}
        isFetching={services.isFetching && !services.isLoading}
      >
        <DataTable
          columns={columns}
          data={services.items}
          emptyTitle="No services yet"
          emptyDescription="Add a service for this church, then enter attendance counts."
          pagination={{
            total: services.total,
            page: services.page,
            pageSize: services.pageSize,
            onPageChange: services.setPage,
            onPageSizeChange: services.setPageSize,
          }}
        />
      </QueryState>

      {canManage ? (
        <>
          <FormDialog
            title="Add service type"
            description="Choose a label for this church's service types."
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
                placeholder="Youth Service"
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
          <FormDialog
            title="Add attendance category"
            description="Categories are used for attendance totals on each service."
            open={categoryDialogOpen}
            pending={createCategory.isPending}
            submitLabel="Add category"
            onCancel={() => {
              if (createCategory.isPending) return;
              setCategoryDialogOpen(false);
              setCategoryName("");
              setCategoryError(null);
            }}
            onSubmit={() => createCategory.mutate()}
          >
            <div>
              <Label htmlFor="categoryName">Category name</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Youth"
                required
                autoFocus
              />
              {categoryError ? (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {categoryError}
                </p>
              ) : null}
            </div>
          </FormDialog>
        </>
      ) : null}
    </div>
  );
}
