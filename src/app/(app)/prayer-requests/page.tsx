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
import { PRAYER_STATUS_LABELS } from "@/features/care/labels";
import { Select } from "@/features/services/labels";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import type { PublicUser } from "@/lib/auth-types";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { formatDisplayDate, readApiError } from "@/lib/ui";

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
};

type PrayerRow = {
  id: string;
  title: string;
  description: string | null;
  status: keyof typeof PRAYER_STATUS_LABELS;
  createdAt: string;
  completedAt: string | null;
  member: {
    firstName: string;
    lastName: string;
    membershipNumber: string;
  } | null;
};

function memberLabel(member: {
  firstName: string;
  lastName: string;
  membershipNumber: string;
}) {
  return `${member.lastName}, ${member.firstName} (${member.membershipNumber})`;
}

export default function PrayerRequestsPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
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
  const canManage = me.data?.permissions.includes("prayer:manage") ?? false;

  const members = useQuery({
    queryKey: ["members", "picker"],
    enabled: canManage && createOpen,
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/members?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as MemberOption[] };
      return (await response.json()) as { items: MemberOption[] };
    },
  });
  const requests = usePaginatedList<PrayerRow>({
    queryKey: ["prayer-requests"],
    url: "/api/v1/prayer-requests",
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/prayer-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          memberId: memberId || null,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to create prayer request"),
        );
      }
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setMemberId("");
      setError(null);
      setCreateOpen(false);
      toast("success", "Prayer request added.");
      void queryClient.invalidateQueries({ queryKey: ["prayer-requests"] });
    },
    onError: (err) => {
      setError(err.message);
      toast("error", err.message);
    },
  });

  function closeCreateDialog() {
    if (create.isPending) return;
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    setMemberId("");
    setError(null);
  }

  const columns = useMemo<ColumnDef<PrayerRow>[]>(
    () => [
      { accessorKey: "title", header: "Title" },
      {
        id: "member",
        header: "Member",
        cell: ({ row }) =>
          row.original.member ? memberLabel(row.original.member) : "Anonymous",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => PRAYER_STATUS_LABELS[row.original.status],
      },
      {
        id: "createdAt",
        header: "Opened",
        cell: ({ row }) => formatDisplayDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View prayer request"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() =>
                router.push(`/prayer-requests/${row.original.id}`)
              }
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
        title="Prayer requests"
        description="Prayer requests for this church. A member is optional."
        action={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + Add request
            </Button>
          ) : undefined
        }
      />
      <ListToolbar
        searchValue={requests.q}
        onSearchChange={requests.setQ}
        searchPlaceholder="Search title or member"
        searchLabel="Search prayer requests"
      />
      <QueryState
        isLoading={requests.isLoading}
        isError={requests.isError}
        isFetching={requests.isFetching && !requests.isLoading}
      >
        <DataTable
          columns={columns}
          data={requests.items}
          emptyTitle="No prayer requests yet"
          emptyDescription="Add a request for this church. A member is optional."
          pagination={{
            total: requests.total,
            page: requests.page,
            pageSize: requests.pageSize,
            onPageChange: requests.setPage,
            onPageSizeChange: requests.setPageSize,
          }}
        />
      </QueryState>
      {canManage ? (
        <FormDialog
          title="Add prayer request"
          description="Enter a title and optional member. You can update status on the detail page."
          open={createOpen}
          pending={create.isPending}
          submitLabel="Add request"
          onCancel={closeCreateDialog}
          onSubmit={() => create.mutate()}
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="memberId">Member (optional)</Label>
              <Select
                id="memberId"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">Anonymous</option>
                {(members.data?.items ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {memberLabel(member)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
