"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  pastoralFormFromRecord,
  PastoralForm,
  pastoralFormPayload,
} from "@/features/pastoral/components/pastoral-form";
import {
  PASTORAL_PRIORITY_LABELS,
  PASTORAL_STATUS_LABELS,
} from "@/features/care/labels";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type PastoralCase = {
  id: string;
  memberId: string;
  caseType: string;
  title: string;
  description: string | null;
  notes: string | null;
  priority: keyof typeof PASTORAL_PRIORITY_LABELS;
  status: keyof typeof PASTORAL_STATUS_LABELS;
  assignedToId: string | null;
};

export default function EditPastoralPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const pastoralCase = useQuery({
    queryKey: ["pastoral", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/pastoral/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as PastoralCase;
    },
  });

  const save = useMutation({
    mutationFn: async (values: ReturnType<typeof pastoralFormFromRecord>) => {
      const response = await fetch(`/api/v1/pastoral/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pastoralFormPayload(values)),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to update pastoral case"),
        );
      }
    },
    onSuccess: () => {
      toast("success", "Pastoral case updated.");
      void queryClient.invalidateQueries({ queryKey: ["pastoral"] });
      router.push(`/pastoral/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/pastoral/${params.id}`}>Back to pastoral case</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit pastoral case</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update case details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={pastoralCase.isLoading}
        isError={pastoralCase.isError}
        errorLabel="This pastoral case was not found."
      >
        {pastoralCase.data ? (
          <PastoralForm
            key={pastoralCase.data.id}
            initial={pastoralFormFromRecord(pastoralCase.data)}
            pending={save.isPending}
            submitLabel="Save changes"
            onCancel={() => router.push(`/pastoral/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
