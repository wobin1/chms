"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoUpload } from "@/components/photo-upload";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { readApiError, toDateInputValue } from "@/lib/ui";

type Zone = { id: string; name: string };
type Status = { id: string; name: string };

export type MemberFormValue = {
  membershipNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  dateJoined: string;
  membershipStatusId: string;
  zoneId: string;
  photoUrl: string;
  photoPublicId: string;
};

export function MemberForm({
  initial,
  memberId,
}: {
  initial?: Partial<MemberFormValue>;
  memberId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormValue>({
    membershipNumber: initial?.membershipNumber ?? "",
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    dateJoined: toDateInputValue(initial?.dateJoined),
    membershipStatusId: initial?.membershipStatusId ?? "",
    zoneId: initial?.zoneId ?? "",
    photoUrl: initial?.photoUrl ?? "",
    photoPublicId: initial?.photoPublicId ?? "",
  });

  const zones = useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/zones?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as Zone[] };
      return (await response.json()) as { items: Zone[] };
    },
  });
  const statuses = useQuery({
    queryKey: ["membership-statuses"],
    queryFn: async () => {
      const response = await fetch("/api/v1/membership-statuses");
      if (!response.ok) return { items: [] as Status[] };
      return (await response.json()) as { items: Status[] };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        membershipNumber: form.membershipNumber,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        dateJoined: form.dateJoined || null,
        membershipStatusId: form.membershipStatusId,
        zoneId: form.zoneId || null,
        photoUrl: form.photoUrl || null,
        photoPublicId: form.photoPublicId || null,
      };
      const response = await fetch(
        memberId ? `/api/v1/members/${memberId}` : "/api/v1/members",
        {
          method: memberId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(await readApiError(response, "Unable to save member"));
      }
      return (await response.json()) as { id: string };
    },
    onSuccess: (member) => {
      toast("success", memberId ? "Member updated." : "Member added.");
      router.push(`/members/${member.id}`);
    },
    onError: (err) => {
      setError(err.message);
      toast("error", err.message);
    },
  });

  const entityId = memberId ?? "00000000-0000-0000-0000-000000000001";

  return (
    <form
      className="max-w-2xl space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm"
      aria-busy={save.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      {error ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-6 sm:flex-row">
        <PhotoUpload
          label="Photo"
          entity="members"
          entityId={entityId}
          value={form.photoUrl}
          onChange={(url, publicId) =>
            setForm({
              ...form,
              photoUrl: url,
              photoPublicId: publicId ?? form.photoPublicId,
            })
          }
        />
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="membershipNumber">Membership number</Label>
            <Input
              id="membershipNumber"
              required
              value={form.membershipNumber}
              onChange={(e) =>
                setForm({ ...form, membershipNumber: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>
      </div>

      <fieldset className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-text">Contact</legend>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="0803 000 0000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="dateJoined">Date joined</Label>
          <Input
            id="dateJoined"
            type="date"
            value={form.dateJoined}
            onChange={(e) => setForm({ ...form, dateJoined: e.target.value })}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-text">Membership</legend>
        <div>
          <Label htmlFor="status">Membership status</Label>
          <Select
            id="status"
            required
            value={form.membershipStatusId}
            onChange={(e) =>
              setForm({ ...form, membershipStatusId: e.target.value })
            }
          >
            <option value="">Select status</option>
            {(statuses.data?.items ?? []).map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="zone">Zone</Label>
          <Select
            id="zone"
            value={form.zoneId}
            onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
          >
            <option value="">Unassigned</option>
            {(zones.data?.items ?? []).map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      <Button type="submit" loading={save.isPending} disabled={save.isPending}>
        Save member
      </Button>
    </form>
  );
}
