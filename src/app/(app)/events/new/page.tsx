"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  emptyEventForm,
  EventForm,
} from "@/features/events/components/event-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewEventPage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyEventForm>) => {
      const response = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          description: values.description || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create event"));
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast("success", "Event added.");
      router.push(`/events/${data.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/events">Back to events</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Add event</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Record dates, location, and type. Attendance is a count, not a member list.
        </p>
      </div>
      <EventForm
        initial={emptyEventForm()}
        pending={create.isPending}
        submitLabel="Create event"
        onCancel={() => router.push("/events")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
