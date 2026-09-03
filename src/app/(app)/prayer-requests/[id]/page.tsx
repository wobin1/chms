"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/back-link";
import {
  DetailField,
  EditPanel,
  ProfileHero,
  SectionCard,
  StatusBadge,
} from "@/components/detail/layout";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberPicker } from "@/components/member-picker";
import { PRAYER_STATUS_LABELS } from "@/features/care/labels";
import { Select } from "@/features/services/labels";
import type { PublicUser } from "@/lib/auth-types";
import { displayValue, readApiError } from "@/lib/ui";

type PrayerRequest = {
  id: string;
  title: string;
  description: string | null;
  status: keyof typeof PRAYER_STATUS_LABELS;
  memberId: string | null;
  member: {
    firstName: string;
    lastName: string;
    membershipNumber: string;
  } | null;
};

function memberLabel(member: {
  firstName: string;
  lastName: string;
  membershipNumber: string;
}) {
  return `${member.lastName}, ${member.firstName} (${member.membershipNumber})`;
}

export default function PrayerRequestPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
  const [status, setStatus] =
    useState<keyof typeof PRAYER_STATUS_LABELS>("OPEN");

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("prayer:manage") ?? false;

  const request = useQuery({
    queryKey: ["prayer-requests", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/prayer-requests/${params.id}`);
      if (!response.ok) throw new Error("not found");
      const data = (await response.json()) as PrayerRequest;
      setTitle(data.title);
      setDescription(data.description ?? "");
      setMemberId(data.memberId ?? "");
      setStatus(data.status);
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/prayer-requests/${params.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          memberId: memberId || null,
          status,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to update prayer request"),
        );
      }
    },
    onSuccess: () => {
      toast("success", "Prayer request updated.");
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["prayer-requests"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const data = request.data;

  function startEditing() {
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description ?? "");
    setMemberId(data.memberId ?? "");
    setStatus(data.status);
    setEditing(true);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/prayer-requests">Back to prayer requests</BackLink>
      <QueryState
        variant="detail"
        isLoading={request.isLoading}
        isError={request.isError}
        isFetching={request.isFetching && !request.isLoading}
        errorLabel="This prayer request was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={data.title}
              subtitle={
                data.member ? memberLabel(data.member) : "Anonymous request"
              }
              badges={
                <StatusBadge
                  active={data.status !== "CLOSED"}
                  activeLabel={PRAYER_STATUS_LABELS[data.status]}
                  inactiveLabel={PRAYER_STATUS_LABELS.CLOSED}
                />
              }
              actions={
                canManage && !editing ? (
                  <Button type="button" onClick={startEditing}>
                    Edit request
                  </Button>
                ) : undefined
              }
            />

            {editing && canManage ? (
              <EditPanel
                title="Edit prayer request"
                pending={save.isPending}
                onCancel={() => setEditing(false)}
                onSave={() => save.mutate()}
              >
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="memberId">Member</Label>
                    <MemberPicker
                      id="memberId"
                      value={memberId}
                      onChange={setMemberId}
                      emptyLabel="Anonymous"
                      placeholder="Search members"
                      selectedOptions={
                        data.member
                          ? [
                              {
                                id: data.memberId ?? "",
                                firstName: data.member.firstName,
                                lastName: data.member.lastName,
                                membershipNumber: data.member.membershipNumber,
                              },
                            ]
                          : []
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      id="status"
                      value={status}
                      onChange={(e) =>
                        setStatus(
                          e.target.value as keyof typeof PRAYER_STATUS_LABELS,
                        )
                      }
                    >
                      {Object.entries(PRAYER_STATUS_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    />
                  </div>
                </div>
              </EditPanel>
            ) : (
              <>
                <SectionCard title="Details">
                  <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <DetailField label="Title" value={data.title} />
                    <DetailField
                      label="Member"
                      value={
                        data.member ? memberLabel(data.member) : "Anonymous"
                      }
                    />
                    <DetailField
                      label="Status"
                      value={PRAYER_STATUS_LABELS[data.status]}
                    />
                  </dl>
                </SectionCard>
                <SectionCard title="Description">
                  {data.description ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                      {data.description}
                    </p>
                  ) : (
                    <p className="text-sm text-text-muted">
                      {displayValue(null)}
                    </p>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
