"use client";

import { useEffect, useState } from "react";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { StudyMethodId } from "@/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function GuidedWorkspace({ method }: { method: StudyMethodId }) {
  const { t } = useI18n();
  const storageKey = `examcoach:notes:${method}`;
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; gaps: string[]; feedback: string; nextStep: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setNotes(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  useEffect(() => {
    const timeout = setTimeout(() => window.localStorage.setItem(storageKey, notes), 400);
    return () => clearTimeout(timeout);
  }, [notes, storageKey]);

  async function getCoaching() {
    if (!notes.trim() || notes.length < 50) {
      setError("Please write at least 50 characters to get meaningful feedback.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gemini/study-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodId: method, content: notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get feedback");
      setFeedback(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{t.study.workspace}</h2>
          <button
            onClick={getCoaching}
            disabled={loading || !notes.trim()}
            className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" /> : <Sparkles size={14} />}
            {t.study.getFeedback}
          </button>
        </div>
        <textarea
          className="input-field min-h-[280px]"
          placeholder={t.study.explanationPlaceholder}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            if (error) setError("");
          }}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-brand-text-secondary dark:text-slate-400">{t.study.notesLocal}</p>
          <span className={`text-[10px] font-medium ${notes.length < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {notes.length} characters
          </span>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-xs flex gap-2 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      {feedback && (
        <div className="card border-primary-100 bg-primary-50/30 dark:bg-primary-950/10 dark:border-primary-900/20 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-primary-700 dark:text-primary-400 flex items-center gap-2">
              <Sparkles size={18} />
              AI Learning Coach
            </h3>
            <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-primary-200 dark:border-primary-800 shadow-sm">
              <span className="text-sm font-bold text-primary-600">Mastery Score: {feedback.score}%</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm leading-relaxed text-brand-text-primary">{feedback.feedback}</p>
            </div>

            {feedback.gaps.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-secondary mb-2">Knowledge Gaps</h4>
                <ul className="space-y-1">
                  {feedback.gaps.map((gap, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Next Step
              </h4>
              <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">{feedback.nextStep}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
