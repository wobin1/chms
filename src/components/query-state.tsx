import type { ReactNode } from "react";
import {
  PageSkeleton,
  type SkeletonVariant,
} from "@/components/page-skeleton";

export function QueryState({
  isLoading,
  isError,
  isFetching,
  variant = "list",
  skeleton,
  errorLabel = "Could not load this data. Refresh and try again.",
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  variant?: SkeletonVariant;
  skeleton?: ReactNode;
  errorLabel?: string;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <>{skeleton ?? <PageSkeleton variant={variant} />}</>;
  }
  if (isError) {
    return (
      <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
        {errorLabel}
      </p>
    );
  }
  return (
    <div className={isFetching ? "motion-content-in opacity-60" : "motion-content-in"}>
      {children}
    </div>
  );
}
