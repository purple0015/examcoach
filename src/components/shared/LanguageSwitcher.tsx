"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { Locale } from "@/types";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const { locale, setLocale, t } = useI18n();

  if (variant === "full") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              locale === code
                ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40"
                : "border-stone-200 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/60"
            )}
          >
            <span className="block font-semibold">{LOCALE_LABELS[code].native}</span>
            <span className="block text-xs text-stone-500 dark:text-stone-400">
              {LOCALE_LABELS[code].english}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <label className="relative flex items-center">
      <span className="sr-only">{t.common.language}</span>
      <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-stone-500" aria-hidden />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="appearance-none rounded-lg border border-stone-300 bg-white py-1.5 pl-8 pr-3 text-sm font-medium text-stone-700 outline-none transition-colors hover:bg-stone-50 focus:ring-2 focus:ring-primary-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code].native}
          </option>
        ))}
      </select>
    </label>
  );
}
