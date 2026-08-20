"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { DocumentSummary, FlashcardItem } from "@/types";

const CONFIDENCE = ["low", "medium", "high"] as const;
const CARDS_CACHE_KEY = "examcoach:cache:cards";
const DOCS_CACHE_KEY = "examcoach:cache:docs";
const SYNC_QUEUE_KEY = "examcoach:sync:ratings";

export function FlashcardReviewer({ spaced = false }: { spaced?: boolean }) {
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function loadCards() {
    setLoading(true);
    try {
      const [cardsRes, docsRes] = await Promise.all([fetch("/api/flashcards"), fetch("/api/documents")]);
      
      if (cardsRes.ok) {
        const all = (await cardsRes.json()) as FlashcardItem[];
        localStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(all));
        setCards(sortCards(all));
      }
      
      if (docsRes.ok) {
        const docs = (await docsRes.json()) as DocumentSummary[];
        localStorage.setItem(DOCS_CACHE_KEY, JSON.stringify(docs));
        setDocuments(docs);
      }
    } catch (err) {
      // Offline fallback
      const cachedCards = localStorage.getItem(CARDS_CACHE_KEY);
      const cachedDocs = localStorage.getItem(DOCS_CACHE_KEY);
      if (cachedCards) setCards(sortCards(JSON.parse(cachedCards)));
      if (cachedDocs) setDocuments(JSON.parse(cachedDocs));
    } finally {
      setLoading(false);
    }
  }

  function sortCards(all: FlashcardItem[]) {
    return spaced
      ? [...all].sort((a, b) => {
          if (!a.nextReview) return -1;
          if (!b.nextReview) return 1;
          return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
        })
      : all;
  }

  useEffect(() => {
    void loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaced]);

  // Sync queued ratings when online
  useEffect(() => {
    if (isOnline) {
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]");
      if (queue.length > 0) {
        void Promise.all(
          queue.map((item: any) =>
            fetch("/api/flashcards", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            })
          )
        ).then(() => localStorage.setItem(SYNC_QUEUE_KEY, "[]"));
      }
    }
  }, [isOnline]);

  async function generate(documentId: string) {
    if (!isOnline) {
      setError("AI generation requires an internet connection.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/gemini/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t.common.error);
        return;
      }
      await loadCards();
      setIndex(0);
    } finally {
      setGenerating(false);
    }
  }

  async function rate(confidence: (typeof CONFIDENCE)[number]) {
    const card = cards[index];
    if (!card) return;

    const payload = { id: card.id, confidence };

    if (isOnline) {
      await fetch("/api/flashcards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) ?? "[]");
      queue.push(payload);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }

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
        <p className="text-sm text-stone-500 dark:text-stone-400">{t.upload.noUploads}</p>
        {documents.length > 0 ? (
          <div className="mt-4 space-y-2">
            {documents.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                type="button"
                disabled={generating}
                onClick={() => void generate(doc.id)}
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
      <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
        <span>
          {index + 1} {t.common.of} {cards.length}
        </span>
        <span className="chip">{card.topic}</span>
      </div>

      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="mt-4 min-h-[180px] w-full rounded-2xl bg-stone-50 p-6 text-left dark:bg-stone-800/60"
      >
        <p className="text-lg font-medium">{card.question}</p>
        {revealed && (
          <p className="mt-4 border-t border-stone-200 pt-4 text-stone-600 dark:border-stone-700 dark:text-stone-300">
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
          onClick={() => {
            setRevealed(false);
            setIndex(0);
          }}
          className="btn-ghost ml-auto"
        >
          <RotateCcw className="mr-1 h-4 w-4" aria-hidden />
          {t.common.retry}
        </button>
      </div>
    </div>
  );
}
