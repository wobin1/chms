import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">
        Login to your Account
      </h1>
      <p className="mt-2 mb-8 text-sm text-text-muted">
        Welcome back! Sign in with your church or platform email.
      </p>
      <LoginForm />
      <p className="mt-8 text-center text-sm text-text-muted">
        Registration is not public. Ask your church admin for access.
      </p>
    </>
  );
}
