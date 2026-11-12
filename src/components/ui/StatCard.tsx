import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "text-brand-text-secondary dark:text-slate-400",
    primary: "text-primary-600 dark:text-primary-400",
    success: "text-success-600 dark:text-success-500",
    warning: "text-warning-600 dark:text-warning-500",
    danger: "text-danger-600 dark:text-danger-500",
  };

  return (
    <div className="card flex min-h-[112px] flex-col gap-1.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-brand-text-secondary dark:text-slate-400">{label}</span>
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-surface-border bg-surface-canvas dark:border-slate-700 dark:bg-slate-800")}>
          <Icon className={cn("h-4 w-4", tones[tone])} aria-hidden />
        </span>
      </div>
      <span className="tabular-nums text-2xl font-bold tracking-tight">{value}</span>
      {hint && <span className="text-xs text-brand-text-secondary dark:text-slate-400">{hint}</span>}
    </div>
  );
}
