"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  emptyServiceForm,
  ServiceForm,
  serviceFormPayload,
} from "@/features/services/components/service-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewServicePage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyServiceForm>) => {
      const response = await fetch("/api/v1/services", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(serviceFormPayload(values)),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create service"));
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast("success", "Service added.");
      router.push(`/services/${data.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/services">Back to services</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Add service</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Add a service for this church, then enter attendance counts.
        </p>
      </div>
      <ServiceForm
        initial={emptyServiceForm()}
        pending={create.isPending}
        submitLabel="Create service"
        onCancel={() => router.push("/services")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
