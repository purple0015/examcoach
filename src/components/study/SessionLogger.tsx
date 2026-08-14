"use client";

import { useState } from "react";
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
      setSaved(true);
    } catch {
      setError(t.common.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card mt-6">
      <h2 className="font-semibold">{t.study.logSession}</h2>
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
          {saving ? t.common.saving : t.study.logSession}
        </button>
      </div>
      {saved && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {t.study.sessionLogged}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
