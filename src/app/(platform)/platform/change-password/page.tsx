import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export default function ChangePasswordPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-text">Change password</h1>
      <p className="mb-6 text-sm text-text-muted">
        Choose a new password of at least 10 characters.
      </p>
      <ChangePasswordForm />
    </div>
  );
}
