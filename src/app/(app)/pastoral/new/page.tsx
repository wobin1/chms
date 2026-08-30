"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  emptyPastoralForm,
  PastoralForm,
  pastoralFormPayload,
} from "@/features/pastoral/components/pastoral-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewPastoralPage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyPastoralForm>) => {
      const response = await fetch("/api/v1/pastoral", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pastoralFormPayload(values)),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to open pastoral case"),
        );
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast("success", "Pastoral case opened.");
      router.push(`/pastoral/${data.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/pastoral">Back to pastoral care</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Open pastoral case</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Open a case on a member of this church. Notes stay restricted.
        </p>
      </div>
      <PastoralForm
        initial={emptyPastoralForm()}
        pending={create.isPending}
        submitLabel="Open case"
        onCancel={() => router.push("/pastoral")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
