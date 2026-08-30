"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  emptyGivingForm,
  GivingForm,
} from "@/features/giving/components/giving-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewGivingPage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyGivingForm>) => {
      const response = await fetch("/api/v1/giving", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          givingTypeId: values.givingTypeId,
          amount: values.amount,
          paymentMethod: values.paymentMethod,
          memberId: values.memberId || null,
          serviceId: values.serviceId || null,
          transactionReference: values.transactionReference || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to record giving"));
      }
    },
    onSuccess: () => {
      toast("success", "Giving recorded.");
      router.push("/giving");
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/giving">Back to giving</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Record giving</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Record giving for this church. Member is optional for anonymous gifts.
        </p>
      </div>
      <GivingForm
        initial={emptyGivingForm()}
        pending={create.isPending}
        submitLabel="Record giving"
        onCancel={() => router.push("/giving")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
