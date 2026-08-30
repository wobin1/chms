"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  visitorFormFromRecord,
  VisitorForm,
  visitorFormPayload,
} from "@/features/visitors/components/visitor-form";
import { GENDER_LABELS, VISITOR_STATUS_LABELS } from "@/features/services/labels";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type Visitor = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  gender: keyof typeof GENDER_LABELS;
  address: string | null;
  howHeard: string | null;
  firstVisitDate: string | null;
  status: keyof typeof VISITOR_STATUS_LABELS;
  notes: string | null;
  convertedMemberId: string | null;
};

export default function EditVisitorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const visitor = useQuery({
    queryKey: ["visitors", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/visitors/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Visitor;
    },
  });

  const save = useMutation({
    mutationFn: async (values: ReturnType<typeof visitorFormFromRecord>) => {
      const response = await fetch(`/api/v1/visitors/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(visitorFormPayload(values)),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update visitor"));
      }
    },
    onSuccess: () => {
      toast("success", "Visitor updated.");
      void queryClient.invalidateQueries({ queryKey: ["visitors"] });
      router.push(`/visitors/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  const converted = Boolean(
    visitor.data?.status === "CONVERTED" || visitor.data?.convertedMemberId,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/visitors/${params.id}`}>Back to visitor</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit visitor</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update visitor details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={visitor.isLoading}
        isError={visitor.isError}
        errorLabel="This visitor was not found."
      >
        {visitor.data ? (
          <VisitorForm
            key={visitor.data.id}
            initial={visitorFormFromRecord(visitor.data)}
            pending={save.isPending}
            submitLabel="Save changes"
            statusDisabled={converted}
            onCancel={() => router.push(`/visitors/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
