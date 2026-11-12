"use client";

import { NavBar } from "@/components/shared/NavBar";
import { LegalFooter } from "@/components/shared/LegalFooter";

export function AppShell({
  children,
  width = "wide",
}: {
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-canvas">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 mx-auto h-[900px] w-[900px] -translate-y-1/2 rounded-full border border-surface-border bg-white/40 dark:border-slate-800 dark:bg-slate-900/20" />

      <NavBar />

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 gap-5 px-3 py-6 sm:px-4 lg:px-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-[18px] border border-surface-border bg-white/80 p-3 shadow-[0_1px_0_rgba(15,23,42,0.02),0_18px_32px_-28px_rgba(15,23,42,0.22)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-text-secondary">
                Study
              </span>
              <span className="rounded-full border border-surface-border bg-surface-canvas px-2 py-1 text-[10px] font-medium text-brand-text-secondary dark:border-slate-700 dark:bg-slate-800">
                Focus
              </span>
            </div>

            <div className="space-y-2">
              <div className="rounded-2xl border border-surface-border bg-surface-canvas px-3 py-2 text-sm font-medium text-brand-text-primary dark:border-slate-700 dark:bg-slate-800/80">
                Dashboard
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface-canvas px-3 py-2 text-sm font-medium text-brand-text-primary dark:border-slate-700 dark:bg-slate-800/80">
                Study path
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface-canvas px-3 py-2 text-sm font-medium text-brand-text-primary dark:border-slate-700 dark:bg-slate-800/80">
                Upload notes
              </div>
            </div>
          </div>
        </aside>

        <main
          className={`relative z-10 mx-auto w-full flex-1 ${
            width === "narrow" ? "max-w-[760px]" : "max-w-[760px]"
          }`}
        >
          {children}
        </main>
      </div>

      <LegalFooter />
    </div>
  );
}
