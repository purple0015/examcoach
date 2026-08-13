"use client";

import { SessionProvider } from "next-auth/react";
import { PWABanner } from "@/components/shared/PWABanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PWABanner />
      {children}
    </SessionProvider>
  );
}
