import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">
        Reset password
      </h1>
      <p className="mt-2 mb-8 text-sm text-text-muted">
        Choose a new password of at least 10 characters.
      </p>
      <ResetPasswordForm token={token ?? ""} />
      <p className="mt-8 text-center text-sm text-text-muted">
        <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
