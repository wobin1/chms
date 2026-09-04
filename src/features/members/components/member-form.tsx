"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PhotoUpload } from "@/components/photo-upload";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { GENDER_LABELS } from "@/features/services/labels";
import {
  emptyMemberForm,
  memberFormClientError,
  memberFormFromRecord,
  memberFormPayload,
  type MemberFormValue,
} from "@/features/members/member-form-values";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { readApiError } from "@/lib/ui";

type Zone = { id: string; name: string };
type Status = { id: string; name: string };

export type { MemberFormValue };

export function MemberForm({
  initial,
  memberId,
}: {
  initial?: Parameters<typeof memberFormFromRecord>[0];
  memberId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormValue>(() =>
    initial ? memberFormFromRecord(initial) : emptyMemberForm(),
  );

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
      const response = await fetch(
        memberId ? `/api/v1/members/${memberId}` : "/api/v1/members",
        {
          method: memberId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(memberFormPayload(form)),
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
  const invalidToastArmed = useRef(true);

  function update<K extends keyof MemberFormValue>(
    key: K,
    value: MemberFormValue[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError(null);
  }

  return (
    <form
      className="max-w-2xl space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm"
      aria-busy={save.isPending}
      onInvalidCapture={() => {
        if (!invalidToastArmed.current) return;
        invalidToastArmed.current = false;
        toast("error", "Please complete the required fields.");
        window.setTimeout(() => {
          invalidToastArmed.current = true;
        }, 0);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        const clientError = memberFormClientError(form);
        if (clientError) {
          setError(clientError);
          toast("error", clientError);
          return;
        }
        setError(null);
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
              onChange={(e) => update("membershipNumber", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              required
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="middleName">Middle name</Label>
            <Input
              id="middleName"
              value={form.middleName}
              onChange={(e) => update("middleName", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              required
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </div>
        </div>
      </div>

      <fieldset className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-text">Profile</legend>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select
            id="gender"
            value={form.gender}
            onChange={(e) =>
              update("gender", e.target.value as MemberFormValue["gender"])
            }
          >
            {Object.entries(GENDER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="occupation">Occupation</Label>
          <Input
            id="occupation"
            value={form.occupation}
            onChange={(e) => update("occupation", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="maritalStatus">Marital status</Label>
          <Input
            id="maritalStatus"
            value={form.maritalStatus}
            onChange={(e) => update("maritalStatus", e.target.value)}
            placeholder="Single, Married, …"
          />
        </div>
      </fieldset>

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
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
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
            requiredLabel="membership status"
            value={form.membershipStatusId}
            onChange={(e) => update("membershipStatusId", e.target.value)}
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
            onChange={(e) => update("zoneId", e.target.value)}
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
          <Label htmlFor="dateJoined">Date joined</Label>
          <Input
            id="dateJoined"
            type="date"
            value={form.dateJoined}
            onChange={(e) => update("dateJoined", e.target.value)}
          />
        </div>
        <p className="sm:col-span-2 text-sm text-text-muted">
          Family is assigned from Families — when this member is added to a
          family, it appears on their profile.
        </p>
      </fieldset>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={3}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <Button type="submit" loading={save.isPending} disabled={save.isPending}>
        Save member
      </Button>
    </form>
  );
}
