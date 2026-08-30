"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/features/services/labels";
import { LOOKUP_PAGE_SIZE } from "@/lib/pagination";

type Role = { id: string; name: string };
type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  membershipNumber: string;
};

export type UserFormValues = {
  name: string;
  email: string;
  password: string;
  roleName: string;
  memberId: string;
};

export function emptyUserForm(): UserFormValues {
  return {
    name: "",
    email: "",
    password: "",
    roleName: "Zone Leader",
    memberId: "",
  };
}

export function userFormFromRecord(record: {
  name: string;
  email: string;
  memberId: string | null;
  userRoles: { role: { name: string } }[];
}): Omit<UserFormValues, "password"> {
  return {
    name: record.name,
    email: record.email,
    roleName: record.userRoles[0]?.role.name ?? "Zone Leader",
    memberId: record.memberId ?? "",
  };
}

export function UserForm({
  mode,
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  initial: UserFormValues;
  pending?: boolean;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);

  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await fetch("/api/v1/roles");
      if (!response.ok) return { items: [] as Role[] };
      return (await response.json()) as { items: Role[] };
    },
  });
  const members = useQuery({
    queryKey: ["members", "user-link"],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/members?page=1&pageSize=${LOOKUP_PAGE_SIZE}`,
      );
      if (!response.ok) return { items: [] as MemberOption[] };
      return (await response.json()) as { items: MemberOption[] };
    },
  });

  function update<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
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
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            readOnly={mode === "edit"}
            disabled={mode === "edit"}
          />
        </div>
        {mode === "create" ? (
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              minLength={10}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
        ) : null}
        <div>
          <Label htmlFor="roleName">Role</Label>
          <Select
            id="roleName"
            value={form.roleName}
            onChange={(e) => update("roleName", e.target.value)}
          >
            {(roles.data?.items ?? [{ name: "Zone Leader" }]).map((role) => (
              <option key={role.name} value={role.name}>
                {role.name}
              </option>
            ))}
          </Select>
        </div>
        <div className={mode === "create" ? "sm:col-span-2" : ""}>
          <Label htmlFor="memberId">Link to member (optional)</Label>
          <Select
            id="memberId"
            value={form.memberId}
            onChange={(e) => update("memberId", e.target.value)}
          >
            <option value="">Not linked</option>
            {(members.data?.items ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.lastName}, {member.firstName} ({member.membershipNumber})
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-text-muted">
            Only members of this church can be linked.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={pending} disabled={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
