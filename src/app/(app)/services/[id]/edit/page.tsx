"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  serviceFormFromRecord,
  ServiceForm,
  serviceFormPayload,
} from "@/features/services/components/service-form";
import { SERVICE_STATUS_LABELS } from "@/features/services/labels";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type ServiceDetail = {
  id: string;
  name: string;
  serviceDate: string;
  theme: string | null;
  scripture: string | null;
  preacher: string | null;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  status: keyof typeof SERVICE_STATUS_LABELS;
  serviceTypeId: string;
};

export default function EditServicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const service = useQuery({
    queryKey: ["services", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/services/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as ServiceDetail;
    },
  });

  const save = useMutation({
    mutationFn: async (values: ReturnType<typeof serviceFormFromRecord>) => {
      const response = await fetch(`/api/v1/services/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(serviceFormPayload(values)),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update service"));
      }
    },
    onSuccess: () => {
      toast("success", "Service updated.");
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      router.push(`/services/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/services/${params.id}`}>Back to service</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit service</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update service details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={service.isLoading}
        isError={service.isError}
        errorLabel="This service was not found."
      >
        {service.data ? (
          <ServiceForm
            key={service.data.id}
            initial={serviceFormFromRecord(service.data)}
            pending={save.isPending}
            submitLabel="Save changes"
            onCancel={() => router.push(`/services/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
