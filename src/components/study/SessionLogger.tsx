"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { StudyMethodId } from "@/types";

/** Logs a completed study session so streaks and goals update. */
export function SessionLogger({
  method,
  defaultMinutes,
  topic,
}: {
  method: StudyMethodId;
  defaultMinutes: number;
  topic?: string;
}) {
  const { t } = useI18n();
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function logSession() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, durationMin: minutes, topics: topic ? [topic] : [] }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setXpEarned(data.xpEarned);
      setSaved(true);
    } catch {
      setError(t.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mt-6">
      <h2 className="font-semibold">{t.study.startSession}</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium">{t.common.minutes}</span>
          <input
            type="number"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="input-field mt-1 w-28"
          />
        </label>
        <button type="button" onClick={logSession} disabled={saving} className="btn-primary">
          {saving ? t.common.saving : t.study.startSession}
        </button>
      </div>
      {saved && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            {t.study.sessionLogged}
          </p>
          {xpEarned !== null && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-bold dark:bg-primary-950/30 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50">
              <Star className="h-3.5 w-3.5 fill-current text-accent-500" />
              {t.study.xpEarned.replace("{amount}", xpEarned.toString())}
            </div>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
