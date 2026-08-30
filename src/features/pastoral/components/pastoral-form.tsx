"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASTORAL_CASE_TYPE_SUGGESTIONS,
  PASTORAL_PRIORITY_LABELS,
  PASTORAL_STATUS_LABELS,
} from "@/features/care/labels";
import { Select } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
};
type UserOption = { id: string; name: string };

export type PastoralFormValues = {
  memberId: string;
  caseType: string;
  title: string;
  description: string;
  notes: string;
  priority: keyof typeof PASTORAL_PRIORITY_LABELS;
  status: keyof typeof PASTORAL_STATUS_LABELS;
  assignedToId: string;
};

export function emptyPastoralForm(): PastoralFormValues {
  return {
    memberId: "",
    caseType: "",
    title: "",
    description: "",
    notes: "",
    priority: "MEDIUM",
    status: "OPEN",
    assignedToId: "",
  };
}

export function pastoralFormFromRecord(record: {
  memberId: string;
  caseType: string;
  title: string;
  description: string | null;
  notes: string | null;
  priority: keyof typeof PASTORAL_PRIORITY_LABELS;
  status: keyof typeof PASTORAL_STATUS_LABELS;
  assignedToId: string | null;
}): PastoralFormValues {
  return {
    memberId: record.memberId,
    caseType: record.caseType,
    title: record.title,
    description: record.description ?? "",
    notes: record.notes ?? "",
    priority: record.priority,
    status: record.status,
    assignedToId: record.assignedToId ?? "",
  };
}

export function pastoralFormPayload(values: PastoralFormValues) {
  return {
    memberId: values.memberId,
    caseType: values.caseType,
    title: values.title,
    description: values.description || null,
    notes: values.notes || null,
    priority: values.priority,
    status: values.status,
    assignedToId: values.assignedToId || null,
  };
}

function memberLabel(member: {
  firstName: string;
  lastName: string;
  membershipNumber: string;
}) {
  return `${member.lastName}, ${member.firstName} (${member.membershipNumber})`;
}

export function PastoralForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: PastoralFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: PastoralFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

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
  const users = useQuery({
    queryKey: ["users", "picker"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/users?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as UserOption[] };
      return (await response.json()) as { items: UserOption[] };
    },
  });

  function update<K extends keyof PastoralFormValues>(
    key: K,
    value: PastoralFormValues[K],
  ) {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="memberId">Member</Label>
          <Select
            id="memberId"
            value={form.memberId}
            onChange={(e) => update("memberId", e.target.value)}
            required
          >
            <option value="">Select member</option>
            {(members.data?.items ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {memberLabel(member)}
              </option>
            ))}
            {form.memberId &&
            !(members.data?.items ?? []).some((m) => m.id === form.memberId) ? (
              <option value={form.memberId}>Current member</option>
            ) : null}
          </Select>
        </div>
        <div>
          <Label htmlFor="caseType">Case type</Label>
          <Input
            id="caseType"
            list="pastoral-case-types"
            value={form.caseType}
            onChange={(e) => update("caseType", e.target.value)}
            required
          />
          <datalist id="pastoral-case-types">
            {PASTORAL_CASE_TYPE_SUGGESTIONS.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </div>
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select
            id="priority"
            value={form.priority}
            onChange={(e) =>
              update("priority", e.target.value as PastoralFormValues["priority"])
            }
          >
            {Object.entries(PASTORAL_PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as PastoralFormValues["status"])
            }
          >
            {Object.entries(PASTORAL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="assignedToId">Assigned to</Label>
          <Select
            id="assignedToId"
            value={form.assignedToId}
            onChange={(e) => update("assignedToId", e.target.value)}
          >
            <option value="">Unassigned</option>
            {(users.data?.items ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            rows={4}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending || !form.memberId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
