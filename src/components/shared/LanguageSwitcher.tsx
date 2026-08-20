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
                : "border-surface-border hover:bg-surface-canvas dark:border-slate-800 dark:hover:bg-slate-800/60"
            )}
          >
            <span className="block font-semibold">{LOCALE_LABELS[code].native}</span>
            <span className="block text-xs text-brand-text-secondary dark:text-slate-400">
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
      <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-brand-text-secondary" aria-hidden />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="appearance-none rounded-lg border border-surface-border bg-surface-light py-1.5 pl-8 pr-3 text-sm font-medium text-brand-text-primary outline-none transition-colors hover:bg-surface-canvas focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
