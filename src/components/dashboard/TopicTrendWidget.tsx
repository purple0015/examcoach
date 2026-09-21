"use client";
import { useEffect, useState } from "react";
import { BarChart3, Info } from "lucide-react";

type Topic = { topic: string; frequency: number; importanceScore: number; summary: string };
type Analysis = { id: string; topics: Topic[]; document: { filename: string } };
export function TopicTrendWidget() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  useEffect(() => { fetch("/api/gemini/analyze-topics").then((r) => r.ok ? r.json() : null).then((d) => setAnalyses(d?.analyses || [])); }, []);
  const topics = analyses.flatMap((a) => (Array.isArray(a.topics) ? a.topics : []).map((t) => ({ ...t, filename: a.document.filename }))).sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 8);
  return <section className="card mt-4"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary-600" /><div><h2 className="font-semibold">AI topic trends</h2><p className="text-xs text-brand-text-secondary">Importance-ranked coverage from your uploaded material</p></div></div>{topics.length ? <div className="mt-5 space-y-4">{topics.map((t, i) => <div key={`${t.filename}-${t.topic}`}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium"><span className="mr-2 text-xs text-slate-400">#{i + 1}</span>{t.topic}</span><span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">{t.importanceScore}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-primary-600" style={{ width: `${t.importanceScore}%` }} /></div><p className="mt-1 text-xs text-slate-500">{t.summary} · {t.frequency} mentions</p></div>)}</div> : <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"><Info className="h-4 w-4" />Upload study material to generate your ranked topic breakdown.</div>}</section>;
}
