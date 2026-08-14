import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  label,
  caption,
  size = 120,
  className,
}: {
  value: number;
  label: string;
  caption?: string;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            className="fill-none stroke-slate-200 dark:stroke-slate-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="fill-none stroke-primary-600 transition-[stroke-dashoffset] duration-700 dark:stroke-primary-400"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{clamped}%</span>
          {caption && <span className="text-xs text-slate-500 dark:text-slate-400">{caption}</span>}
        </div>
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}
