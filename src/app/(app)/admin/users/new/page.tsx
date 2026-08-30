"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  emptyUserForm,
  UserForm,
} from "@/features/users/components/user-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

export default function NewUserPage() {
  const router = useRouter();
  const toast = useToast();

  const create = useMutation({
    mutationFn: async (values: ReturnType<typeof emptyUserForm>) => {
      const response = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          roleName: values.roleName,
          memberId: values.memberId || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to create user"));
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (data) => {
      toast("success", "User created.");
      router.push(`/admin/users/${data.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/admin/users">Back to users</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Add user</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Add a user for this church and assign a role.
        </p>
      </div>
      <UserForm
        mode="create"
        initial={emptyUserForm()}
        pending={create.isPending}
        submitLabel="Create user"
        onCancel={() => router.push("/admin/users")}
        onSubmit={(values) => create.mutate(values)}
      />
    </div>
  );
}
