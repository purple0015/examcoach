"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, RefreshCw } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DocumentSummary, FlashcardItem, GenerationMode } from "@/types";

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
  const [generationMode, setGenerationMode] = useState<GenerationMode>("replace");
  const [analysisSummary, setAnalysisSummary] = useState("");
  const [analysisTopics, setAnalysisTopics] = useState<string[]>([]);

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

  async function generate(documentId: string, topic?: string, reset = false, modeOverride?: GenerationMode) {
    setGenerating(true);
    setError("");

    const nextMode = modeOverride ?? generationMode;
    if (reset || nextMode === "replace") {
      setIndex(0);
      setRevealed(false);
    }

    try {
      const res = await fetch("/api/gemini/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, topic, reset: reset || nextMode === "replace", mode: nextMode, reRunAnalysis: true }),
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

      if (data.analysis) {
        setAnalysisSummary(data.analysis.summary || "");
        setAnalysisTopics(Array.isArray(data.analysis.topics) ? data.analysis.topics : []);
      }

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
              <div key={doc.id} className="space-y-2">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void generate(doc.id, doc.topics[0], true, "replace")}
                  className="btn-secondary w-full justify-between"
                >
                  <span className="truncate">{doc.filename}</span>
                  <span>{generating ? t.common.loading : "Replace"}</span>
                </button>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => void generate(doc.id, doc.topics[0], false, "append")}>
                    Append
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => void generate(doc.id, doc.topics[0], true, generationMode)}>
                    Regenerate
                  </button>
                </div>
              </div>
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
  const activeDocId = card?.documentId ?? documents[0]?.id ?? "";
  const activeTopic = card?.topic ?? documents[0]?.topics[0] ?? "";

  return (
    <div className="card">
      <div className="flex items-center justify-between text-sm text-brand-text-secondary dark:text-slate-400">
        <span>
          {index + 1} {t.common.of} {cards.length}
        </span>
        <span className="chip">{card.topic}</span>
      </div>

      {(analysisSummary || analysisTopics.length > 0) && (
        <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50 p-3 dark:border-primary-900/40 dark:bg-primary-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">Detected material</p>
          {analysisSummary && <p className="mt-2 text-sm text-brand-text-primary dark:text-slate-200">{analysisSummary}</p>}
          {analysisTopics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {analysisTopics.slice(0, 6).map((topic) => (
                <span key={topic} className="badge-primary">{topic}</span>
              ))}
            </div>
          )}
        </div>
      )}

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
            if (activeDocId) {
              void generate(activeDocId, activeTopic, true, "replace");
            } else {
              setRevealed(false);
              setIndex(0);
            }
          }}
          className="btn-secondary"
        >
          Replace
        </button>
        <button
          type="button"
          disabled={generating}
          onClick={() => {
            if (activeDocId) {
              void generate(activeDocId, activeTopic, false, "append");
            }
          }}
          className="btn-secondary"
        >
          Append
        </button>
        <button
          type="button"
          disabled={generating}
          onClick={() => {
            if (activeDocId) {
              void generate(activeDocId, activeTopic, true, generationMode);
            }
          }}
          className="btn-ghost ml-auto"
        >
          {generating ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <RotateCcw className="mr-1 h-4 w-4" aria-hidden />
          )}
          {generating ? t.common.loading : "Regenerate"}
        </button>
      </div>
    </div>
  );
}
