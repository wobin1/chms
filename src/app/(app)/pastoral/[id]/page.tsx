"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BackLink } from "@/components/back-link";
import {
  Chip,
  DetailField,
  ProfileHero,
  SectionCard,
  StatusBadge,
} from "@/components/detail/layout";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import {
  PASTORAL_PRIORITY_LABELS,
  PASTORAL_STATUS_LABELS,
} from "@/features/care/labels";
import type { PublicUser } from "@/lib/auth-types";
import { displayValue } from "@/lib/ui";

type PastoralCase = {
  id: string;
  caseType: string;
  title: string;
  description: string | null;
  notes: string | null;
  priority: keyof typeof PASTORAL_PRIORITY_LABELS;
  status: keyof typeof PASTORAL_STATUS_LABELS;
  assignedTo: { name: string } | null;
  member: {
    firstName: string;
    lastName: string;
    membershipNumber: string;
    zone: { name: string } | null;
  };
};

function memberLabel(member: {
  firstName: string;
  lastName: string;
  membershipNumber: string;
}) {
  return `${member.lastName}, ${member.firstName} (${member.membershipNumber})`;
}

export default function PastoralCasePage() {
  const params = useParams<{ id: string }>();

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("pastoral:manage") ?? false;

  const pastoralCase = useQuery({
    queryKey: ["pastoral", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/pastoral/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as PastoralCase;
    },
  });

  const data = pastoralCase.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/pastoral">Back to pastoral cases</BackLink>
      <QueryState
        variant="detail"
        isLoading={pastoralCase.isLoading}
        isError={pastoralCase.isError}
        isFetching={pastoralCase.isFetching && !pastoralCase.isLoading}
        errorLabel="This pastoral case was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={data.title}
              subtitle={memberLabel(data.member)}
              badges={
                <>
                  <StatusBadge
                    active={data.status !== "CLOSED"}
                    activeLabel={PASTORAL_STATUS_LABELS[data.status]}
                    inactiveLabel={PASTORAL_STATUS_LABELS.CLOSED}
                  />
                  <Chip>{data.caseType}</Chip>
                  <Chip>{PASTORAL_PRIORITY_LABELS[data.priority]}</Chip>
                  {data.member.zone ? (
                    <Chip>{data.member.zone.name}</Chip>
                  ) : null}
                </>
              }
              actions={
                canManage ? (
                  <Link href={`/pastoral/${data.id}/edit`}>
                    <Button>Edit case</Button>
                  </Link>
                ) : undefined
              }
            />

            <SectionCard title="Case details">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="Member" value={memberLabel(data.member)} />
                <DetailField label="Case type" value={data.caseType} />
                <DetailField label="Title" value={data.title} />
                <DetailField
                  label="Priority"
                  value={PASTORAL_PRIORITY_LABELS[data.priority]}
                />
                <DetailField
                  label="Status"
                  value={PASTORAL_STATUS_LABELS[data.status]}
                />
                <DetailField
                  label="Assigned to"
                  value={displayValue(data.assignedTo?.name)}
                />
                <DetailField
                  label="Zone"
                  value={displayValue(data.member.zone?.name)}
                />
              </dl>
            </SectionCard>

            {data.description ? (
              <SectionCard title="Description">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {data.description}
                </p>
              </SectionCard>
            ) : null}

            {data.notes ? (
              <SectionCard title="Notes">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {data.notes}
                </p>
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
