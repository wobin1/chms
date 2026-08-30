"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  emptySermonForm,
  SermonForm,
  sermonFormPayload,
} from "@/features/sermons/components/sermon-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewSermonPage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptySermonForm>) => {
      const response = await fetch("/api/v1/sermons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sermonFormPayload(values)),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to add sermon"));
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast("success", "Sermon added.");
      router.push(`/sermons/${data.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/sermons">Back to sermons</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Add sermon</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Add a sermon on a service of this church. Media links are optional.
        </p>
      </div>
      <SermonForm
        initial={emptySermonForm()}
        pending={create.isPending}
        submitLabel="Create sermon"
        onCancel={() => router.push("/sermons")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
