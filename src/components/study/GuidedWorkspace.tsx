"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { StudyMethodId } from "@/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { Brain, CheckCircle2, AlertCircle } from "lucide-react";

interface Feedback {
  score: number;
  gaps: string[];
  feedback: string;
  nextStep: string;
}

export function GuidedWorkspace({ method }: { method: StudyMethodId }) {
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const storageKey = `examcoach:notes:${method}`;
  const topicKey = `examcoach:topic:${method}`;
  
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNotes(window.localStorage.getItem(storageKey) ?? "");
    setTopic(window.localStorage.getItem(topicKey) ?? "");
  }, [storageKey, topicKey]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      window.localStorage.setItem(storageKey, notes);
      window.localStorage.setItem(topicKey, topic);
    }, 400);
    return () => clearTimeout(timeout);
  }, [notes, topic, storageKey, topicKey]);

  async function getAiFeedback() {
    if (!notes.trim()) return;
    if (!isOnline) {
      setError("AI coaching requires an internet connection.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/gemini/study-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodId: method, content: notes, topic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.common.error);
        return;
      }
      setResult(data as Feedback);
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Brain className="h-5 w-5 text-primary-500" />
            {t.study.workspace}
          </h2>
          <button
            onClick={() => void getAiFeedback()}
            disabled={loading || !notes.trim() || !isOnline}
            className="btn-primary py-2 text-xs"
          >
            {loading ? t.common.loading : "Get AI Feedback"}
          </button>
        </div>
        
        <input
          className="input-field mb-3"
          placeholder={t.study.topicPlaceholder}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <textarea
          className="input-field min-h-[320px] font-mono text-sm leading-relaxed"
          placeholder={t.study.explanationPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t.study.notesLocal}</p>
      </div>

      {loading && (
        <div className="card flex justify-center py-8">
          <div className="text-center">
            <LoadingSpinner size="md" />
            <p className="mt-2 text-sm text-slate-500">AI is analyzing your study notes...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="card border-red-100 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {result && (
        <div className="card-muted animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">AI Tutor Feedback</h3>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black ${
              result.score >= 80 ? 'bg-emerald-100 text-emerald-700' : 
              result.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              {result.score}%
            </div>
          </div>
          
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Critique:</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{result.feedback}</p>
            </div>

            {result.gaps.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Knowledge Gaps Identified:</p>
                <ul className="mt-2 space-y-2">
                  {result.gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 dark:border-primary-900/30 dark:bg-primary-900/10">
              <p className="text-sm font-bold text-primary-900 dark:text-primary-300">Next Recommended Step:</p>
              <p className="mt-1 text-sm text-primary-700 dark:text-primary-400">{result.nextStep}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
