"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { changePasswordSchema } from "@/features/auth/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";

export function ChangePasswordForm() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setSuccess(false);
      if (value.newPassword !== value.confirmPassword) {
        setFormError("New passwords do not match.");
        return;
      }
      const parsed = changePasswordSchema.safeParse({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      });
      if (!parsed.success) {
        setFormError("Password must be at least 10 characters.");
        return;
      }

      const response = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setFormError(body?.error ?? "Unable to update password.");
        toast("error", body?.error ?? "Unable to update password.");
        return;
      }
      setSuccess(true);
      toast("success", "Password updated.");
      form.reset();
    },
  });

  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      noValidate
    >
      {formError ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-text" role="status">
          Password updated
        </p>
      ) : null}

      <form.Field name="currentPassword">
        {(field) => (
          <div>
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              required
            />
          </div>
        )}
      </form.Field>

      <form.Field name="newPassword">
        {(field) => (
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              required
              minLength={10}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <div>
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              required
              minLength={10}
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.isSubmitting]}>
        {([isSubmitting]) => (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
