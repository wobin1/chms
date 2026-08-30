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
} from "@/components/detail/layout";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import type { PublicUser } from "@/lib/auth-types";
import { displayValue, formatDisplayDate } from "@/lib/ui";

type Sermon = {
  id: string;
  title: string;
  preacher: string;
  scripture: string | null;
  summary: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  service: { id: string; name: string; serviceDate: string };
};

export default function SermonDetailPage() {
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
  const canManage = me.data?.permissions.includes("sermons:manage") ?? false;

  const sermon = useQuery({
    queryKey: ["sermons", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/sermons/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Sermon;
    },
  });

  const data = sermon.data;
  const media = [
    data?.audioUrl ? "Audio" : null,
    data?.videoUrl ? "Video" : null,
    data?.documentUrl ? "Document" : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/sermons">Back to sermons</BackLink>
      <QueryState
        variant="detail"
        isLoading={sermon.isLoading}
        isError={sermon.isError}
        isFetching={sermon.isFetching && !sermon.isLoading}
        errorLabel="This sermon was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={data.title}
              subtitle={data.preacher}
              badges={
                <>
                  <Chip>
                    <Link href={`/services/${data.service.id}`} className="text-accent">
                      {data.service.name}
                    </Link>
                    {" · "}
                    {formatDisplayDate(data.service.serviceDate)}
                  </Chip>
                  {data.scripture ? <Chip>{data.scripture}</Chip> : null}
                  {media.length > 0 ? <Chip>{media.join(", ")}</Chip> : null}
                </>
              }
              actions={
                canManage ? (
                  <Link href={`/sermons/${data.id}/edit`}>
                    <Button>Edit sermon</Button>
                  </Link>
                ) : undefined
              }
            />

            <SectionCard title="Details">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="Title" value={data.title} />
                <DetailField label="Preacher" value={data.preacher} />
                <DetailField
                  label="Scripture"
                  value={displayValue(data.scripture)}
                />
                <DetailField label="Service" value={data.service.name} />
                <DetailField
                  label="Service date"
                  value={formatDisplayDate(data.service.serviceDate)}
                />
              </dl>
            </SectionCard>

            {data.summary ? (
              <SectionCard title="Summary">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                  {data.summary}
                </p>
              </SectionCard>
            ) : null}

            {(data.audioUrl || data.videoUrl || data.documentUrl) ? (
              <SectionCard title="Media">
                <dl className="space-y-4">
                  {data.audioUrl ? (
                    <div className="space-y-1.5">
                      <dt className="text-xs text-text-muted">Audio</dt>
                      <dd>
                        <a
                          href={data.audioUrl}
                          className="text-sm font-medium text-accent"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {data.audioUrl}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {data.videoUrl ? (
                    <div className="space-y-1.5">
                      <dt className="text-xs text-text-muted">Video</dt>
                      <dd>
                        <a
                          href={data.videoUrl}
                          className="text-sm font-medium text-accent"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {data.videoUrl}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {data.documentUrl ? (
                    <div className="space-y-1.5">
                      <dt className="text-xs text-text-muted">Document</dt>
                      <dd>
                        <a
                          href={data.documentUrl}
                          className="text-sm font-medium text-accent"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {data.documentUrl}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
