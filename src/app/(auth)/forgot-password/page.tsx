import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">
        Forgot password
      </h1>
      <p className="mt-2 mb-8 text-sm text-text-muted">
        Enter your email. If it matches an account, you can reset your password.
      </p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm text-text-muted">
        <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
