"use client";

import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QueryState } from "@/components/query-state";
import { useToast } from "@/components/toast";
import type { PublicUser } from "@/lib/auth-types";
import { displayValue, readApiError } from "@/lib/ui";

const PhotoUpload = dynamic(
  () => import("@/components/photo-upload").then((mod) => mod.PhotoUpload),
  {
    ssr: false,
    loading: () => (
      <div className="h-28 w-28 animate-pulse rounded-xl border border-border bg-canvas" />
    ),
  },
);

type Church = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  denomination: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  status: "ACTIVE" | "SUSPENDED";
  notes: string | null;
};

type ChurchForm = {
  name: string;
  shortName: string;
  denomination: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  logo: string;
  notes: string;
};

function emptyForm(): ChurchForm {
  return {
    name: "",
    shortName: "",
    denomination: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    logo: "",
    notes: "",
  };
}

function formFromChurch(data: Church): ChurchForm {
  return {
    name: data.name,
    shortName: data.shortName ?? "",
    denomination: data.denomination ?? "",
    address: data.address ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    logo: data.logo ?? "",
    notes: data.notes ?? "",
  };
}

function churchInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CH";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function locationText(parts: (string | null | undefined)[]) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm font-medium leading-snug text-text">{value}</dd>
    </div>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <span className="mt-1 text-accent" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className="text-xs text-text-muted">{label}</p>
        <div className="text-sm font-medium leading-snug text-text">{children}</div>
      </div>
    </li>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export default function ChurchProfilePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ChurchForm>(emptyForm);

  const me = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await fetch("/api/v1/auth/me");
      if (!response.ok) throw new Error("unauthenticated");
      const body = (await response.json()) as { user: PublicUser };
      return body.user;
    },
  });
  const canEdit = me.data?.permissions.includes("church:update") ?? false;

  const church = useQuery({
    queryKey: ["church"],
    queryFn: async () => {
      const response = await fetch("/api/v1/church");
      if (!response.ok) throw new Error("failed");
      return (await response.json()) as Church;
    },
  });

  useEffect(() => {
    if (church.data && !editing) {
      setForm(formFromChurch(church.data));
    }
  }, [church.data, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/v1/church", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          shortName: form.shortName || null,
          denomination: form.denomination || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          phone: form.phone || null,
          email: form.email || null,
          logo: form.logo || null,
          notes: form.notes || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save church profile"));
      }
      return (await response.json()) as Church;
    },
    onSuccess: async (data) => {
      setForm(formFromChurch(data));
      setEditing(false);
      toast("success", "Church profile saved.");
      await queryClient.invalidateQueries({ queryKey: ["church"] });
    },
    onError: (err) => toast("error", err.message),
  });

  function updateField<K extends keyof ChurchForm>(key: K, value: ChurchForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEditing() {
    if (church.data) setForm(formFromChurch(church.data));
    setEditing(true);
  }

  function cancelEditing() {
    if (church.data) setForm(formFromChurch(church.data));
    setEditing(false);
  }

  const data = church.data;
  const display = editing
    ? {
        name: form.name.trim() || data?.name || "Church",
        shortName: form.shortName.trim() || null,
        denomination: form.denomination.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        logo: form.logo || null,
        notes: form.notes.trim() || null,
        status: data?.status ?? "ACTIVE",
        slug: data?.slug ?? "",
      }
    : data
      ? {
          name: data.name,
          shortName: data.shortName,
          denomination: data.denomination,
          address: data.address,
          city: data.city,
          state: data.state,
          phone: data.phone,
          email: data.email,
          logo: data.logo,
          notes: data.notes,
          status: data.status,
          slug: data.slug,
        }
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <QueryState
        variant="profile"
        isLoading={church.isLoading}
        isError={church.isError}
        isFetching={church.isFetching && !church.isLoading}
        errorLabel="Unable to load the church profile."
      >
        {display && data ? (
          <div className="space-y-6">
            <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  {display.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={display.logo}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-lg font-semibold text-accent"
                      aria-hidden
                    >
                      {churchInitials(display.name)}
                    </div>
                  )}
                  <div className="min-w-0 space-y-2">
                    <div>
                      <h1 className="text-2xl font-bold leading-tight text-text">
                        {display.name}
                      </h1>
                      <p className="mt-1.5 text-sm leading-normal text-text-muted">
                        {[display.shortName, display.denomination]
                          .filter(Boolean)
                          .join(" · ") || "Church profile"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      <span
                        className={
                          display.status === "ACTIVE"
                            ? "rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
                            : "rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning"
                        }
                      >
                        {display.status === "ACTIVE" ? "Active" : "Suspended"}
                      </span>
                      {display.slug ? (
                        <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border">
                          {display.slug}
                        </span>
                      ) : null}
                      {display.city ? (
                        <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border">
                          {display.city}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {!editing && canEdit ? (
                  <Button type="button" onClick={startEditing}>
                    Edit profile
                  </Button>
                ) : null}
              </div>
            </article>

            {editing && canEdit ? (
              <form
                className="space-y-6"
                aria-busy={save.isPending}
                onSubmit={(event) => {
                  event.preventDefault();
                  save.mutate();
                }}
              >
                <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
                    <div className="space-y-1.5">
                      <h2 className="text-sm font-semibold text-text">
                        Edit profile
                      </h2>
                      <p className="text-sm leading-normal text-text-muted">
                        Update the church identity, contact details, and logo.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEditing}
                        disabled={save.isPending}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={save.isPending} disabled={save.isPending}>
                        Save changes
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-8 lg:grid-cols-[12rem_1fr]">
                    <div>
                      <PhotoUpload
                        label="Logo"
                        entity="church"
                        entityId={data.id}
                        value={form.logo}
                        onChange={(url) => updateField("logo", url)}
                      />
                      <p className="mt-2 text-xs leading-normal text-text-muted">
                        Square images look best on the profile header.
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <Label htmlFor="name">Church name</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          required
                          autoComplete="organization"
                        />
                      </div>
                      <FieldGrid>
                        <div>
                          <Label htmlFor="shortName">Short name</Label>
                          <Input
                            id="shortName"
                            value={form.shortName}
                            onChange={(e) =>
                              updateField("shortName", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="denomination">Denomination</Label>
                          <Input
                            id="denomination"
                            value={form.denomination}
                            onChange={(e) =>
                              updateField("denomination", e.target.value)
                            }
                          />
                        </div>
                      </FieldGrid>
                      <FieldGrid>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={form.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            autoComplete="tel"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            autoComplete="email"
                          />
                        </div>
                      </FieldGrid>
                      <div>
                        <Label htmlFor="address">Street address</Label>
                        <Input
                          id="address"
                          value={form.address}
                          onChange={(e) => updateField("address", e.target.value)}
                          autoComplete="street-address"
                        />
                      </div>
                      <FieldGrid>
                        <div>
                          <Label htmlFor="city">City</Label>
                          <Input
                            id="city"
                            value={form.city}
                            onChange={(e) => updateField("city", e.target.value)}
                            autoComplete="address-level2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State</Label>
                          <Input
                            id="state"
                            value={form.state}
                            onChange={(e) => updateField("state", e.target.value)}
                            autoComplete="address-level1"
                          />
                        </div>
                      </FieldGrid>
                      <div>
                        <Label htmlFor="notes">Internal notes</Label>
                        <textarea
                          id="notes"
                          value={form.notes}
                          onChange={(e) => updateField("notes", e.target.value)}
                          rows={4}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        />
                      </div>
                      <p className="inline-flex items-center gap-2 text-xs leading-normal text-text-muted">
                        <Building2 className="h-3.5 w-3.5 text-accent" aria-hidden />
                        Slug <span className="font-medium text-text">{data.slug}</span>{" "}
                        is set by the platform and cannot be changed here.
                      </p>
                    </div>
                  </div>
                </section>
              </form>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-text">Contact</h2>
                    <ul className="mt-4 divide-y divide-border">
                      <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone">
                        {display.phone ? (
                          <a
                            href={`tel:${display.phone}`}
                            className="hover:text-accent"
                          >
                            {display.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </ContactRow>
                      <ContactRow icon={<Mail className="h-4 w-4" />} label="Email">
                        {display.email ? (
                          <a
                            href={`mailto:${display.email}`}
                            className="break-all hover:text-accent"
                          >
                            {display.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </ContactRow>
                      <ContactRow
                        icon={<MapPin className="h-4 w-4" />}
                        label="Address"
                      >
                        {locationText([
                          display.address,
                          display.city,
                          display.state,
                        ]) || "—"}
                      </ContactRow>
                    </ul>
                  </section>

                  <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-text">Details</h2>
                    <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                      <Detail label="Church name" value={display.name} />
                      <Detail
                        label="Short name"
                        value={displayValue(display.shortName)}
                      />
                      <Detail
                        label="Denomination"
                        value={displayValue(display.denomination)}
                      />
                      <Detail label="Slug" value={displayValue(display.slug)} />
                      <Detail label="City" value={displayValue(display.city)} />
                      <Detail label="State" value={displayValue(display.state)} />
                    </dl>
                  </section>
                </div>

                <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
                  <h2 className="text-sm font-semibold text-text">Notes</h2>
                  {display.notes ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text">
                      {display.notes}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">
                      No internal notes yet.
                      {canEdit ? " Use Edit profile to add them." : null}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
