"use client";

import { AppShell } from "@/components/app-shell";
import { CHURCH_NAV } from "@/lib/nav";

export default function ChurchAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell nav={CHURCH_NAV} changePasswordHref="/change-password">
      {children}
    </AppShell>
  );
}
