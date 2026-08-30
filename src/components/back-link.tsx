import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({
  href,
  children = "Back",
}: {
  href: string;
  children?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-hover"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  );
}
