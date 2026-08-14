"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { PWABanner } from "@/components/shared/PWABanner";
import { Locale, ThemePreference } from "@/types";

export function Providers({
  children,
  initialLocale,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialTheme: ThemePreference;
}) {
  return (
    <SessionProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <I18nProvider initialLocale={initialLocale}>
          {children}
          <PWABanner />
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
