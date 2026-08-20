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
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Decorative background sunburst circle */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[1000px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface-border bg-surface-light/50 shadow-[0_0_100px_rgba(241,245,249,0.5)] dark:border-slate-800 dark:bg-slate-950/50" />
      
      <NavBar />
      <main
        className={`relative z-10 mx-auto w-full flex-1 px-4 py-8 ${
          width === "narrow" ? "max-w-2xl" : "max-w-6xl"
        }`}
      >
        {children}
      </main>
      <LegalFooter />
    </div>
  );
}
