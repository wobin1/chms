"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/back-link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import { FamilyOfTheWeekBadge } from "@/features/families/components/family-of-the-week-badge";
import type { PublicUser } from "@/lib/auth-types";
import { displayValue, readApiError } from "@/lib/ui";

type Leader = { user: { id: string; name: string; email: string } };
type Zone = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  leaders: Leader[];
  familyOfTheWeek: { id: string; name: string } | null;
};
type User = {
  id: string;
  name: string;
  email: string;
};
type Member = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
};
type ZoneFamily = {
  id: string;
  name: string;
  address: string | null;
  isFamilyOfTheWeek?: boolean;
  _count: { members: number; children: number };
};

type ConfirmAction =
  | { type: "deactivate" }
  | { type: "removeLeader"; userId: string; name: string }
  | null;

type WeekConfirm = {
  familyId: string;
  name: string;
  action: "set" | "clear";
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm font-medium leading-snug text-text">{value}</dd>
    </div>
  );
}

export default function ZoneDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [weekConfirm, setWeekConfirm] = useState<WeekConfirm | null>(null);

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
  const canReadFamilies =
    me.data?.permissions.includes("families:read") ?? false;
  const canManageFamilies =
    me.data?.permissions.includes("families:manage") ?? false;
  const canSetFamilyOfTheWeek = canReadFamilies;

  const zone = useQuery({
    queryKey: ["zones", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/zones/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Zone;
    },
  });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/v1/users");
      if (!response.ok) return { items: [] as User[] };
      return (await response.json()) as { items: User[] };
    },
    enabled: canManage,
  });
  const members = useQuery({
    queryKey: ["zones", params.id, "members"],
    queryFn: async () => {
      const response = await fetch(`/api/v1/zones/${params.id}/members`);
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as { items: Member[] };
    },
  });
  const families = useQuery({
    queryKey: ["zones", params.id, "families"],
    enabled: canReadFamilies,
    queryFn: async () => {
      const response = await fetch(`/api/v1/zones/${params.id}/families`);
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as { items: ZoneFamily[]; total: number };
    },
  });

  useEffect(() => {
    if (zone.data && !editing) {
      setName(zone.data.name);
      setDescription(zone.data.description ?? "");
    }
  }, [zone.data, editing]);

  const save = useMutation({
    mutationFn: async (payload: {
      name?: string;
      description?: string | null;
      status?: "ACTIVE" | "INACTIVE";
    }) => {
      const response = await fetch(`/api/v1/zones/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update zone"));
      }
    },
    onSuccess: (_data, payload) => {
      toast(
        "success",
        payload.status === "INACTIVE"
          ? "Zone deactivated."
          : payload.status === "ACTIVE"
            ? "Zone reactivated."
            : "Zone updated.",
      );
      setConfirm(null);
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const assign = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/zones/${params.id}/leaders`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: leaderId }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to assign leader"));
      }
    },
    onSuccess: () => {
      toast("success", "Zone leader assigned.");
      setLeaderId("");
      void queryClient.invalidateQueries({ queryKey: ["zones", params.id] });
    },
    onError: (err) => toast("error", err.message),
  });

  const removeLeader = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `/api/v1/zones/${params.id}/leaders?userId=${userId}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to remove leader"));
      }
    },
    onSuccess: () => {
      toast("success", "Zone leader removed.");
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ["zones", params.id] });
    },
    onError: (err) => toast("error", err.message),
  });

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
      void queryClient.invalidateQueries({ queryKey: ["zones"] });
      void queryClient.invalidateQueries({ queryKey: ["families"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const memberColumns = useMemo<ColumnDef<Member>[]>(
    () => [
      {
        accessorKey: "membershipNumber",
        header: "No.",
        cell: ({ row }) => (
          <Link
            href={`/members/${row.original.id}`}
            className="font-medium text-accent hover:underline"
          >
            {row.original.membershipNumber}
          </Link>
        ),
      },
      { accessorKey: "lastName", header: "Last name" },
      { accessorKey: "firstName", header: "First name" },
    ],
    [],
  );

  const familyColumns = useMemo<ColumnDef<ZoneFamily>[]>(
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
    [canSetFamilyOfTheWeek, router, setWeek.isPending],
  );

  const data = zone.data;
  const memberCount = members.data?.items.length ?? 0;
  const familyCount = families.data?.total ?? 0;
  const leaderCount = data?.leaders.length ?? 0;

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
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/zones">Back to zones</BackLink>
      <QueryState
        variant="detail"
        isLoading={zone.isLoading}
        isError={zone.isError}
        isFetching={zone.isFetching && !zone.isLoading}
        errorLabel="This zone was not found."
      >
        {data ? (
          <div className="space-y-6">
            <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div>
                    <h1 className="text-2xl font-bold leading-tight text-text">
                      {editing ? name.trim() || data.name : data.name}
                    </h1>
                    <p className="mt-1.5 text-sm leading-normal text-text-muted">
                      {(editing ? description.trim() : data.description?.trim()) ||
                        "Zone profile"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <span
                      className={
                        data.status === "ACTIVE"
                          ? "rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                          : "rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning"
                      }
                    >
                      {data.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border">
                      {leaderCount} {leaderCount === 1 ? "leader" : "leaders"}
                    </span>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border">
                      {members.isLoading
                        ? "…"
                        : `${memberCount} ${memberCount === 1 ? "member" : "members"}`}
                    </span>
                    {canReadFamilies ? (
                      <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border">
                        {families.data == null
                          ? "…"
                          : `${familyCount} ${familyCount === 1 ? "family" : "families"}`}
                      </span>
                    ) : null}
                  </div>
                </div>
                {canManage && !editing ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={startEditing}>
                      Edit zone
                    </Button>
                    {data.status === "ACTIVE" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={save.isPending}
                        onClick={() => setConfirm({ type: "deactivate" })}
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
                  </div>
                ) : null}
              </div>
            </article>

            {editing && canManage ? (
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
                  <div className="space-y-1.5">
                    <h2 className="text-sm font-semibold text-text">Edit zone</h2>
                    <p className="text-sm leading-normal text-text-muted">
                      Deactivating a zone does not delete members.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={cancelEditing}
                      disabled={save.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      loading={save.isPending}
                      disabled={save.isPending || !name.trim()}
                      onClick={() =>
                        save.mutate({
                          name: name.trim(),
                          description: description.trim() || null,
                        })
                      }
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
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
              </section>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-text">Details</h2>
                <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Detail label="Name" value={data.name} />
                  <Detail
                    label="Status"
                    value={data.status === "ACTIVE" ? "Active" : "Inactive"}
                  />
                  <div className="sm:col-span-2">
                    <Detail
                      label="Description"
                      value={displayValue(data.description)}
                    />
                  </div>
                </dl>
              </section>

              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-text">Zone leaders</h2>
                {data.leaders.length > 0 ? (
                  <ul className="mt-4 divide-y divide-border">
                    {data.leaders.map((leader) => (
                      <li
                        key={leader.user.id}
                        className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 space-y-1.5">
                          <p className="text-sm font-medium leading-snug text-text">
                            {leader.user.name}
                          </p>
                          <p className="text-xs leading-normal text-text-muted">
                            {leader.user.email}
                          </p>
                        </div>
                        {canManage ? (
                          <Button
                            variant="ghost"
                            disabled={removeLeader.isPending}
                            onClick={() =>
                              setConfirm({
                                type: "removeLeader",
                                userId: leader.user.id,
                                name: leader.user.name,
                              })
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-text-muted">
                    No leaders assigned yet.
                  </p>
                )}

                {canManage ? (
                  <form
                    className="mt-5 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-end"
                    onSubmit={(event) => {
                      event.preventDefault();
                      assign.mutate();
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <Label htmlFor="leader">Assign leader</Label>
                      <Select
                        id="leader"
                        value={leaderId}
                        onChange={(e) => setLeaderId(e.target.value)}
                        required
                      >
                        <option value="">Select a user</option>
                        {(users.data?.items ?? []).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button type="submit" loading={assign.isPending} disabled={assign.isPending || !leaderId}>
                      Assign
                    </Button>
                  </form>
                ) : null}
              </section>
            </div>

            {canReadFamilies ? (
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-text">
                      Zone families
                    </h2>
                    <p className="mt-1.5 text-sm leading-normal text-text-muted">
                      {canSetFamilyOfTheWeek
                        ? "Households in this zone. Set this zone's family of the week from the list."
                        : "Households in this zone, including family of the week."}
                    </p>
                  </div>
                  <Link
                    href="/families"
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Open families
                  </Link>
                </div>
                <DataTable
                  columns={familyColumns}
                  data={families.data?.items ?? []}
                  emptyTitle="No families in this zone"
                  emptyDescription={
                    canManageFamilies
                      ? "Add a family and assign it to this zone, then set family of the week here."
                      : "No families belong to this zone yet."
                  }
                  getRowHref={(row) => `/families/${row.id}`}
                />
              </section>
            ) : null}

            <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-text">Zone members</h2>
                  <p className="mt-1.5 text-sm leading-normal text-text-muted">
                    Members assigned to this zone.
                  </p>
                </div>
                <Link
                  href="/members"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Open members
                </Link>
              </div>
              <DataTable
                columns={memberColumns}
                data={members.data?.items ?? []}
                emptyTitle="No members in this zone"
                emptyDescription="Assign members to this zone from the member profile."
                getRowHref={(row) => `/members/${row.id}`}
              />
            </section>
          </div>
        ) : null}
      </QueryState>
      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.type === "removeLeader"
            ? "Remove this zone leader?"
            : "Deactivate this zone?"
        }
        description={
          confirm?.type === "removeLeader"
            ? `${confirm.name} will no longer lead this zone.`
            : "Members stay assigned. The zone will be hidden from active lists."
        }
        confirmLabel={confirm?.type === "removeLeader" ? "Remove" : "Deactivate"}
        danger
        pending={save.isPending || removeLeader.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.type === "removeLeader") {
            removeLeader.mutate(confirm.userId);
          } else if (confirm?.type === "deactivate") {
            save.mutate({ status: "INACTIVE" });
          }
        }}
      />
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
            : `This replaces any current family of the week in this zone with ${weekConfirm?.name ?? "this family"}.`
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
