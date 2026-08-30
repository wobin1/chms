"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/ui";

type RoleDetail = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
};

type PermissionItem = { name: string };

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const role = useQuery({
    queryKey: ["roles", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/roles/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as RoleDetail;
    },
  });
  const catalog = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const response = await fetch("/api/v1/permissions");
      if (!response.ok) return { items: [] as PermissionItem[] };
      return (await response.json()) as { items: PermissionItem[] };
    },
  });

  useEffect(() => {
    if (role.data) setSelected(role.data.permissions);
  }, [role.data]);

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/roles/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions: selected }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save permissions"));
      }
    },
    onSuccess: () => {
      toast("success", "Permissions updated for this church.");
      void queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err) => toast("error", err.message),
  });

  function toggle(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/admin/roles">Back to roles</BackLink>
      <h1 className="text-2xl font-bold text-text">
        {role.data?.name ?? "Role"}
      </h1>
      <QueryState
        variant="detail"
        isLoading={role.isLoading}
        isError={role.isError}
        isFetching={role.isFetching && !role.isLoading}
        errorLabel="This role was not found."
      >
        {role.data ? (
          <form
            className="max-w-xl space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            {role.data.description ? (
              <p className="text-sm text-text-muted">{role.data.description}</p>
            ) : null}
            <fieldset>
              <legend className="mb-3 text-sm font-medium text-text">
                Permissions for this church
              </legend>
              <ul className="space-y-2">
                {(catalog.data?.items ?? []).map((permission) => (
                  <li key={permission.name}>
                    <label className="flex items-center gap-3 text-sm text-text">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border text-accent"
                        checked={selected.includes(permission.name)}
                        onChange={() => toggle(permission.name)}
                      />
                      {permission.name}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <Button type="submit" loading={save.isPending} disabled={save.isPending}>
              Save permissions
            </Button>
          </form>
        ) : null}
      </QueryState>
    </div>
  );
}
