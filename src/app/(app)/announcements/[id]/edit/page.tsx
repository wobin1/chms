"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  announcementFormFromRecord,
  AnnouncementForm,
} from "@/features/announcements/components/announcement-form";
import { ANNOUNCEMENT_STATUS_LABELS } from "@/features/content/labels";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type Announcement = {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  status: keyof typeof ANNOUNCEMENT_STATUS_LABELS;
};

export default function EditAnnouncementPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const announcement = useQuery({
    queryKey: ["announcements", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/announcements/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Announcement;
    },
  });

  const save = useMutation({
    mutationFn: async (values: ReturnType<typeof announcementFormFromRecord>) => {
      const response = await fetch(`/api/v1/announcements/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to update announcement"),
        );
      }
    },
    onSuccess: () => {
      toast("success", "Announcement updated.");
      void queryClient.invalidateQueries({ queryKey: ["announcements"] });
      router.push(`/announcements/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/announcements/${params.id}`}>Back to announcement</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit announcement</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update announcement details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={announcement.isLoading}
        isError={announcement.isError}
        errorLabel="This announcement was not found."
      >
        {announcement.data ? (
          <AnnouncementForm
            key={announcement.data.id}
            initial={announcementFormFromRecord(announcement.data)}
            pending={save.isPending}
            submitLabel="Save changes"
            onCancel={() => router.push(`/announcements/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
