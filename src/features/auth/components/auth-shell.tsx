import { Church } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-10 sm:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-border) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div
        data-testid="auth-card"
        className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-border bg-surface shadow-[0_25px_60px_-20px_rgba(15,23,42,0.25)] dark:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.55)] md:grid-cols-2"
      >
        <aside
          data-testid="auth-brand-panel"
          className="relative hidden min-h-[28rem] md:block"
        >
          <div className="absolute inset-3 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-accent via-[#1e40af] to-[#0f172a]">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(147,197,253,0.4), transparent 40%)",
              }}
            />
            <div className="relative flex h-full flex-col justify-between p-8 text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Church className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-lg font-semibold tracking-tight">CHMS</span>
              </div>
              <div className="space-y-3">
                <p className="max-w-xs text-3xl font-semibold leading-tight tracking-tight">
                  Serve your church with clarity
                </p>
                <p className="max-w-sm text-sm text-white/80">
                  Members, zones, services, and care — one secure place for your
                  team.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
              <Church className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-bold text-text">CHMS</span>
          </div>
          <div className="mb-8 hidden items-center gap-2 md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
              <Church className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-base font-semibold text-text">CHMS</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
