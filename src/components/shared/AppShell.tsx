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
      <NavBar />
      <main
        className={`mx-auto w-full flex-1 px-4 py-7 sm:px-6 sm:py-9 ${
          width === "narrow" ? "max-w-[760px]" : "max-w-6xl"
        }`}
      >
        {children}
      </main>
      <LegalFooter />
    </div>
  );
}
