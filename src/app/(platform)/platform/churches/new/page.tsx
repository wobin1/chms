"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";

export default function NewChurchPage() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      city: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const response = await fetch("/api/v1/churches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: value.name,
          slug: value.slug,
          city: value.city || null,
          admin: {
            name: value.adminName,
            email: value.adminEmail,
            password: value.adminPassword,
          },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Unable to create church.");
        toast("error", body?.error ?? "Unable to create church.");
        return;
      }
      const church = (await response.json()) as { id: string };
      toast("success", "Church created.");
      router.push(`/platform/churches/${church.id}`);
    },
  });

  return (
    <div className="max-w-xl space-y-6">
      <BackLink href="/platform/churches">Back to churches</BackLink>
      <h1 className="text-2xl font-bold text-text">Add church</h1>
      <form
        className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        {error ? (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <form.Field name="name">
          {(field) => (
            <div>
              <Label htmlFor="name">Church name</Label>
              <Input
                id="name"
                required
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="slug">
          {(field) => (
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                required
                placeholder="ecwa-janruwa"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="city">
          {(field) => (
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </div>
          )}
        </form.Field>
        <fieldset className="space-y-4 border-t border-border pt-4">
          <legend className="text-sm font-semibold text-text">
            First church administrator
          </legend>
          <form.Field name="adminName">
            {(field) => (
              <div>
                <Label htmlFor="adminName">Name</Label>
                <Input
                  id="adminName"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="adminEmail">
            {(field) => (
              <div>
                <Label htmlFor="adminEmail">Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  required
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="adminPassword">
            {(field) => (
              <div>
                <Label htmlFor="adminPassword">Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  required
                  minLength={10}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </div>
            )}
          </form.Field>
        </fieldset>
        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              Create church
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
