import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-text">Page not found</h1>
        <p className="mt-2 text-sm text-text-muted">
          That page is not available. Public registration is not offered.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
