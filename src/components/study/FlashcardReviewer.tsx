"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, RefreshCw } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DocumentSummary, FlashcardItem } from "@/types";

const CONFIDENCE = ["low", "medium", "high"] as const;

export function FlashcardReviewer({ spaced = false }: { spaced?: boolean }) {
  const { t } = useI18n();
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<{ topics: string[]; summary: string; usedTopic: string } | null>(null);

  async function loadCards() {
    setLoading(true);
    const [cardsRes, docsRes] = await Promise.all([fetch("/api/flashcards"), fetch("/api/documents")]);
    if (cardsRes.ok) {
      const all = (await cardsRes.json()) as FlashcardItem[];
      setCards(
        spaced
          ? [...all].sort((a, b) => {
              if (!a.nextReview) return -1;
              if (!b.nextReview) return 1;
              return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
            })
          : all
      );
    }
    if (docsRes.ok) setDocuments((await docsRes.json()) as DocumentSummary[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaced]);

  const currentTopic = useMemo(() => {
    return analysis?.usedTopic || cards[index]?.topic || "General";
  }, [analysis, cards, index]);

  async function generate(documentId: string, topic?: string, reset = false, mode: "replace" | "append" = "replace") {
    setGenerating(true);
    setError("");

    if (reset) {
      setIndex(0);
      setRevealed(false);
    }

    try {
      const res = await fetch("/api/gemini/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, topic, reset, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "DOCUMENT_UNAVAILABLE") {
          setError(t.common.documentUnavailable);
        } else {
          setError(data.error ?? t.common.error);
        }
        return;
      }

      if (data.analysis) setAnalysis(data.analysis);
      if (data.flashcards) {
        setCards(data.flashcards);
        setIndex(0);
        setRevealed(false);
      } else {
        await loadCards();
      }
    } catch {
      setError(t.common.error);
    } finally {
      setGenerating(false);
    }
  }

  async function refreshDocuments() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) setDocuments((await res.json()) as DocumentSummary[]);
    } finally {
      setLoading(false);
    }
  }

  async function rate(confidence: (typeof CONFIDENCE)[number]) {
    const card = cards[index];
    if (!card) return;
    await fetch("/api/flashcards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, confidence }),
    });
    setRevealed(false);
    setIndex((i) => (i + 1) % cards.length);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-text-secondary dark:text-slate-400">{t.upload.noUploads}</p>
          <button
            onClick={() => void refreshDocuments()}
            disabled={loading}
            className="flex items-center text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        {documents.length > 0 ? (
          <div className="mt-4 space-y-2">
            {documents.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                type="button"
                disabled={generating}
                onClick={() => void generate(doc.id, doc.topics[0], true, "replace")}
                className="btn-secondary w-full justify-between"
              >
                <span className="truncate">{doc.filename}</span>
                <span>{generating ? t.common.loading : t.study.generate}</span>
              </button>
            ))}
          </div>
        ) : (
          <Link href="/upload" className="btn-primary mt-4">
            {t.nav.upload}
          </Link>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="card">
      {analysis && (
        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/60 p-3 dark:border-primary-900/50 dark:bg-primary-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">Material analysis</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(analysis.topics || []).slice(0, 5).map((topic) => (
              <span key={topic} className="chip">{topic}</span>
            ))}
          </div>
          {analysis.summary && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{analysis.summary}</p>}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-brand-text-secondary dark:text-slate-400">
        <span>
          {index + 1} {t.common.of} {cards.length}
        </span>
        <span className="chip">{currentTopic}</span>
      </div>

      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="mt-4 min-h-[180px] w-full rounded-2xl bg-surface-canvas p-6 text-left dark:bg-slate-800/60"
      >
        <p className="text-lg font-medium">{card.question}</p>
        {revealed && (
          <p className="mt-4 border-t border-surface-border pt-4 text-brand-text-primary dark:border-slate-700 dark:text-slate-300">
            {card.answer}
          </p>
        )}
      </button>

      <div className="mt-4 flex flex-wrap gap-2">
        {CONFIDENCE.map((level) => (
          <button key={level} type="button" onClick={() => void rate(level)} className="btn-secondary">
            {level}
          </button>
        ))}
        <button
          type="button"
          disabled={generating}
          onClick={() => {
            const doc = documents.find((d) => d.id === card.documentId) ?? documents[0];
            if (doc) {
              void generate(doc.id, currentTopic, true, "replace");
            }
          }}
          className="btn-ghost ml-auto"
        >
          {generating ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <RotateCcw className="mr-1 h-4 w-4" aria-hidden />
          )}
          {generating ? t.common.loading : t.common.retry}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-surface-border pt-4 dark:border-slate-700">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            const doc = documents.find((d) => d.id === card.documentId) ?? documents[0];
            if (doc) void generate(doc.id, currentTopic, false, "append");
          }}
        >
          Generate more
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            const doc = documents.find((d) => d.id === card.documentId) ?? documents[0];
            if (doc) void generate(doc.id, currentTopic, true, "replace");
          }}
        >
          Regenerate with same material
        </button>
      </div>
    </div>
  );
}

