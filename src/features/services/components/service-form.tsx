"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SERVICE_STATUS_LABELS } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { toDateInputValue } from "@/lib/ui";

type NamedLookup = { id: string; name: string };

export type ServiceFormValues = {
  serviceTypeId: string;
  serviceDate: string;
  name: string;
  theme: string;
  scripture: string;
  preacher: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: keyof typeof SERVICE_STATUS_LABELS;
};

function todayInputValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function emptyServiceForm(): ServiceFormValues {
  return {
    serviceTypeId: "",
    serviceDate: todayInputValue(),
    name: "",
    theme: "",
    scripture: "",
    preacher: "",
    startTime: "",
    endTime: "",
    notes: "",
    status: "SCHEDULED",
  };
}

export function serviceFormFromRecord(record: {
  serviceTypeId: string;
  serviceDate: string;
  name: string;
  theme: string | null;
  scripture: string | null;
  preacher: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  status: keyof typeof SERVICE_STATUS_LABELS;
}): ServiceFormValues {
  return {
    serviceTypeId: record.serviceTypeId,
    serviceDate: toDateInputValue(record.serviceDate),
    name: record.name,
    theme: record.theme ?? "",
    scripture: record.scripture ?? "",
    preacher: record.preacher ?? "",
    startTime: record.startTime ?? "",
    endTime: record.endTime ?? "",
    notes: record.notes ?? "",
    status: record.status,
  };
}

export function serviceFormPayload(values: ServiceFormValues) {
  return {
    serviceTypeId: values.serviceTypeId,
    serviceDate: values.serviceDate,
    name: values.name,
    theme: values.theme || null,
    scripture: values.scripture || null,
    preacher: values.preacher || null,
    startTime: values.startTime || null,
    endTime: values.endTime || null,
    notes: values.notes || null,
    status: values.status,
  };
}

export function ServiceForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ServiceFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: ServiceFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  const types = useQuery({
    queryKey: ["service-types"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/service-types?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as NamedLookup[] };
      return (await response.json()) as { items: NamedLookup[] };
    },
  });

  function update<K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) {
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
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="serviceDate">Date</Label>
          <Input
            id="serviceDate"
            type="date"
            value={form.serviceDate}
            onChange={(e) => update("serviceDate", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="serviceTypeId">Type</Label>
          <Select
            id="serviceTypeId"
            value={form.serviceTypeId}
            onChange={(e) => {
              const nextId = e.target.value;
              update("serviceTypeId", nextId);
              const type = types.data?.items.find((item) => item.id === nextId);
              if (type && !form.name) update("name", type.name);
            }}
            required
          >
            <option value="">Select a type</option>
            {(types.data?.items ?? []).map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
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
              update("status", e.target.value as ServiceFormValues["status"])
            }
          >
            {Object.entries(SERVICE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="preacher">Preacher</Label>
          <Input
            id="preacher"
            value={form.preacher}
            onChange={(e) => update("preacher", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="theme">Theme</Label>
          <Input
            id="theme"
            value={form.theme}
            onChange={(e) => update("theme", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="scripture">Scripture</Label>
          <Input
            id="scripture"
            value={form.scripture}
            onChange={(e) => update("scripture", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startTime">Start</Label>
            <Input
              id="startTime"
              value={form.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              placeholder="09:00"
            />
          </div>
          <div>
            <Label htmlFor="endTime">End</Label>
            <Input
              id="endTime"
              value={form.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              placeholder="11:00"
            />
          </div>
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
        <Button type="submit" loading={pending} disabled={pending || !form.serviceTypeId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
