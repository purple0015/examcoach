"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { StudyMethodId } from "@/types";

export function GuidedWorkspace({ method }: { method: StudyMethodId }) {
  const { t } = useI18n();
  const storageKey = `examcoach:notes:${method}`;
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  useEffect(() => {
    const timeout = setTimeout(() => window.localStorage.setItem(storageKey, notes), 400);
    return () => clearTimeout(timeout);
  }, [notes, storageKey]);

  return (
    <div className="card">
      <h2 className="font-semibold">{t.study.workspace}</h2>
      <textarea
        className="input-field mt-3 min-h-[280px]"
        placeholder={t.study.explanationPlaceholder}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.study.notesLocal}</p>
    </div>
  );
}
