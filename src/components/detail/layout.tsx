import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ListPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm leading-normal text-text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm font-medium leading-snug text-text">{value}</dd>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {description ? (
            <p className="mt-1.5 text-sm leading-normal text-text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ProfileHero({
  title,
  subtitle,
  badges,
  actions,
}: {
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div>
            <h1 className="text-2xl font-bold leading-tight text-text">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-sm leading-normal text-text-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
          {badges ? <div className="flex flex-wrap gap-2 pt-0.5">{badges}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}

export function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span
      className={
        active
          ? "rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
          : "rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning"
      }
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-text ring-1 ring-border">
      {children}
    </span>
  );
}

export function EditPanel({
  title,
  description,
  pending,
  onCancel,
  onSave,
  children,
}: {
  title: string;
  description?: string;
  pending?: boolean;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {description ? (
            <p className="text-sm leading-normal text-text-muted">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} loading={pending} disabled={pending}>
            Save changes
          </Button>
        </div>
      </div>
      {children}
    </section>
  );
}

export function DetailPageShell({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={backHref} className="inline-flex text-sm font-medium text-accent">
        ← {backLabel}
      </Link>
      {children}
    </div>
  );
}
