"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  AnnouncementForm,
  emptyAnnouncementForm,
} from "@/features/announcements/components/announcement-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyAnnouncementForm>) => {
      const response = await fetch("/api/v1/announcements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to create announcement"),
        );
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast("success", "Announcement added.");
      router.push(`/announcements/${data.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/announcements">Back to announcements</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Add announcement</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Post an announcement with a start and end date for this church.
        </p>
      </div>
      <AnnouncementForm
        initial={emptyAnnouncementForm()}
        pending={create.isPending}
        submitLabel="Create announcement"
        onCancel={() => router.push("/announcements")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
