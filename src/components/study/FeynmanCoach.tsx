"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Feedback {
  score: number;
  gaps: string[];
  feedback: string;
  nextStep: string;
}

export function FeynmanCoach() {
  const { t } = useI18n();
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [result, setResult] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/gemini/feynman-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, explanation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t.common.error);
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
    <div className="card">
      <form onSubmit={submit} className="space-y-3">
        <input
          className="input-field"
          placeholder={t.study.topicPlaceholder}
          value={topic}
          required
          onChange={(e) => setTopic(e.target.value)}
        />
        <textarea
          className="input-field min-h-[160px]"
          placeholder={t.study.explanationPlaceholder}
          value={explanation}
          required
          onChange={(e) => setExplanation(e.target.value)}
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t.common.loading : t.study.getFeedback}
        </button>
      </form>

      {loading && (
        <div className="mt-4 flex justify-center">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div className="card-muted mt-4">
          <p className="text-3xl font-bold">{result.score}%</p>
          <p className="mt-2 text-sm">{result.feedback}</p>
          {result.gaps.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-stone-600 dark:text-stone-300">
              {result.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm font-medium">{result.nextStep}</p>
        </div>
      )}
    </div>
  );
}
