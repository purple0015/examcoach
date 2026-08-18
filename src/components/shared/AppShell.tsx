"use client";

import { NavBar } from "@/components/shared/NavBar";
import { LegalFooter } from "@/components/shared/LegalFooter";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export function AppShell({
  children,
  width = "wide",
}: {
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  const isOnline = useOnlineStatus();

  return (
    <>
      {!isOnline && (
        <div className="sticky top-0 z-[60] flex items-center justify-center gap-2 bg-amber-500 py-1.5 text-center text-xs font-bold text-white">
          <WifiOff className="h-3.5 w-3.5" />
          OFFLINE MODE — Some AI features may be unavailable
        </div>
      )}
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
