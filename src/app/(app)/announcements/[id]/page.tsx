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
import { ANNOUNCEMENT_STATUS_LABELS } from "@/features/content/labels";
import type { PublicUser } from "@/lib/auth-types";
import { formatDisplayDate } from "@/lib/ui";

type Announcement = {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  status: keyof typeof ANNOUNCEMENT_STATUS_LABELS;
  createdBy: { name: string };
};

export default function AnnouncementDetailPage() {
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
  const canManage =
    me.data?.permissions.includes("announcements:manage") ?? false;

  const announcement = useQuery({
    queryKey: ["announcements", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/announcements/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Announcement;
    },
  });

  const data = announcement.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/announcements">Back to announcements</BackLink>
      <QueryState
        variant="detail"
        isLoading={announcement.isLoading}
        isError={announcement.isError}
        isFetching={announcement.isFetching && !announcement.isLoading}
        errorLabel="This announcement was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={data.title}
              subtitle={`Posted by ${data.createdBy.name}`}
              badges={
                <>
                  <StatusBadge
                    active={data.status === "PUBLISHED"}
                    activeLabel={ANNOUNCEMENT_STATUS_LABELS[data.status]}
                    inactiveLabel={ANNOUNCEMENT_STATUS_LABELS[data.status]}
                  />
                  <Chip>
                    {formatDisplayDate(data.startDate)} –{" "}
                    {formatDisplayDate(data.endDate)}
                  </Chip>
                </>
              }
              actions={
                canManage ? (
                  <Link href={`/announcements/${data.id}/edit`}>
                    <Button>Edit announcement</Button>
                  </Link>
                ) : undefined
              }
            />

            <SectionCard title="Details">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="Title" value={data.title} />
                <DetailField
                  label="Status"
                  value={ANNOUNCEMENT_STATUS_LABELS[data.status]}
                />
                <DetailField
                  label="Start date"
                  value={formatDisplayDate(data.startDate)}
                />
                <DetailField
                  label="End date"
                  value={formatDisplayDate(data.endDate)}
                />
                <DetailField label="Posted by" value={data.createdBy.name} />
              </dl>
            </SectionCard>

            <SectionCard title="Content">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                {data.content}
              </p>
            </SectionCard>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
