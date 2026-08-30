"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";
import { formatDisplayDate } from "@/lib/ui";

type GivingType = { id: string; name: string; status: "ACTIVE" | "INACTIVE" };
type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
};
type ServiceOption = { id: string; name: string; serviceDate: string };

export type GivingFormValues = {
  givingTypeId: string;
  amount: string;
  paymentMethod: string;
  memberId: string;
  serviceId: string;
  transactionReference: string;
};

export function emptyGivingForm(): GivingFormValues {
  return {
    givingTypeId: "",
    amount: "",
    paymentMethod: "Cash",
    memberId: "",
    serviceId: "",
    transactionReference: "",
  };
}

export function GivingForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: GivingFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: GivingFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  const types = useQuery({
    queryKey: ["giving-types"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/giving-types?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as GivingType[] };
      return (await response.json()) as { items: GivingType[] };
    },
  });
  const members = useQuery({
    queryKey: ["members", "picker"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/members?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as MemberOption[] };
      return (await response.json()) as { items: MemberOption[] };
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
  });

  const activeTypes = (types.data?.items ?? []).filter((t) => t.status === "ACTIVE");

  function update<K extends keyof GivingFormValues>(key: K, value: GivingFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="givingTypeId">Type</Label>
          <Select
            id="givingTypeId"
            value={form.givingTypeId}
            onChange={(e) => update("givingTypeId", e.target.value)}
            required
          >
            <option value="">Select a type</option>
            {activeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="paymentMethod">Method</Label>
          <Input
            id="paymentMethod"
            value={form.paymentMethod}
            onChange={(e) => update("paymentMethod", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="transactionReference">Reference</Label>
          <Input
            id="transactionReference"
            value={form.transactionReference}
            onChange={(e) => update("transactionReference", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="memberId">Member (optional)</Label>
          <Select
            id="memberId"
            value={form.memberId}
            onChange={(e) => update("memberId", e.target.value)}
          >
            <option value="">Anonymous — no member</option>
            {(members.data?.items ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.lastName}, {member.firstName} ({member.membershipNumber})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="serviceId">Service (optional)</Label>
          <Select
            id="serviceId"
            value={form.serviceId}
            onChange={(e) => update("serviceId", e.target.value)}
          >
            <option value="">Not linked to a service</option>
            {(services.data?.items ?? []).map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {formatDisplayDate(service.serviceDate)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending || !form.givingTypeId}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
