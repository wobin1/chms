"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import {
  Chip,
  DetailField,
  DetailPageShell,
  EditPanel,
  ListPageHeader,
  ProfileHero,
  SectionCard,
  StatusBadge,
} from "@/components/detail/layout";
import { FormDialog } from "@/components/form-dialog";
import { ListToolbar } from "@/components/list-toolbar";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { MemberPicker } from "@/components/member-picker";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { displayValue, readApiError } from "@/lib/ui";

type GroupRow = {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  _count: { members: number };
};

type GroupMember = {
  memberId: string;
  role: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    membershipNumber: string;
    zone: { name: string } | null;
  };
};

type GroupDetail = GroupRow & {
  description: string | null;
  members: GroupMember[];
};

export function NamedGroupListPage({
  title,
  singular,
  apiPath,
  queryKey,
  hrefBase,
  placeholder,
}: {
  title: string;
  singular: string;
  apiPath: string;
  queryKey: string;
  hrefBase: string;
  placeholder: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const groups = usePaginatedList<GroupRow>({
    queryKey: [queryKey],
    url: apiPath,
  });

  const create = useMutation({
    mutationFn: async () => {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Unable to create ${singular}`));
      }
    },
    onSuccess: () => {
      setName("");
      setError(null);
      setCreateOpen(false);
      toast("success", `${singular[0].toUpperCase()}${singular.slice(1)} added.`);
      void queryClient.invalidateQueries({ queryKey: [queryKey] });
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

  const columns = useMemo<ColumnDef<GroupRow>[]>(
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
              label={`View ${singular}`}
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`${hrefBase}/${row.original.id}`)}
            />
            <IconButton
              label={`Edit ${singular}`}
              icon={rowIcons.Pencil}
              tone="edit"
              onClick={() => router.push(`${hrefBase}/${row.original.id}`)}
            />
          </div>
        ),
      },
    ],
    [hrefBase, router, singular],
  );

  const label = singular[0].toUpperCase() + singular.slice(1);

  return (
    <div className="space-y-6">
      <ListPageHeader
        title={title}
        description={`${label}s used by this church.`}
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            {`+ Add ${singular}`}
          </Button>
        }
      />
      <ListToolbar
        searchValue={groups.q}
        onSearchChange={groups.setQ}
        searchPlaceholder={`Search ${singular} name`}
        searchLabel={`Search ${title.toLowerCase()}`}
      />
      <QueryState
        isLoading={groups.isLoading}
        isError={groups.isError}
        isFetching={groups.isFetching && !groups.isLoading}
      >
        <DataTable
          columns={columns}
          data={groups.items}
          emptyTitle={`No ${title.toLowerCase()} yet`}
          emptyDescription={`Add a ${singular} used by this church. Names are yours to choose.`}
          getRowHref={(row) => `${hrefBase}/${row.id}`}
          pagination={{
            total: groups.total,
            page: groups.page,
            pageSize: groups.pageSize,
            onPageChange: groups.setPage,
            onPageSizeChange: groups.setPageSize,
          }}
        />
      </QueryState>
      <FormDialog
        title={`Add ${singular}`}
        description={`Choose a name for this ${singular}. You can assign members after creating it.`}
        open={createOpen}
        pending={create.isPending}
        submitLabel={`Add ${singular}`}
        onCancel={closeCreateDialog}
        onSubmit={() => create.mutate()}
      >
        <div>
          <Label htmlFor="groupName">Name</Label>
          <Input
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
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

export function NamedGroupDetailPage({
  singular,
  apiPath,
  queryKey,
  hrefBase,
}: {
  singular: string;
  apiPath: string;
  queryKey: string;
  hrefBase: string;
}) {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
  const [role, setRole] = useState("Member");
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const group = useQuery({
    queryKey: [queryKey, params.id],
    queryFn: async () => {
      const response = await fetch(`${apiPath}/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as GroupDetail;
    },
  });

  useEffect(() => {
    if (group.data && !editing) {
      setName(group.data.name);
      setDescription(group.data.description ?? "");
    }
  }, [group.data, editing]);

  const save = useMutation({
    mutationFn: async (payload: {
      name?: string;
      description?: string | null;
      status?: "ACTIVE" | "INACTIVE";
    }) => {
      const response = await fetch(`${apiPath}/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, `Unable to update ${singular}`));
      }
    },
    onSuccess: (_data, payload) => {
      toast(
        "success",
        payload.status === "INACTIVE"
          ? `${singular[0].toUpperCase()}${singular.slice(1)} deactivated.`
          : payload.status === "ACTIVE"
            ? `${singular[0].toUpperCase()}${singular.slice(1)} reactivated.`
            : `${singular[0].toUpperCase()}${singular.slice(1)} updated.`,
      );
      setConfirmDeactivate(false);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (err) => toast("error", err.message),
  });

  const assign = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${apiPath}/${params.id}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to assign member"));
      }
    },
    onSuccess: () => {
      toast("success", "Member assigned.");
      setMemberId("");
      setRole("Member");
      void queryClient.invalidateQueries({ queryKey: [queryKey, params.id] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${apiPath}/${params.id}/members?memberId=${id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to remove member"));
      }
    },
    onSuccess: () => {
      toast("success", "Member removed.");
      setRemoveTarget(null);
      void queryClient.invalidateQueries({ queryKey: [queryKey, params.id] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const memberColumns = useMemo<ColumnDef<GroupMember>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) =>
          `${row.original.member.lastName}, ${row.original.member.firstName}`,
      },
      {
        id: "number",
        header: "No.",
        cell: ({ row }) => row.original.member.membershipNumber,
      },
      { accessorKey: "role", header: "Role" },
      {
        id: "zone",
        header: "Zone",
        cell: ({ row }) => row.original.member.zone?.name ?? "Unassigned",
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            disabled={removeMember.isPending}
            onClick={() => setRemoveTarget(row.original)}
          >
            Remove
          </Button>
        ),
      },
    ],
    [removeMember.isPending],
  );

  const label = `${singular[0].toUpperCase()}${singular.slice(1)}`;
  const data = group.data;
  const memberCount = data?.members.length ?? 0;
  const backSegment = hrefBase.replace("/", "");

  function startEditing() {
    if (!data) return;
    setName(data.name);
    setDescription(data.description ?? "");
    setEditing(true);
  }

  function cancelEditing() {
    if (!data) return;
    setName(data.name);
    setDescription(data.description ?? "");
    setEditing(false);
  }

  return (
    <DetailPageShell backHref={hrefBase} backLabel={`Back to ${backSegment}`}>
      <QueryState
        variant="detail"
        isLoading={group.isLoading}
        isError={group.isError}
        isFetching={group.isFetching && !group.isLoading}
        errorLabel={`This ${singular} was not found.`}
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={editing ? name.trim() || data.name : data.name}
              subtitle={
                (editing ? description.trim() : data.description?.trim()) ||
                `${label} profile`
              }
              badges={
                <>
                  <StatusBadge active={data.status === "ACTIVE"} />
                  <Chip>
                    {memberCount} {memberCount === 1 ? "member" : "members"}
                  </Chip>
                </>
              }
              actions={
                !editing ? (
                  <>
                    <Button type="button" onClick={startEditing}>
                      {`Edit ${singular}`}
                    </Button>
                    {data.status === "ACTIVE" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={save.isPending}
                        onClick={() => setConfirmDeactivate(true)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={save.isPending}
                        onClick={() => save.mutate({ status: "ACTIVE" })}
                      >
                        Reactivate
                      </Button>
                    )}
                  </>
                ) : undefined
              }
            />

            {editing ? (
              <EditPanel
                title={`Edit ${singular}`}
                description={`Deactivating a ${singular} does not remove members.`}
                pending={save.isPending}
                onCancel={cancelEditing}
                onSave={() =>
                  save.mutate({
                    name: name.trim(),
                    description: description.trim() || null,
                  })
                }
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </EditPanel>
            ) : (
              <SectionCard title="Details">
                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailField label="Name" value={data.name} />
                  <DetailField
                    label="Status"
                    value={data.status === "ACTIVE" ? "Active" : "Inactive"}
                  />
                  <div className="sm:col-span-2">
                    <DetailField
                      label="Description"
                      value={displayValue(data.description)}
                    />
                  </div>
                </dl>
              </SectionCard>
            )}

            <SectionCard
              title={`${label} members`}
              description="Assign members of this church. A member can belong to more than one."
            >
              <form
                className="mb-4 flex flex-wrap items-end gap-3 border-b border-border pb-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  assign.mutate();
                }}
              >
                <div className="min-w-56 flex-1">
                  <Label htmlFor="member">Member</Label>
                  <MemberPicker
                    id="member"
                    value={memberId}
                    onChange={setMemberId}
                    excludeIds={data.members.map((row) => row.memberId)}
                    placeholder="Search members"
                    required
                  />
                </div>
                <div className="min-w-40">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Member, Leader"
                    required
                  />
                </div>
                <Button type="submit" loading={assign.isPending} disabled={assign.isPending || !memberId}>
                      Assign member
                    </Button>
              </form>
              <DataTable
                columns={memberColumns}
                data={data.members}
                emptyTitle={`No members in this ${singular}`}
                emptyDescription="Assign members of this church. A member can belong to more than one."
                getRowHref={(row) => `/members/${row.member.id}`}
              />
            </SectionCard>
          </div>
        ) : null}
      </QueryState>
      <ConfirmDialog
        open={removeTarget !== null}
        title={`Remove this member from the ${singular}?`}
        description={
          removeTarget
            ? `${removeTarget.member.firstName} ${removeTarget.member.lastName} will no longer be listed here.`
            : ""
        }
        confirmLabel="Remove"
        danger
        pending={removeMember.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeMember.mutate(removeTarget.member.id);
        }}
      />
      <ConfirmDialog
        open={confirmDeactivate}
        title={`Deactivate this ${singular}?`}
        description={`Members stay assigned. The ${singular} will be hidden from active lists.`}
        confirmLabel="Deactivate"
        danger
        pending={save.isPending}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => save.mutate({ status: "INACTIVE" })}
      />
    </DetailPageShell>
  );
}
