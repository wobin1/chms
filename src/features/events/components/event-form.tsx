"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVENT_STATUS_LABELS } from "@/features/events/labels";
import { Select } from "@/features/services/labels";
import { toDateInputValue } from "@/lib/ui";

export type EventFormValues = {
  name: string;
  eventType: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  status: keyof typeof EVENT_STATUS_LABELS;
};

function todayInputValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function emptyEventForm(): EventFormValues {
  const today = todayInputValue();
  return {
    name: "",
    eventType: "",
    startDate: today,
    endDate: today,
    location: "",
    description: "",
    status: "SCHEDULED",
  };
}

export function eventFormFromRecord(record: {
  name: string;
  eventType: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string | null;
  status: keyof typeof EVENT_STATUS_LABELS;
}): EventFormValues {
  return {
    name: record.name,
    eventType: record.eventType,
    startDate: toDateInputValue(record.startDate),
    endDate: toDateInputValue(record.endDate),
    location: record.location,
    description: record.description ?? "",
    status: record.status,
  };
}

export function EventForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: EventFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  function update<K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) {
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
      <div>
        <Label htmlFor="name">Event name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="eventType">Type</Label>
          <Input
            id="eventType"
            value={form.eventType}
            onChange={(e) => update("eventType", e.target.value)}
            placeholder="Camp, Outreach"
            required
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            type="date"
            value={form.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as EventFormValues["status"])
            }
          >
            {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
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
