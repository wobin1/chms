"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/back-link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type Church = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  status: "ACTIVE" | "SUSPENDED";
  notes: string | null;
};

export default function ChurchDetailPage() {
  const params = useParams<{ id: string }>();
  const church = useQuery({
    queryKey: ["churches", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/churches/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Church;
    },
  });

  return (
    <div className="max-w-xl space-y-6">
      <BackLink href="/platform/churches">Back to churches</BackLink>
      <h1 className="text-2xl font-bold text-text">Church</h1>
      <QueryState
        variant="detail"
        isLoading={church.isLoading}
        isError={church.isError}
        isFetching={church.isFetching && !church.isLoading}
      >
        {church.data ? <ChurchEditForm church={church.data} /> : null}
      </QueryState>
    </div>
  );
}

function ChurchEditForm({ church }: { church: Church }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(church.name);
  const [slug, setSlug] = useState(church.slug);
  const [city, setCity] = useState(church.city ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/churches/${church.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug, city: city || null }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save"));
      }
    },
    onSuccess: () => {
      toast("success", "Church updated.");
      void queryClient.invalidateQueries({ queryKey: ["churches"] });
      router.push("/platform/churches");
    },
    onError: (err) => {
      setError(err.message);
      toast("error", err.message);
    },
  });

  const setStatus = useMutation({
    mutationFn: async (action: "suspend" | "reactivate") => {
      const response = await fetch(`/api/v1/churches/${church.id}/${action}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update status"));
      }
    },
    onSuccess: (_data, action) => {
      toast(
        "success",
        action === "suspend" ? "Church suspended." : "Church reactivated.",
      );
      setConfirmSuspend(false);
      void queryClient.invalidateQueries({ queryKey: ["churches", church.id] });
      void queryClient.invalidateQueries({ queryKey: ["churches"] });
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <>
      <form
        className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        aria-busy={save.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <p className="text-sm text-text-muted">
          Status: {church.status === "SUSPENDED" ? "Suspended" : "Active"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={save.isPending} disabled={save.isPending}>
            Save changes
          </Button>
          {church.status === "ACTIVE" ? (
            <Button
              type="button"
              variant="danger"
              disabled={setStatus.isPending}
              onClick={() => setConfirmSuspend(true)}
            >
              Suspend
            </Button>
          ) : (
            <Button
              type="button"
              loading={setStatus.isPending}
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate("reactivate")}
            >
              Reactivate
            </Button>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={confirmSuspend}
        title="Suspend this church?"
        description={`${church.name} users will not be able to sign in until it is reactivated.`}
        confirmLabel="Suspend"
        danger
        pending={setStatus.isPending}
        onCancel={() => setConfirmSuspend(false)}
        onConfirm={() => setStatus.mutate("suspend")}
      />
    </>
  );
}
