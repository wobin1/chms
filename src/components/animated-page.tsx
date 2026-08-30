"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AnimatedPage({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="motion-page">
      {children}
    </div>
  );
}
