"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  eventFormFromRecord,
  EventForm,
} from "@/features/events/components/event-form";
import { EVENT_STATUS_LABELS } from "@/features/events/labels";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type ChurchEvent = {
  id: string;
  name: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string;
  location: string;
  status: keyof typeof EVENT_STATUS_LABELS;
};

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const event = useQuery({
    queryKey: ["events", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/events/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as ChurchEvent;
    },
  });

  const save = useMutation({
    mutationFn: async (values: ReturnType<typeof eventFormFromRecord>) => {
      const response = await fetch(`/api/v1/events/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          description: values.description || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update event"));
      }
    },
    onSuccess: () => {
      toast("success", "Event updated.");
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      router.push(`/events/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/events/${params.id}`}>Back to event</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit event</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update event details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={event.isLoading}
        isError={event.isError}
        errorLabel="This event was not found."
      >
        {event.data ? (
          <EventForm
            key={event.data.id}
            initial={eventFormFromRecord(event.data)}
            pending={save.isPending}
            submitLabel="Save changes"
            onCancel={() => router.push(`/events/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
