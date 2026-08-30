"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GENDER_LABELS,
  Select,
  VISITOR_STATUS_LABELS,
} from "@/features/services/labels";
import { toDateInputValue } from "@/lib/ui";

export type VisitorFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  gender: keyof typeof GENDER_LABELS;
  address: string;
  howHeard: string;
  firstVisitDate: string;
  status: keyof typeof VISITOR_STATUS_LABELS;
  notes: string;
};

export function emptyVisitorForm(): VisitorFormValues {
  return {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gender: "UNSPECIFIED",
    address: "",
    howHeard: "",
    firstVisitDate: "",
    status: "NEW",
    notes: "",
  };
}

export function visitorFormFromRecord(record: {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  gender: keyof typeof GENDER_LABELS;
  address: string | null;
  howHeard: string | null;
  firstVisitDate: string | null;
  status: keyof typeof VISITOR_STATUS_LABELS;
  notes: string | null;
}): VisitorFormValues {
  return {
    firstName: record.firstName,
    lastName: record.lastName,
    phone: record.phone ?? "",
    email: record.email ?? "",
    gender: record.gender,
    address: record.address ?? "",
    howHeard: record.howHeard ?? "",
    firstVisitDate: toDateInputValue(record.firstVisitDate),
    status: record.status,
    notes: record.notes ?? "",
  };
}

export function visitorFormPayload(values: VisitorFormValues) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone || null,
    email: values.email || null,
    gender: values.gender,
    address: values.address || null,
    howHeard: values.howHeard || null,
    firstVisitDate: values.firstVisitDate || null,
    status: values.status,
    notes: values.notes || null,
  };
}

export function VisitorForm({
  initial,
  pending,
  submitLabel,
  statusDisabled,
  onSubmit,
  onCancel,
}: {
  initial: VisitorFormValues;
  pending?: boolean;
  submitLabel: string;
  statusDisabled?: boolean;
  onSubmit: (values: VisitorFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  function update<K extends keyof VisitorFormValues>(key: K, value: VisitorFormValues[K]) {
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
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select
            id="gender"
            value={form.gender}
            onChange={(e) =>
              update("gender", e.target.value as VisitorFormValues["gender"])
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
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as VisitorFormValues["status"])
            }
            disabled={statusDisabled}
          >
            {Object.entries(VISITOR_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="firstVisitDate">First visit</Label>
          <Input
            id="firstVisitDate"
            type="date"
            value={form.firstVisitDate}
            onChange={(e) => update("firstVisitDate", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="howHeard">How they heard</Label>
          <Input
            id="howHeard"
            value={form.howHeard}
            onChange={(e) => update("howHeard", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
