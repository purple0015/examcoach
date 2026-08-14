"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { ThemePreference } from "@/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function ThemeToggle({ variant = "compact" }: { variant?: "compact" | "full" }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const labels: Record<ThemePreference, string> = {
    light: t.common.light,
    dark: t.common.dark,
    system: t.common.system,
  };

  return (
    <div
      role="group"
      aria-label={t.common.theme}
      className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900"
    >
      {OPTIONS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={labels[value]}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
            theme === value
              ? "bg-primary-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {variant === "full" && labels[value]}
        </button>
      ))}
    </div>
  );
}
