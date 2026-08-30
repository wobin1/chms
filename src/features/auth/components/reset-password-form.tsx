"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resetPasswordSchema } from "@/features/auth/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { newPassword: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      setFormError(null);
      if (value.newPassword !== value.confirmPassword) {
        setFormError("New passwords do not match.");
        return;
      }
      const parsed = resetPasswordSchema.safeParse({
        token,
        newPassword: value.newPassword,
      });
      if (!parsed.success) {
        setFormError("Password must be at least 10 characters.");
        return;
      }

      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setFormError(body?.error ?? "Unable to reset password.");
        toast("error", body?.error ?? "Unable to reset password.");
        return;
      }
      toast("success", "Password reset. Sign in with your new password.");
      router.push("/login");
    },
  });

  if (!token) {
    return (
      <p className="text-sm text-text-muted" role="alert">
        This reset link is missing a token. Request a new one from forgot
        password.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Reset password"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
