"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { formatDisplayDate } from "@/lib/ui";

type ServiceOption = { id: string; name: string; serviceDate: string };

export type SermonFormValues = {
  serviceId: string;
  title: string;
  preacher: string;
  scripture: string;
  summary: string;
  audioUrl: string;
  videoUrl: string;
  documentUrl: string;
};

export function emptySermonForm(): SermonFormValues {
  return {
    serviceId: "",
    title: "",
    preacher: "",
    scripture: "",
    summary: "",
    audioUrl: "",
    videoUrl: "",
    documentUrl: "",
  };
}

export function sermonFormFromRecord(record: {
  title: string;
  preacher: string;
  scripture: string | null;
  summary: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  service: { id: string };
}): SermonFormValues {
  return {
    serviceId: record.service.id,
    title: record.title,
    preacher: record.preacher,
    scripture: record.scripture ?? "",
    summary: record.summary ?? "",
    audioUrl: record.audioUrl ?? "",
    videoUrl: record.videoUrl ?? "",
    documentUrl: record.documentUrl ?? "",
  };
}

export function sermonFormPayload(values: SermonFormValues) {
  return {
    serviceId: values.serviceId,
    title: values.title,
    preacher: values.preacher,
    scripture: values.scripture || null,
    summary: values.summary || null,
    audioUrl: values.audioUrl || null,
    videoUrl: values.videoUrl || null,
    documentUrl: values.documentUrl || null,
  };
}

export function SermonForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: SermonFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: SermonFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  const services = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/services?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as ServiceOption[] };
      return (await response.json()) as { items: ServiceOption[] };
    },
  });

  function update<K extends keyof SermonFormValues>(key: K, value: SermonFormValues[K]) {
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
        <Label htmlFor="serviceId">Service</Label>
        <Select
          id="serviceId"
          value={form.serviceId}
          onChange={(e) => update("serviceId", e.target.value)}
          required
        >
          <option value="">Select a service</option>
          {(services.data?.items ?? []).map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} · {formatDisplayDate(service.serviceDate)}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="preacher">Preacher</Label>
          <Input
            id="preacher"
            value={form.preacher}
            onChange={(e) => update("preacher", e.target.value)}
            required
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
      </div>
      <div>
        <Label htmlFor="summary">Summary</Label>
        <textarea
          id="summary"
          rows={3}
          value={form.summary}
          onChange={(e) => update("summary", e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-1">
        <div>
          <Label htmlFor="audioUrl">Audio URL (optional)</Label>
          <Input
            id="audioUrl"
            type="url"
            value={form.audioUrl}
            onChange={(e) => update("audioUrl", e.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <Label htmlFor="videoUrl">Video URL (optional)</Label>
          <Input
            id="videoUrl"
            type="url"
            value={form.videoUrl}
            onChange={(e) => update("videoUrl", e.target.value)}
            placeholder="https://"
          />
        </div>
        <div>
          <Label htmlFor="documentUrl">Document URL (optional)</Label>
          <Input
            id="documentUrl"
            type="url"
            value={form.documentUrl}
            onChange={(e) => update("documentUrl", e.target.value)}
            placeholder="https://"
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending || !form.serviceId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
