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
    <>
      <NavBar />
      <main
        className={`mx-auto w-full flex-1 px-4 py-8 ${
          width === "narrow" ? "max-w-2xl" : "max-w-6xl"
        }`}
      >
        {children}
      </main>
      <LegalFooter />
    </>
  );
}
