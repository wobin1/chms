"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  SermonForm,
  sermonFormFromRecord,
  sermonFormPayload,
} from "@/features/sermons/components/sermon-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type Sermon = {
  id: string;
  title: string;
  preacher: string;
  scripture: string | null;
  summary: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  service: { id: string; name: string; serviceDate: string };
};

export default function EditSermonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const sermon = useQuery({
    queryKey: ["sermons", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/sermons/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Sermon;
    },
  });

  const save = useMutation({
    mutationFn: async (values: ReturnType<typeof sermonFormFromRecord>) => {
      const response = await fetch(`/api/v1/sermons/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sermonFormPayload(values)),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update sermon"));
      }
    },
    onSuccess: () => {
      toast("success", "Sermon updated.");
      void queryClient.invalidateQueries({ queryKey: ["sermons"] });
      router.push(`/sermons/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/sermons/${params.id}`}>Back to sermon</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit sermon</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update sermon details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={sermon.isLoading}
        isError={sermon.isError}
        errorLabel="This sermon was not found."
      >
        {sermon.data ? (
          <SermonForm
            key={sermon.data.id}
            initial={sermonFormFromRecord(sermon.data)}
            pending={save.isPending}
            submitLabel="Save changes"
            onCancel={() => router.push(`/sermons/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
