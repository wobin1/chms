"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/back-link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import {
  Chip,
  DetailField,
  EditPanel,
  ProfileHero,
  SectionCard,
} from "@/components/detail/layout";
import { MemberPicker } from "@/components/member-picker";
import { RelationshipSelect } from "@/components/relationship-select";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconButton, rowIcons } from "@/components/ui/icon-button";
import {
  type FamilyRelationshipSelection,
  relationshipValueFromPreset,
} from "@/features/families/relationship";
import { displayValue, readApiError } from "@/lib/ui";

type FamilyMember = {
  memberId: string;
  relationship: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    membershipNumber: string;
    zone: { name: string } | null;
  };
};

type Family = {
  id: string;
  name: string;
  address: string | null;
  members: FamilyMember[];
  children: FamilyChild[];
};

type FamilyChild = {
  id: string;
  firstName: string;
  lastName: string;
  guardians: {
    relationship: string;
    member: { firstName: string; lastName: string };
  }[];
};

export default function FamilyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [relationshipPreset, setRelationshipPreset] =
    useState<FamilyRelationshipSelection>("");
  const [relationshipOther, setRelationshipOther] = useState("");
  const [removeTarget, setRemoveTarget] = useState<FamilyMember | null>(null);
  const [childFirst, setChildFirst] = useState("");
  const [childLast, setChildLast] = useState("");
  const [guardian1Id, setGuardian1Id] = useState("");
  const [guardian1Rel, setGuardian1Rel] = useState("Mother");
  const [guardian2Id, setGuardian2Id] = useState("");
  const [guardian2Rel, setGuardian2Rel] = useState("Father");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const family = useQuery({
    queryKey: ["families", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/families/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Family;
    },
  });
  const relationship = relationshipValueFromPreset(
    relationshipPreset,
    relationshipOther,
  );

  useEffect(() => {
    if (family.data && !editing) {
      setName(family.data.name);
      setAddress(family.data.address ?? "");
    }
  }, [family.data, editing]);

  const save = useMutation({
    mutationFn: async (payload: { name?: string; address?: string | null }) => {
      const response = await fetch(`/api/v1/families/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update family"));
      }
    },
    onSuccess: () => {
      toast("success", "Family updated.");
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["families"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/families/${params.id}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberIds, relationship }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to add member"));
      }
    },
    onSuccess: () => {
      toast(
        "success",
        memberIds.length > 1
          ? "Members added to family."
          : "Member added to family.",
      );
      setMemberIds([]);
      setRelationshipPreset("");
      setRelationshipOther("");
      void queryClient.invalidateQueries({ queryKey: ["families", params.id] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/v1/families/${params.id}/members?memberId=${id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to remove member"));
      }
    },
    onSuccess: () => {
      toast("success", "Member removed from family.");
      setRemoveTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["families", params.id] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const addChild = useMutation({
    mutationFn: async () => {
      const guardians = [
        guardian1Id
          ? { memberId: guardian1Id, relationship: guardian1Rel }
          : null,
        guardian2Id
          ? { memberId: guardian2Id, relationship: guardian2Rel }
          : null,
      ].filter((row): row is { memberId: string; relationship: string } =>
        Boolean(row),
      );
      const response = await fetch("/api/v1/children", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          familyId: params.id,
          firstName: childFirst,
          lastName: childLast,
          guardians,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to register child"));
      }
    },
    onSuccess: () => {
      toast("success", "Child registered on this family.");
      setChildFirst("");
      setChildLast("");
      setGuardian1Id("");
      setGuardian2Id("");
      void queryClient.invalidateQueries({ queryKey: ["families", params.id] });
      void queryClient.invalidateQueries({ queryKey: ["children"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const columns = useMemo<ColumnDef<FamilyMember>[]>(
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
      { accessorKey: "relationship", header: "Relationship" },
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

  const childColumns = useMemo<ColumnDef<FamilyChild>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) =>
          `${row.original.lastName}, ${row.original.firstName}`,
      },
      {
        id: "guardians",
        header: "Guardians",
        cell: ({ row }) =>
          row.original.guardians.length
            ? row.original.guardians
                .map(
                  (guardian) =>
                    `${guardian.member.lastName}, ${guardian.member.firstName} (${guardian.relationship})`,
                )
                .join("; ")
            : "—",
      },
      {
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <IconButton
              label="View child"
              icon={rowIcons.Eye}
              tone="view"
              onClick={() => router.push(`/children/${row.original.id}`)}
            />
            <IconButton
              label="Edit child"
              icon={rowIcons.Pencil}
              tone="edit"
              onClick={() => router.push(`/children/${row.original.id}`)}
            />
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/families">Back to families</BackLink>
      <QueryState
        variant="detail"
        isLoading={family.isLoading}
        isError={family.isError}
        isFetching={family.isFetching && !family.isLoading}
        errorLabel="This family was not found."
      >
        {family.data ? (
          <div className="space-y-6">
            <ProfileHero
              title={editing ? name.trim() || family.data.name : family.data.name}
              subtitle={
                (editing ? address.trim() : family.data.address?.trim()) ||
                "Family profile"
              }
              badges={
                <>
                  <Chip>
                    {family.data.members.length}{" "}
                    {family.data.members.length === 1 ? "member" : "members"}
                  </Chip>
                  <Chip>
                    {family.data.children.length}{" "}
                    {family.data.children.length === 1 ? "child" : "children"}
                  </Chip>
                </>
              }
              actions={
                !editing ? (
                  <Button type="button" onClick={() => setEditing(true)}>
                    Edit family
                  </Button>
                ) : undefined
              }
            />

            {editing ? (
              <EditPanel
                title="Edit family"
                description="Update the family name and address."
                pending={save.isPending}
                onCancel={() => {
                  setName(family.data.name);
                  setAddress(family.data.address ?? "");
                  setEditing(false);
                }}
                onSave={() =>
                  save.mutate({
                    name: name.trim(),
                    address: address.trim() || null,
                  })
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </EditPanel>
            ) : (
              <SectionCard title="Details">
                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailField label="Family name" value={family.data.name} />
                  <DetailField
                    label="Address"
                    value={displayValue(family.data.address)}
                  />
                </dl>
              </SectionCard>
            )}

            <SectionCard
              title="Family members"
              description="Members linked to this family in this church."
            >
              <form
                className="mb-4 space-y-3 border-b border-border pb-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  addMember.mutate();
                }}
              >
                <div>
                  <Label htmlFor="member">Members</Label>
                  <MemberPicker
                    id="member"
                    multiple
                    value={memberIds}
                    onChange={setMemberIds}
                    excludeIds={family.data.members.map((row) => row.memberId)}
                    placeholder="Search and select members"
                    required
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-40 flex-1">
                    <Label htmlFor="relationship">Relationship</Label>
                    <RelationshipSelect
                      id="relationship"
                      preset={relationshipPreset}
                      otherText={relationshipOther}
                      onPresetChange={setRelationshipPreset}
                      onOtherTextChange={setRelationshipOther}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    loading={addMember.isPending}
                    disabled={
                      addMember.isPending ||
                      memberIds.length === 0 ||
                      !relationship
                    }
                  >
                    Add members
                  </Button>
                </div>
              </form>
              <DataTable
                columns={columns}
                data={family.data.members}
                emptyTitle="No members in this family"
                emptyDescription="Add members who belong to this church."
                getRowHref={(row) => `/members/${row.member.id}`}
              />
            </SectionCard>

            <SectionCard
              title="Children"
              description="Children registered on this family. Add more from Children for full profiles."
            >
              <form
                className="mb-4 space-y-3 border-b border-border pb-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  addChild.mutate();
                }}
              >
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-36 flex-1">
                    <Label htmlFor="childFirst">First name</Label>
                    <Input
                      id="childFirst"
                      value={childFirst}
                      onChange={(event) => setChildFirst(event.target.value)}
                      required
                    />
                  </div>
                  <div className="min-w-36 flex-1">
                    <Label htmlFor="childLast">Last name</Label>
                    <Input
                      id="childLast"
                      value={childLast}
                      onChange={(event) => setChildLast(event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1">
                    <Label htmlFor="guardian1">Guardian</Label>
                    <MemberPicker
                      id="guardian1"
                      value={guardian1Id}
                      onChange={setGuardian1Id}
                      emptyLabel="Optional — member of this church"
                      placeholder="Search members"
                    />
                  </div>
                  <div className="min-w-32">
                    <Label htmlFor="guardian1Rel">Relationship</Label>
                    <Input
                      id="guardian1Rel"
                      value={guardian1Rel}
                      onChange={(event) => setGuardian1Rel(event.target.value)}
                    />
                  </div>
                  <div className="min-w-48 flex-1">
                    <Label htmlFor="guardian2">Second guardian</Label>
                    <MemberPicker
                      id="guardian2"
                      value={guardian2Id}
                      onChange={setGuardian2Id}
                      emptyLabel="Optional — another member"
                      placeholder="Search members"
                    />
                  </div>
                  <div className="min-w-32">
                    <Label htmlFor="guardian2Rel">Relationship</Label>
                    <Input
                      id="guardian2Rel"
                      value={guardian2Rel}
                      onChange={(event) => setGuardian2Rel(event.target.value)}
                    />
                  </div>
                  <Button type="submit" loading={addChild.isPending} disabled={addChild.isPending}>
                      Add child
                    </Button>
                </div>
              </form>
              <DataTable
                columns={childColumns}
                data={family.data.children}
                emptyTitle="No children on this family"
                emptyDescription="Register a child here. More than one guardian can be set, from this church only."
                getRowHref={(row) => `/children/${row.id}`}
              />
            </SectionCard>
          </div>
        ) : null}
      </QueryState>
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove this member from the family?"
        description={
          removeTarget
            ? `${removeTarget.member.firstName} ${removeTarget.member.lastName} will no longer be listed on this family.`
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
    </div>
  );
}
