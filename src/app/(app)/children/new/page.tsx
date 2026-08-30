"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  ChildForm,
  childCreatePayload,
  emptyChildForm,
} from "@/features/children/components/child-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewChildPage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyChildForm>) => {
      const response = await fetch("/api/v1/children", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(childCreatePayload(values)),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to register child"));
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast("success", "Child registered.");
      router.push(`/children/${data.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/children">Back to children</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Add child</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Register a child on a family of this church. More than one guardian can be set.
        </p>
      </div>
      <ChildForm
        mode="create"
        initial={emptyChildForm()}
        pending={create.isPending}
        submitLabel="Create child"
        onCancel={() => router.push("/children")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
