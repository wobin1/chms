"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/back-link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FOLLOW_UP_LABELS,
  GENDER_LABELS,
  Select,
  VISITOR_STATUS_LABELS,
} from "@/features/services/labels";
import type { PublicUser } from "@/lib/auth-types";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { displayValue, formatDisplayDate, readApiError } from "@/lib/ui";

type NamedLookup = { id: string; name: string };
type ServiceOption = {
  id: string;
  name: string;
  serviceDate: string;
};
type VisitorVisit = {
  id: string;
  visitDate: string;
  followUpStatus: keyof typeof FOLLOW_UP_LABELS;
  notes: string | null;
  service: { id: string; name: string; serviceDate: string };
};
type VisitorDetail = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  gender: keyof typeof GENDER_LABELS;
  address: string | null;
  howHeard: string | null;
  firstVisitDate: string | null;
  status: keyof typeof VISITOR_STATUS_LABELS;
  notes: string | null;
  convertedMemberId: string | null;
  convertedMember: {
    id: string;
    membershipNumber: string;
    firstName: string;
    lastName: string;
  } | null;
  visits: VisitorVisit[];
};

export default function VisitorDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [membershipStatusId, setMembershipStatusId] = useState("");
  const [zoneId, setZoneId] = useState("");

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canManage = me.data?.permissions.includes("visitors:manage") ?? false;
  const canConvert =
    canManage && (me.data?.permissions.includes("members:manage") ?? false);

  const visitor = useQuery({
    queryKey: ["visitors", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/visitors/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as VisitorDetail;
    },
  });
  const services = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/services?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as ServiceOption[] };
      return (await response.json()) as { items: ServiceOption[] };
    },
    enabled: canManage,
  });
  const statuses = useQuery({
    queryKey: ["membership-statuses"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/membership-statuses?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as NamedLookup[] };
      return (await response.json()) as { items: NamedLookup[] };
    },
    enabled: canConvert,
  });
  const zones = useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/zones?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as NamedLookup[] };
      return (await response.json()) as { items: NamedLookup[] };
    },
    enabled: canConvert,
  });

  const addVisit = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/visitors/${params.id}/visits`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to add visit"));
      }
    },
    onSuccess: () => {
      setServiceId("");
      toast("success", "Visit linked to this church's service.");
      void queryClient.invalidateQueries({ queryKey: ["visitors", params.id] });
      void queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const convert = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v1/visitors/${params.id}/convert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          membershipNumber,
          membershipStatusId,
          zoneId: zoneId || null,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await readApiError(response, "Unable to convert visitor"),
        );
      }
    },
    onSuccess: () => {
      toast("success", "Visitor converted to a member of this church.");
      void queryClient.invalidateQueries({ queryKey: ["visitors"] });
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err) => toast("error", err.message),
  });

  const data = visitor.data;
  const converted = Boolean(
    data?.status === "CONVERTED" || data?.convertedMemberId,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink href="/visitors">Back to visitors</BackLink>
      <QueryState
        variant="detail"
        isLoading={visitor.isLoading}
        isError={visitor.isError}
        isFetching={visitor.isFetching && !visitor.isLoading}
        errorLabel="This visitor was not found."
      >
        {data ? (
          <div className="space-y-6">
            <ProfileHero
              title={`${data.lastName}, ${data.firstName}`}
              subtitle={displayValue(data.phone ?? undefined)}
              badges={
                <>
                  <StatusBadge
                    active={data.status !== "CLOSED"}
                    activeLabel={VISITOR_STATUS_LABELS[data.status]}
                    inactiveLabel={VISITOR_STATUS_LABELS.CLOSED}
                  />
                  <Chip>{GENDER_LABELS[data.gender]}</Chip>
                  {data.firstVisitDate ? (
                    <Chip>First visit {formatDisplayDate(data.firstVisitDate)}</Chip>
                  ) : null}
                </>
              }
              actions={
                canManage ? (
                  <Link href={`/visitors/${data.id}/edit`}>
                    <Button>Edit visitor</Button>
                  </Link>
                ) : undefined
              }
            />

            <SectionCard title="Contact and details">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="First name" value={data.firstName} />
                <DetailField label="Last name" value={data.lastName} />
                <DetailField label="Phone" value={displayValue(data.phone)} />
                <DetailField label="Email" value={displayValue(data.email)} />
                <DetailField label="Gender" value={GENDER_LABELS[data.gender]} />
                <DetailField
                  label="Status"
                  value={VISITOR_STATUS_LABELS[data.status]}
                />
                <DetailField
                  label="First visit"
                  value={formatDisplayDate(data.firstVisitDate)}
                />
                <DetailField
                  label="How they heard"
                  value={displayValue(data.howHeard)}
                />
                <DetailField
                  label="Address"
                  value={displayValue(data.address)}
                />
              </dl>
            </SectionCard>

            {data.notes ? (
              <SectionCard title="Notes">
                <p className="text-sm leading-relaxed text-text">{data.notes}</p>
              </SectionCard>
            ) : null}

            <SectionCard
              title="Visits"
              description="Link each visit to a service of this church."
            >
              {canManage ? (
                <form
                  className="mb-4 flex flex-wrap items-end gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addVisit.mutate();
                  }}
                >
                  <div className="min-w-56 flex-1">
                    <Label htmlFor="serviceId">Service</Label>
                    <Select
                      id="serviceId"
                      value={serviceId}
                      onChange={(event) => setServiceId(event.target.value)}
                      required
                    >
                      <option value="">Select a service</option>
                      {(services.data?.items ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({formatDisplayDate(item.serviceDate)})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button type="submit" loading={addVisit.isPending} disabled={addVisit.isPending || !serviceId}>
                      Add visit
                    </Button>
                </form>
              ) : null}
              {data.visits.length === 0 ? (
                <p className="text-sm text-text-muted">No visits recorded yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.visits.map((visit) => (
                    <li
                      key={visit.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <Link
                        href={`/services/${visit.service.id}`}
                        className="font-medium text-accent"
                      >
                        {visit.service.name}
                      </Link>
                      <span className="text-text-muted">
                        {formatDisplayDate(visit.visitDate)} ·{" "}
                        {FOLLOW_UP_LABELS[visit.followUpStatus]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Convert to member">
              {converted && data.convertedMember ? (
                <p className="text-sm text-text">
                  This visitor is now a member of this church:{" "}
                  <Link
                    href={`/members/${data.convertedMember.id}`}
                    className="font-medium text-accent"
                  >
                    {data.convertedMember.lastName},{" "}
                    {data.convertedMember.firstName} (
                    {data.convertedMember.membershipNumber})
                  </Link>
                </p>
              ) : canConvert ? (
                <form
                  className="grid gap-3 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    convert.mutate();
                  }}
                >
                  <div className="sm:col-span-2">
                    <p className="text-sm text-text-muted">
                      Creates a member in this church only. Assign a zone if the
                      person already belongs to one.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="membershipNumber">Membership number</Label>
                    <Input
                      id="membershipNumber"
                      value={membershipNumber}
                      onChange={(event) =>
                        setMembershipNumber(event.target.value)
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="membershipStatusId">Membership status</Label>
                    <Select
                      id="membershipStatusId"
                      value={membershipStatusId}
                      onChange={(event) =>
                        setMembershipStatusId(event.target.value)
                      }
                      required
                    >
                      <option value="">Select status</option>
                      {(statuses.data?.items ?? []).map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="zoneId">Zone</Label>
                    <Select
                      id="zoneId"
                      value={zoneId}
                      onChange={(event) => setZoneId(event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {(zones.data?.items ?? []).map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Button
                      type="submit"
                      loading={convert.isPending}
                      disabled={convert.isPending || !membershipStatusId}
                    >
                      Convert to member
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-text-muted">
                  You need permission to manage visitors and members to convert.
                </p>
              )}
            </SectionCard>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
