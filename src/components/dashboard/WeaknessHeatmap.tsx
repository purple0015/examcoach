"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { WeaknessCell } from "@/types";
import { cn } from "@/lib/utils";

const TONES: Record<WeaknessCell["color"], string> = {
  mint: "bg-success-100 text-success-600 dark:bg-success-600/20 dark:text-success-500",
  amber: "bg-warning-100 text-warning-600 dark:bg-warning-600/20 dark:text-warning-500",
  red: "bg-danger-100 text-danger-600 dark:bg-danger-600/20 dark:text-danger-500",
};

export function WeaknessHeatmap({ cells }: { cells: WeaknessCell[] }) {
  const { t } = useI18n();

  return (
    <div className="card">
      <h2 className="mb-4 font-semibold">{t.dashboard.weaknessHeatmap}</h2>
      {cells.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.dashboard.noWeakness}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {cells.map((cell) => (
            <div
              key={cell.topic}
              className={cn("flex items-center justify-between rounded-xl px-3 py-2", TONES[cell.color])}
            >
              <span className="truncate text-sm font-medium">{cell.topic}</span>
              <span className="text-sm font-bold">{cell.strength}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
