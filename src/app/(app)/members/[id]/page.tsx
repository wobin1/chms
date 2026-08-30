"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { BackLink } from "@/components/back-link";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { displayValue, formatDisplayDate } from "@/lib/ui";
import type { PublicUser } from "@/lib/auth-types";

type Member = {
  id: string;
  membershipNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  gender: string;
  dateOfBirth: string | null;
  dateJoined: string | null;
  notes: string | null;
  photoUrl: string | null;
  deletedAt: string | null;
  zone: { name: string } | null;
  membershipStatus: { name: string };
  familyMembers: { family: { id: string; name: string } }[];
  departments: { department: { id: string; name: string } }[];
  ministries: { ministry: { id: string; name: string } }[];
};

function genderLabel(gender: string) {
  if (gender === "FEMALE") return "Female";
  if (gender === "MALE") return "Male";
  if (gender === "OTHER") return "Other";
  return "—";
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text">{value}</dd>
    </div>
  );
}

export default function MemberProfilePage() {
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
  const member = useQuery({
    queryKey: ["members", params.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/members/${params.id}`);
      if (!response.ok) throw new Error("not found");
      return (await response.json()) as Member;
    },
  });

  const canManage = me.data?.permissions.includes("members:manage") ?? false;
  const data = member.data;
  const fullName = data
    ? [data.firstName, data.middleName, data.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <div className="space-y-6">
      <BackLink href="/members">Back to members</BackLink>
      <QueryState
        variant="detail"
        isLoading={member.isLoading}
        isError={member.isError}
        isFetching={member.isFetching && !member.isLoading}
        errorLabel="This member was not found."
      >
        {data ? (
          <div className="space-y-6">
            <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.photoUrl}
                      alt=""
                      className="h-24 w-24 rounded-xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div
                      className="flex h-24 w-24 items-center justify-center rounded-xl bg-accent-soft text-xl font-semibold text-accent"
                      aria-hidden
                    >
                      {initials(data.firstName, data.lastName)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-text">{fullName}</h1>
                    <p className="mt-1 text-sm text-text-muted">
                      {data.membershipNumber}
                      {data.zone?.name ? ` · ${data.zone.name}` : " · Unassigned"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                        {data.membershipStatus.name}
                      </span>
                      {data.departments?.map((row) => (
                        <span
                          key={row.department.id}
                          className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border"
                        >
                          {row.department.name}
                        </span>
                      ))}
                      {data.ministries?.map((row) => (
                        <span
                          key={row.ministry.id}
                          className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border"
                        >
                          {row.ministry.name}
                        </span>
                      ))}
                      {data.deletedAt ? (
                        <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">
                          Deactivated
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {canManage ? (
                  <Link href={`/members/${params.id}/edit`}>
                    <Button>Edit member</Button>
                  </Link>
                ) : null}
              </div>
            </article>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Contact
                </h2>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
                    <div>
                      <p className="text-xs text-text-muted">Phone</p>
                      {data.phone ? (
                        <a href={`tel:${data.phone}`} className="text-text hover:text-accent">
                          {data.phone}
                        </a>
                      ) : (
                        <p className="text-text">—</p>
                      )}
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
                    <div>
                      <p className="text-xs text-text-muted">Email</p>
                      {data.email ? (
                        <a href={`mailto:${data.email}`} className="text-text hover:text-accent">
                          {data.email}
                        </a>
                      ) : (
                        <p className="text-text">—</p>
                      )}
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
                    <div>
                      <p className="text-xs text-text-muted">Address</p>
                      <p className="text-text">
                        {[data.address, data.city, data.state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  </li>
                </ul>
              </section>

              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Membership
                </h2>
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Membership number" value={data.membershipNumber} />
                  <Field label="Status" value={data.membershipStatus.name} />
                  <Field label="Zone" value={data.zone?.name ?? "Unassigned"} />
                  <Field
                    label="Family"
                    value={data.familyMembers?.[0]?.family.name ?? "—"}
                  />
                  <Field
                    label="Departments"
                    value={
                      data.departments
                        ?.map((row) => row.department.name)
                        .join(", ") || "—"
                    }
                  />
                  <Field
                    label="Ministries"
                    value={
                      data.ministries?.map((row) => row.ministry.name).join(", ") ||
                      "—"
                    }
                  />
                  <Field label="Date joined" value={formatDisplayDate(data.dateJoined)} />
                  <Field label="Date of birth" value={formatDisplayDate(data.dateOfBirth)} />
                  <Field label="Occupation" value={displayValue(data.occupation)} />
                  <Field label="Gender" value={genderLabel(data.gender)} />
                  <Field
                    label="Marital status"
                    value={displayValue(data.maritalStatus)}
                  />
                </dl>
              </section>
            </div>

            {data.notes ? (
              <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
                  Notes
                </h2>
                <p className="whitespace-pre-wrap text-sm text-text">{data.notes}</p>
              </section>
            ) : null}
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
