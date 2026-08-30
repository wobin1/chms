"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useState } from "react";
import { forgotPasswordSchema } from "@/features/auth/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";

export function ForgotPasswordForm() {
  const toast = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setDevToken(null);
      const parsed = forgotPasswordSchema.safeParse(value);
      if (!parsed.success) {
        setFormError("Enter a valid email.");
        return;
      }

      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        setFormError("Unable to start a reset. Try again.");
        toast("error", "Unable to start a reset. Try again.");
        return;
      }
      const body = (await response.json()) as {
        token?: string;
        emailSent?: boolean;
        delivery?: "sandbox" | "sending";
      };
      if (body.emailSent && body.delivery === "sandbox") {
        setMessage(
          "Reset email was sent to your Mailtrap Email Testing inbox (not Gmail). Open that inbox, or use the local reset link below.",
        );
        toast(
          "success",
          "Check Mailtrap Email Testing — mail does not arrive in a real inbox while MAILTRAP_INBOX_ID is set.",
        );
      } else if (body.emailSent) {
        setMessage(
          "If that email is on this platform, check your inbox for a reset link.",
        );
        toast("success", "If that email is on this platform, check for a reset link.");
      } else {
        setMessage(
          "If that email is on this platform, you can continue with a reset link.",
        );
        toast(
          "success",
          "If that email is on this platform, use the local reset link when shown.",
        );
      }
      if (body.token) {
        setDevToken(body.token);
      }
    },
  });

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
      {message ? (
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-text" role="status">
          {message}
        </p>
      ) : null}
      {devToken ? (
        <p className="break-all rounded-xl border border-border px-3 py-2 text-sm text-text-muted">
          Dev reset token: {devToken}.{" "}
          <Link
            href={`/reset-password?token=${encodeURIComponent(devToken)}`}
            className="font-medium text-accent"
          >
            Continue to reset
          </Link>
        </p>
      ) : null}

      <form.Field name="email">
        {(field) => (
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              required
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => [state.isSubmitting]}>
        {([isSubmitting]) => (
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
