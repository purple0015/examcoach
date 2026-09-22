"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Info } from "lucide-react";

type Topic = { topic: string; frequency: number; importanceScore: number; summary: string };
type Analysis = { id: string; topics: Topic[]; document?: { filename: string } | null };

export function TopicTrendWidget() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gemini/analyze-topics")
      .then((response) => (response.ok ? response.json() : { analyses: [] }))
      .then((data: { analyses?: Analysis[] }) => setAnalyses(data.analyses || []))
      .catch(() => setAnalyses([]))
      .finally(() => setLoading(false));
  }, []);

  const topics = useMemo(() => {
    const grouped = new Map<string, Topic & { documents: string[] }>();
    analyses.forEach((analysis) => analysis.topics.forEach((topic) => {
      const key = topic.topic.toLowerCase();
      const existing = grouped.get(key);
      if (existing) {
        existing.frequency += topic.frequency;
        existing.importanceScore = Math.max(existing.importanceScore, topic.importanceScore);
        if (analysis.document?.filename && !existing.documents.includes(analysis.document.filename)) existing.documents.push(analysis.document.filename);
      } else grouped.set(key, { ...topic, documents: analysis.document?.filename ? [analysis.document.filename] : [] });
    }));
    return [...grouped.values()].sort((a, b) => b.importanceScore - a.importanceScore || b.frequency - a.frequency).slice(0, 12);
  }, [analyses]);

  return (
    <section id="topic-trends" className="card mt-4 scroll-mt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary-600" /><div><h2 className="font-semibold">AI topic trends</h2><p className="text-sm text-brand-text-secondary dark:text-slate-400">Importance-ranked topics from your analysed material.</p></div></div>
        <Link href="/upload" className="btn-secondary shrink-0 px-3 py-1.5 text-xs">Analyse more</Link>
      </div>
      {loading ? <p className="mt-5 text-sm text-brand-text-secondary">Loading topic trends…</p> : topics.length === 0 ? <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800/50"><p>No topic analysis yet.</p><Link href="/upload" className="mt-2 inline-block font-semibold text-primary-600">Go to uploads to analyse your material</Link></div> : <ol className="mt-5 space-y-4">{topics.map((topic, index) => <li key={topic.topic}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="text-xs font-bold text-brand-text-secondary">#{index + 1}</span><span className="font-medium">{topic.topic}</span></div><p className="mt-1 text-xs text-brand-text-secondary dark:text-slate-400">{topic.summary}</p></div><span className="shrink-0 rounded-full bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">{topic.importanceScore}/100</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-primary-500" style={{ width: `${topic.importanceScore}%` }} /></div><p className="mt-1 flex items-center gap-1 text-[11px] text-brand-text-secondary"><Info className="h-3 w-3" />Mentioned {topic.frequency} time{topic.frequency === 1 ? "" : "s"}{topic.documents.length ? ` · ${topic.documents.length} document${topic.documents.length === 1 ? "" : "s"}` : ""}</p></li>)}</ol>}
    </section>
  );
}
