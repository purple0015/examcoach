import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { themeInitScript, THEME_COOKIE } from "@/components/providers/ThemeProvider";
import { LOCALE_COOKIE, LOCALE_TAGS, normalizeLocale } from "@/lib/i18n/config";
import { ThemePreference } from "@/types";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ea580c" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "ExamCoach | AI Study Companion",
  description:
    "AI flashcards, mock exams and coaching in English, isiNdebele and chiShona — with streaks, goals and plan-based uploads.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ExamCoach" },
};

function readTheme(value: string | undefined): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const store = cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const theme = readTheme(store.get(THEME_COOKIE)?.value);

  return (
    <html lang={LOCALE_TAGS[locale]} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} flex min-h-screen flex-col bg-stone-50 dark:bg-stone-950 p-2 md:p-4 lg:p-6`}>
        <div className="flex-1 flex flex-col bg-white border border-stone-200 rounded-[2.5rem] md:rounded-[4rem] lg:rounded-[5rem] shadow-sm overflow-hidden dark:bg-stone-900 dark:border-stone-800 transition-colors duration-200">
          <Providers initialLocale={locale} initialTheme={theme}>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
