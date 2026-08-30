"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import {
  userFormFromRecord,
  UserForm,
  type UserFormValues,
} from "@/features/users/components/user-form";
import { useToast } from "@/components/toast";
import { readApiError } from "@/lib/ui";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  memberId: string | null;
  userRoles: { role: { name: string } }[];
};

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const user = useQuery({
    queryKey: ["users", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/users/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as UserDetail;
    },
  });

  const save = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const response = await fetch(`/api/v1/users/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          roleName: values.roleName,
          memberId: values.memberId || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update user"));
      }
    },
    onSuccess: () => {
      toast("success", "User updated.");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push(`/admin/users/${params.id}`);
    },
    onError: (err) => toast("error", err.message),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href={`/admin/users/${params.id}`}>Back to user</BackLink>
      <div>
        <h1 className="text-2xl font-bold text-text">Edit user</h1>
        <p className="mt-1 text-sm leading-normal text-text-muted">
          Update user details for this church.
        </p>
      </div>
      <QueryState
        variant="form"
        isLoading={user.isLoading}
        isError={user.isError}
        errorLabel="This user was not found."
      >
        {user.data ? (
          <UserForm
            mode="edit"
            key={user.data.id}
            initial={{ ...userFormFromRecord(user.data), password: "" }}
            pending={save.isPending}
            submitLabel="Save changes"
            onCancel={() => router.push(`/admin/users/${params.id}`)}
            onSubmit={(values) => save.mutate(values)}
          />
        ) : null}
      </QueryState>
    </div>
  );
}
