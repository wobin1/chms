"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BackLink } from "@/components/back-link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import {
  Chip,
  DetailField,
  ProfileHero,
  SectionCard,
  StatusBadge,
} from "@/components/detail/layout";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENDER_LABELS, Select } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { displayValue, formatDisplayDate, readApiError } from "@/lib/ui";

type Guardian = {
  memberId: string;
  relationship: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    membershipNumber: string;
  };
};

type Child = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: keyof typeof GENDER_LABELS;
  dateOfBirth: string | null;
  school: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
  family: { id: string; name: string };
  guardians: Guardian[];
};

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
};

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [memberId, setMemberId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Guardian | null>(null);

  const child = useQuery({
    queryKey: ["children", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/children/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Child;
    },
  });
  const members = useQuery({
    queryKey: ["members", "picker"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/members?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as MemberOption[] };
      return (await response.json()) as { items: MemberOption[] };
    },
  });

  const addGuardian = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/children/${params.id}/guardians`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, relationship }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to add guardian"));
      }
    },
    onSuccess: () => {
      toast("success", "Guardian added.");
      setMemberId("");
      setRelationship("");
      void queryClient.invalidateQueries({ queryKey: ["children", params.id] });
    },
    onError: (err) => toast("error", err.message),
  });

  const removeGuardian = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `/api/v1/children/${params.id}/guardians?memberId=${id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to remove guardian"));
      }
    },
    onSuccess: () => {
      toast("success", "Guardian removed.");
      setRemoveTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["children", params.id] });
    },
    onError: (err) => toast("error", err.message),
  });

  const columns = useMemo<ColumnDef<Guardian>[]>(
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
        id: "actions",
        header: "Activity",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            disabled={removeGuardian.isPending}
            onClick={() => setRemoveTarget(row.original)}
          >
            Remove
          </Button>
        ),
      },
    ],
    [removeGuardian.isPending],
  );

  const data = child.data;
  const fullName = data
    ? [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/children">Back to children</BackLink>
      <QueryState
        variant="detail"
        isLoading={child.isLoading}
        isError={child.isError}
        isFetching={child.isFetching && !child.isLoading}
        errorLabel="This child was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={fullName}
              subtitle={data.family.name}
              badges={
                <>
                  <StatusBadge
                    active={data.status === "ACTIVE"}
                    activeLabel="Active"
                    inactiveLabel="Inactive"
                  />
                  <Chip>{GENDER_LABELS[data.gender]}</Chip>
                  {data.dateOfBirth ? (
                    <Chip>DOB {formatDisplayDate(data.dateOfBirth)}</Chip>
                  ) : null}
                </>
              }
              actions={
                <Link href={`/children/${data.id}/edit`}>
                  <Button>Edit child</Button>
                </Link>
              }
            />

            <SectionCard title="Details">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="First name" value={data.firstName} />
                <DetailField
                  label="Middle name"
                  value={displayValue(data.middleName)}
                />
                <DetailField label="Last name" value={data.lastName} />
                <DetailField label="Gender" value={GENDER_LABELS[data.gender]} />
                <DetailField
                  label="Date of birth"
                  value={formatDisplayDate(data.dateOfBirth)}
                />
                <DetailField label="School" value={displayValue(data.school)} />
                <DetailField
                  label="Status"
                  value={data.status === "ACTIVE" ? "Active" : "Inactive"}
                />
                <div className="space-y-1.5">
                  <dt className="text-xs text-text-muted">Family</dt>
                  <dd className="text-sm font-medium leading-snug text-text">
                    <Link
                      href={`/families/${data.family.id}`}
                      className="text-accent"
                    >
                      {data.family.name}
                    </Link>
                  </dd>
                </div>
              </dl>
            </SectionCard>

            {data.notes ? (
              <SectionCard title="Notes">
                <p className="text-sm leading-relaxed text-text">{data.notes}</p>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Guardians"
              description="More than one guardian can be set. Guardians must be members of this church."
            >
              <form
                className="mb-4 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  addGuardian.mutate();
                }}
              >
                <div className="min-w-56 flex-1">
                  <Label htmlFor="member">Member</Label>
                  <Select
                    id="member"
                    value={memberId}
                    onChange={(event) => setMemberId(event.target.value)}
                    required
                  >
                    <option value="">Select a member of this church</option>
                    {(members.data?.items ?? []).map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.lastName}, {member.firstName} (
                        {member.membershipNumber})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="min-w-40">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    value={relationship}
                    onChange={(event) => setRelationship(event.target.value)}
                    placeholder="Mother, Father, Guardian"
                    required
                  />
                </div>
                <Button type="submit" loading={addGuardian.isPending} disabled={addGuardian.isPending || !memberId}>
                      Add guardian
                    </Button>
              </form>
              <DataTable
                columns={columns}
                data={data.guardians}
                emptyTitle="No guardians yet"
                emptyDescription="Add members of this church as guardians."
              />
            </SectionCard>
          </div>
        ) : null}
      </QueryState>
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove this guardian?"
        description={
          removeTarget
            ? `${removeTarget.member.firstName} ${removeTarget.member.lastName} will no longer be listed as a guardian.`
            : ""
        }
        confirmLabel="Remove"
        danger
        pending={removeGuardian.isPending}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeGuardian.mutate(removeTarget.member.id);
        }}
      />
    </div>
  );
}
