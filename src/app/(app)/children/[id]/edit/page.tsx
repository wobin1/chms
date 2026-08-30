"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  childEditPayload,
  childFormFromRecord,
  ChildForm,
  emptyChildForm,
} from "@/features/children/components/child-form";
import { GENDER_LABELS } from "@/features/services/labels";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type Child = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: keyof typeof GENDER_LABELS;
  dateOfBirth: string | null;
  school: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
};

export default function EditChildPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const child = useQuery({
    queryKey: ["children", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/children/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Child;
    },
  });

  const save = useMutation({
    mutationFn: async (values: ReturnType<typeof childFormFromRecord>) => {
      const response = await fetch(`/api/v1/children/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(childEditPayload(values)),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update child"));
      }
    },
    onSuccess: () => {
      toast("success", "Child updated.");
      void queryClient.invalidateQueries({ queryKey: ["children"] });
      router.push(`/children/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/children/${params.id}`}>Back to child</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit child</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update child details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={child.isLoading}
        isError={child.isError}
        errorLabel="This child was not found."
      >
        {child.data ? (
          <ChildForm
            mode="edit"
            key={child.data.id}
            initial={{ ...emptyChildForm(), ...childFormFromRecord(child.data) }}
            pending={save.isPending}
            submitLabel="Save changes"
            onCancel={() => router.push(`/children/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
