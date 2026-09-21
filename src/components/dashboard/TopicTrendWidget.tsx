"use client";

import { useEffect, useState } from "react";
import { BarChart3, Info } from "lucide-react";

type Topic = { topic: string; frequency: number; importanceScore: number; summary: string; filename?: string };
type Analysis = { id: string; topics: Topic[]; document?: { filename: string } };

export function TopicTrendWidget() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/gemini/analyze-topics")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setAnalyses(Array.isArray(data?.analyses) ? data.analyses : []))
      .finally(() => setLoading(false));
  }, []);

  const topics = analyses
    .flatMap((analysis) => (Array.isArray(analysis.topics) ? analysis.topics : []).map((topic) => ({ ...topic, filename: analysis.document?.filename })))
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 8);
  const maximum = Math.max(...topics.map((topic) => topic.importanceScore), 1);

  return (
    <section className="card">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary-600" />
        <div><h2 className="font-semibold">AI topic trends</h2><p className="text-sm text-brand-text-secondary dark:text-slate-400">Ranked by frequency and exam importance in your analysed materials.</p></div>
      </div>
      {loading ? <p className="mt-4 text-sm text-brand-text-secondary">Loading topic analysis…</p> : topics.length === 0 ? <p className="mt-4 text-sm text-brand-text-secondary">Analyse an uploaded document to see ranked topics here.</p> : (
        <ol className="mt-4 space-y-4">
          {topics.map((topic, index) => <li key={`${topic.topic}-${index}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-semibold">{index + 1}. {topic.topic}</span><span className="badge-primary">{Math.round(topic.importanceScore)}/100</span></div><p className="mt-1 text-xs text-brand-text-secondary dark:text-slate-400">{topic.summary} · {topic.frequency} mention{topic.frequency === 1 ? "" : "s"}</p></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.max(4, (topic.importanceScore / maximum) * 100)}%` }} /></div></li>)}
        </ol>
      )}
      <p className="mt-4 flex items-start gap-2 text-xs text-brand-text-secondary dark:text-slate-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Importance is an AI estimate from the uploaded material, not a guarantee of examination frequency.</p>
    </section>
  );
}
