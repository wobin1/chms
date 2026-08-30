"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANNOUNCEMENT_STATUS_LABELS } from "@/features/content/labels";
import { Select } from "@/features/services/labels";
import { toDateInputValue } from "@/lib/ui";

export type AnnouncementFormValues = {
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  status: keyof typeof ANNOUNCEMENT_STATUS_LABELS;
};

function todayInputValue() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function emptyAnnouncementForm(): AnnouncementFormValues {
  const today = todayInputValue();
  return {
    title: "",
    content: "",
    startDate: today,
    endDate: today,
    status: "PUBLISHED",
  };
}

export function announcementFormFromRecord(record: {
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  status: keyof typeof ANNOUNCEMENT_STATUS_LABELS;
}): AnnouncementFormValues {
  return {
    title: record.title,
    content: record.content,
    startDate: toDateInputValue(record.startDate),
    endDate: toDateInputValue(record.endDate),
    status: record.status,
  };
}

export function AnnouncementForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AnnouncementFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: AnnouncementFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  function update<K extends keyof AnnouncementFormValues>(
    key: K,
    value: AnnouncementFormValues[K],
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
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
              update("status", e.target.value as AnnouncementFormValues["status"])
            }
          >
            {Object.entries(ANNOUNCEMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="content">Content</Label>
        <textarea
          id="content"
          rows={5}
          value={form.content}
          onChange={(e) => update("content", e.target.value)}
          required
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
