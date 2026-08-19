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
    default: "text-slate-500 dark:text-slate-400",
    primary: "text-primary-600 dark:text-primary-400",
    success: "text-success-600 dark:text-success-500",
    warning: "text-warning-600 dark:text-warning-500",
    danger: "text-danger-600 dark:text-danger-500",
    admin: "text-orange-500 dark:text-orange-400",
  };

  return (
    <div className="card flex flex-col gap-1 p-4 border-slate-200/60 dark:border-slate-800/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <Icon className={cn("h-4 w-4", tone === "admin" ? "text-orange-500" : tones[tone])} aria-hidden />
      </div>
      <span className="text-2xl font-bold text-orange-600/90 dark:text-orange-400/90">{value}</span>
      {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </div>
  );
}
