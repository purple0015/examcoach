"use client";

import { useState } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type TopicTrend = {
  topic: string;
  frequency: number;
  importanceScore: number;
  summary: string;
};

export function TopicAnalysisButton({ documentId }: { documentId: string }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [topics, setTopics] = useState<TopicTrend[] | null>(null);
  const [error, setError] = useState("");

  async function analyzeTopics() {
    setAnalyzing(true);
    setError("");
    try {
      const response = await fetch("/api/gemini/analyze-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const data = (await response.json()) as { topics?: TopicTrend[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not analyze topics");
      setTopics(Array.isArray(data.topics) ? data.topics : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not analyze topics");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => void analyzeTopics()}
        disabled={analyzing}
        className="btn-secondary flex items-center gap-2 px-3 py-1 text-xs"
      >
        {analyzing ? <LoadingSpinner size="sm" /> : <BarChart3 size={13} />}
        {analyzing ? "Analyzing…" : "Analyze topics"}
      </button>
      {error && <p className="mt-2 max-w-xs text-xs text-red-600 dark:text-red-400">{error}</p>}
      {topics && (
        <div className="mt-3 rounded-lg border border-primary-100 bg-primary-50 p-3 dark:border-primary-900/40 dark:bg-primary-950/20">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-400">
            <Sparkles size={13} /> Topics analyzed
          </div>
          {topics.length === 0 ? (
            <p className="text-xs text-brand-text-secondary">No academic topics were found.</p>
          ) : (
            <ul className="space-y-2">
              {topics.slice(0, 8).map((topic) => (
                <li key={topic.topic}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold">{topic.topic}</span>
                    <span className="badge-primary">{topic.importanceScore}/100</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max(4, topic.importanceScore)}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-brand-text-secondary dark:text-slate-400">
                    {topic.summary} · {topic.frequency} mention{topic.frequency === 1 ? "" : "s"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-brand-text-secondary dark:text-slate-400">
            Saved to AI topic trends on your main dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
