"use client";

import { AppShell, type NavItem } from "@/components/app-shell";

const nav: NavItem[] = [
  { href: "/platform/dashboard", label: "Dashboard", icon: "dashboard" },
  {
    href: "/platform/churches",
    label: "Churches",
    icon: "church",
    children: [{ href: "/platform/churches", label: "All churches" }],
  },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell nav={nav} changePasswordHref="/platform/change-password">
      {children}
    </AppShell>
  );
}
