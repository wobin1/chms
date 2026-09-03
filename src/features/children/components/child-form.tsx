"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberPicker } from "@/components/member-picker";
import { GENDER_LABELS, Select } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { toDateInputValue } from "@/lib/ui";

type FamilyOption = { id: string; name: string };

export type ChildFormValues = {
  familyId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: keyof typeof GENDER_LABELS;
  dateOfBirth: string;
  school: string;
  notes: string;
  status: "ACTIVE" | "INACTIVE";
  guardian1Id: string;
  guardian1Rel: string;
  guardian2Id: string;
  guardian2Rel: string;
};

export function emptyChildForm(): ChildFormValues {
  return {
    familyId: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "UNSPECIFIED",
    dateOfBirth: "",
    school: "",
    notes: "",
    status: "ACTIVE",
    guardian1Id: "",
    guardian1Rel: "Parent",
    guardian2Id: "",
    guardian2Rel: "Parent",
  };
}

export function childFormFromRecord(record: {
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: keyof typeof GENDER_LABELS;
  dateOfBirth: string | null;
  school: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
}): Omit<ChildFormValues, "familyId" | "guardian1Id" | "guardian1Rel" | "guardian2Id" | "guardian2Rel"> {
  return {
    firstName: record.firstName,
    middleName: record.middleName ?? "",
    lastName: record.lastName,
    gender: record.gender,
    dateOfBirth: toDateInputValue(record.dateOfBirth),
    school: record.school ?? "",
    notes: record.notes ?? "",
    status: record.status,
  };
}

export function childEditPayload(
  values: Omit<
    ChildFormValues,
    "familyId" | "guardian1Id" | "guardian1Rel" | "guardian2Id" | "guardian2Rel"
  >,
) {
  return {
    firstName: values.firstName,
    middleName: values.middleName || null,
    lastName: values.lastName,
    gender: values.gender,
    dateOfBirth: values.dateOfBirth || null,
    school: values.school || null,
    notes: values.notes || null,
    status: values.status,
  };
}

export function childCreatePayload(values: ChildFormValues) {
  const guardians = [
    values.guardian1Id
      ? { memberId: values.guardian1Id, relationship: values.guardian1Rel }
      : null,
    values.guardian2Id
      ? { memberId: values.guardian2Id, relationship: values.guardian2Rel }
      : null,
  ].filter((row): row is { memberId: string; relationship: string } => Boolean(row));

  return {
    familyId: values.familyId,
    firstName: values.firstName,
    middleName: values.middleName || null,
    lastName: values.lastName,
    gender: values.gender,
    dateOfBirth: values.dateOfBirth || null,
    school: values.school || null,
    notes: values.notes || null,
    status: values.status,
    guardians,
  };
}

export function ChildForm({
  mode,
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial: ChildFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: ChildFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  const families = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/families?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as FamilyOption[] };
      return (await response.json()) as { items: FamilyOption[] };
    },
    enabled: mode === "create",
  });

  function update<K extends keyof ChildFormValues>(key: K, value: ChildFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      {mode === "create" ? (
        <div>
          <Label htmlFor="familyId">Family</Label>
          <Select
            id="familyId"
            value={form.familyId}
            onChange={(e) => update("familyId", e.target.value)}
            required
          >
            <option value="">Select a family of this church</option>
            {(families.data?.items ?? []).map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="middleName">Middle name</Label>
          <Input
            id="middleName"
            value={form.middleName}
            onChange={(e) => update("middleName", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select
            id="gender"
            value={form.gender}
            onChange={(e) =>
              update("gender", e.target.value as ChildFormValues["gender"])
            }
          >
            {Object.entries(GENDER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="school">School</Label>
          <Input
            id="school"
            value={form.school}
            onChange={(e) => update("school", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as ChildFormValues["status"])
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      {mode === "create" ? (
        <div className="space-y-3 border-t border-border pt-5">
          <p className="text-sm font-medium text-text">Guardians (optional)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="guardian1Id">Guardian</Label>
              <MemberPicker
                id="guardian1Id"
                value={form.guardian1Id}
                onChange={(memberId) => update("guardian1Id", memberId)}
                emptyLabel="Optional — member of this church"
                placeholder="Search members"
              />
            </div>
            <div>
              <Label htmlFor="guardian1Rel">Relationship</Label>
              <Input
                id="guardian1Rel"
                value={form.guardian1Rel}
                onChange={(e) => update("guardian1Rel", e.target.value)}
                placeholder="Mother"
              />
            </div>
            <div>
              <Label htmlFor="guardian2Id">Second guardian</Label>
              <MemberPicker
                id="guardian2Id"
                value={form.guardian2Id}
                onChange={(memberId) => update("guardian2Id", memberId)}
                emptyLabel="Optional — another member"
                placeholder="Search members"
              />
            </div>
            <div>
              <Label htmlFor="guardian2Rel">Relationship</Label>
              <Input
                id="guardian2Rel"
                value={form.guardian2Rel}
                onChange={(e) => update("guardian2Rel", e.target.value)}
                placeholder="Father"
              />
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending || (mode === "create" && !form.familyId)}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
