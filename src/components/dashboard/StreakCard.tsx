"use client";

import { Flame } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { DailyActivity } from "@/types";
import { cn } from "@/lib/utils";

export function StreakCard({
  streak,
  longestStreak,
  studiedToday,
  activity,
}: {
  streak: number;
  longestStreak: number;
  studiedToday: boolean;
  activity: DailyActivity[];
}) {
  const { t } = useI18n();

  return (
    <div className="card bg-gradient-to-br from-primary-600 to-primary-800 text-white dark:from-primary-700 dark:to-primary-950">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-primary-100">{t.dashboard.streak}</p>
          <p className="mt-1 flex items-baseline gap-2 text-4xl font-bold">
            {streak}
            <span className="text-base font-medium text-primary-100">{t.dashboard.dayStreak}</span>
          </p>
          <p className="mt-2 text-sm text-primary-100">
            {studiedToday ? t.dashboard.streakSafe : t.dashboard.keepItUp}
          </p>
        </div>
        <Flame
          className={cn("h-10 w-10", studiedToday ? "text-accent-400 animate-pulse-slow" : "text-primary-300")}
          aria-hidden
        />
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-200">
          {t.dashboard.activity}
        </p>
        <div className="mt-2 flex gap-1">
          {activity.map((day) => (
            <span
              key={day.date}
              title={`${day.date}: ${day.minutes} ${t.common.minutes}`}
              className={cn(
                "h-8 flex-1 rounded",
                day.goalMet
                  ? "bg-accent-400"
                  : day.minutes > 0
                    ? "bg-primary-300"
                    : "bg-white/15"
              )}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-primary-100">
          {t.dashboard.longestStreak}: {longestStreak} {t.common.days}
        </p>
      </div>
    </div>
  );
}
