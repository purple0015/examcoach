"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function GoalProgress({
  minutesToday,
  dailyGoal,
  dailyGoalPct,
  topicsThisWeek,
  weeklyGoal,
  weeklyGoalPct,
  onGoalsUpdated,
}: {
  minutesToday: number;
  dailyGoal: number;
  dailyGoalPct: number;
  topicsThisWeek: number;
  weeklyGoal: number;
  weeklyGoalPct: number;
  onGoalsUpdated: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [daily, setDaily] = useState(dailyGoal);
  const [weekly, setWeekly] = useState(weeklyGoal);

  async function save() {
    setSaving(true);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyMinutes: daily, weeklyTopics: weekly }),
    });
    setSaving(false);
    setEditing(false);
    onGoalsUpdated();
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{t.dashboard.goalsTitle}</h2>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="btn-ghost px-2 py-1 text-xs"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          {t.dashboard.editGoals}
        </button>
      </div>

      {editing ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            {t.dashboard.dailyMinutes}
            <input
              type="number"
              min={5}
              max={600}
              value={daily}
              onChange={(e) => setDaily(Number(e.target.value))}
              className="input-field mt-1"
            />
          </label>
          <label className="block text-sm font-medium">
            {t.dashboard.weeklyTopics}
            <input
              type="number"
              min={1}
              max={100}
              value={weekly}
              onChange={(e) => setWeekly(Number(e.target.value))}
              className="input-field mt-1"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
              {saving ? t.common.saving : t.common.save}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              {t.common.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <ProgressRing
            value={dailyGoalPct}
            label={t.dashboard.dailyGoal}
            caption={`${minutesToday}/${dailyGoal}`}
          />
          <ProgressRing
            value={weeklyGoalPct}
            label={t.dashboard.weeklyGoal}
            caption={`${topicsThisWeek}/${weeklyGoal}`}
          />
        </div>
      )}
    </div>
  );
}
