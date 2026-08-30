"use client";

import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginSchema } from "@/features/auth/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";

export function LoginForm() {
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const parsed = loginSchema.safeParse(value);
      if (!parsed.success) {
        setFormError("Enter a valid email and password.");
        return;
      }

      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setFormError(body?.error ?? "Unable to sign in. Try again.");
        toast("error", body?.error ?? "Unable to sign in. Try again.");
        return;
      }

      const body = (await response.json()) as {
        user: { isPlatformAdmin: boolean };
      };
      router.push(
        body.user.isPlatformAdmin ? "/platform/dashboard" : "/dashboard",
      );
      router.refresh();
    },
  });

  return (
    <form
      className="space-y-5"
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
    >
      {formError ? (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <form.Field name="email">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Enter your email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              required
            />
          </div>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="pr-11"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                required
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-text-muted hover:text-text"
                aria-label={showPassword ? "Hide characters" : "Show characters"}
                onClick={() => setShowPassword((open) => !open)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>
        )}
      </form.Field>

      <div className="flex items-center justify-end text-sm">
        <Link
          href="/forgot-password"
          className="font-medium text-accent underline-offset-2 hover:text-accent-hover hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      <form.Subscribe selector={(state) => [state.isSubmitting]}>
        {([isSubmitting]) => (
          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Login"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
