"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/back-link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Chip,
  DetailField,
  ProfileHero,
  SectionCard,
  StatusBadge,
} from "@/components/detail/layout";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { readApiError } from "@/lib/ui";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  memberId: string | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    membershipNumber: string;
  } | null;
  userRoles: { role: { name: string } }[];
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmDisable, setConfirmDisable] = useState(false);

  const user = useQuery({
    queryKey: ["users", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/users/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as UserDetail;
    },
  });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch(`/api/v1/users/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to update user"));
      }
    },
    onSuccess: () => {
      toast("success", "User updated.");
      setConfirmDisable(false);
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const data = user.data;
  const roleNames =
    data?.userRoles.map((item) => item.role.name).join(", ") ?? "—";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/admin/users">Back to users</BackLink>
      <QueryState
        variant="detail"
        isLoading={user.isLoading}
        isError={user.isError}
        isFetching={user.isFetching && !user.isLoading}
        errorLabel="This user was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={data.name}
              subtitle={data.email}
              badges={
                <>
                  <StatusBadge
                    active={data.status === "ACTIVE"}
                    activeLabel="Active"
                    inactiveLabel="Disabled"
                  />
                  <Chip>{roleNames}</Chip>
                </>
              }
              actions={
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/users/${data.id}/edit`}>
                    <Button>Edit user</Button>
                  </Link>
                  {data.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setConfirmDisable(true)}
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={save.isPending}
                      onClick={() => save.mutate({ status: "ACTIVE" })}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              }
            />

            <SectionCard title="Account details">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="Name" value={data.name} />
                <DetailField label="Email" value={data.email} />
                <DetailField label="Role" value={roleNames} />
                <DetailField
                  label="Status"
                  value={data.status === "ACTIVE" ? "Active" : "Disabled"}
                />
                <DetailField
                  label="Linked member"
                  value={
                    data.member
                      ? `${data.member.lastName}, ${data.member.firstName} (${data.member.membershipNumber})`
                      : "Not linked"
                  }
                />
              </dl>
            </SectionCard>

            {data.member ? (
              <SectionCard title="Member link">
                <p className="text-sm text-text">
                  <Link
                    href={`/members/${data.member.id}`}
                    className="font-medium text-accent"
                  >
                    {data.member.lastName}, {data.member.firstName} (
                    {data.member.membershipNumber})
                  </Link>
                </p>
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </QueryState>
      <ConfirmDialog
        open={confirmDisable}
        title="Disable this user?"
        description="They will not be able to sign in until you reactivate the account."
        confirmLabel="Disable"
        danger
        pending={save.isPending}
        onCancel={() => setConfirmDisable(false)}
        onConfirm={() => save.mutate({ status: "DISABLED" })}
      />
    </div>
  );
}
