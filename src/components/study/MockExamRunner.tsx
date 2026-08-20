"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import { DocumentSummary, MockExamQuestion } from "@/types";

interface GeneratedExam {
  id: string;
  title: string;
  questions: MockExamQuestion[];
}

const TOPICS_CACHE_KEY = "examcoach:cache:exam-topics";
const EXAM_CACHE_KEY = "examcoach:cache:current-exam";
const ANSWERS_CACHE_KEY = "examcoach:cache:current-answers";
const RESULTS_SYNC_QUEUE = "examcoach:sync:results";

export function MockExamRunner({ pastPaperMode = false }: { pastPaperMode?: boolean }) {
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load cached topics first
    const cached = localStorage.getItem(TOPICS_CACHE_KEY);
    if (cached) setTopics(JSON.parse(cached));

    // Load active exam if exists
    const cachedExam = localStorage.getItem(EXAM_CACHE_KEY);
    const cachedAnswers = localStorage.getItem(ANSWERS_CACHE_KEY);
    if (cachedExam && cachedAnswers) {
      setExam(JSON.parse(cachedExam));
      setAnswers(JSON.parse(cachedAnswers));
    }

    void fetch("/api/documents")
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: DocumentSummary[]) => {
        const tps = Array.from(new Set(docs.flatMap((d) => d.topics))).slice(0, 12);
        setTopics(tps);
        localStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify(tps));
      })
      .catch(() => {});
  }, []);

  // Save progress locally
  useEffect(() => {
    if (exam && !submitted) {
      localStorage.setItem(EXAM_CACHE_KEY, JSON.stringify(exam));
      localStorage.setItem(ANSWERS_CACHE_KEY, JSON.stringify(answers));
    }
  }, [exam, answers, submitted]);

  // Sync results when back online
  useEffect(() => {
    if (isOnline) {
      const queue = JSON.parse(localStorage.getItem(RESULTS_SYNC_QUEUE) ?? "[]");
      if (queue.length > 0) {
        void Promise.all(
          queue.map((item: any) =>
            fetch("/api/quiz-results", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            })
          )
        ).then(() => localStorage.setItem(RESULTS_SYNC_QUEUE, "[]"));
      }
    }
  }, [isOnline]);

  async function generate() {
    if (!isOnline) {
      setError("AI exam generation requires an internet connection.");
      return;
    }
    setLoading(true);
    setError("");
    setSubmitted(false);
    try {
      const chosen = topicInput ? [topicInput] : topics.slice(0, 3);
      const res = await fetch("/api/gemini/generate-mock-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: chosen,
          difficulty: pastPaperMode ? "hard" : "medium",
          questionCount: pastPaperMode ? 15 : 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t.common.error);
        return;
      }
      const generated = (data as { exam: GeneratedExam }).exam;
      setExam(generated);
      setAnswers(new Array(generated.questions.length).fill(-1));
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!exam) return;
    const correct = exam.questions.filter((q, i) => answers[i] === q.correctIndex).length;
    const score = Math.round((correct / exam.questions.length) * 100);
    setSubmitted(true);
    localStorage.removeItem(EXAM_CACHE_KEY);
    localStorage.removeItem(ANSWERS_CACHE_KEY);

    const payload = {
      topic: exam.questions[0]?.topic ?? "General",
      score,
      totalQuestions: exam.questions.length,
      answers,
      mockExamId: exam.id,
    };

    if (isOnline) {
      await fetch("/api/quiz-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      const queue = JSON.parse(localStorage.getItem(RESULTS_SYNC_QUEUE) ?? "[]");
      queue.push(payload);
      localStorage.setItem(RESULTS_SYNC_QUEUE, JSON.stringify(queue));
    }
  }

  const correctCount = exam
    ? exam.questions.filter((q, i) => answers[i] === q.correctIndex).length
    : 0;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 text-sm">
            <span className="block font-medium">{t.study.topicPlaceholder}</span>
            <input
              className="input-field mt-1"
              list="exam-topics"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
            />
            <datalist id="exam-topics">
              {topics.map((topic) => (
                <option key={topic} value={topic} />
              ))}
            </datalist>
          </label>
          <button type="button" onClick={() => void generate()} disabled={loading} className="btn-primary">
            {loading ? t.common.loading : t.study.generate}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {exam && (
        <div className="card">
          <h2 className="font-semibold">{exam.title}</h2>
          <ol className="mt-4 space-y-6">
            {exam.questions.map((question, qi) => (
              <li key={`${question.question}-${qi}`}>
                <p className="font-medium">
                  {qi + 1}. {question.question}
                </p>
                <div className="mt-2 grid gap-2">
                  {question.options.map((option, oi) => {
                    const chosen = answers[qi] === oi;
                    const isCorrect = question.correctIndex === oi;
                    return (
                      <button
                        key={option}
                        type="button"
                        disabled={submitted}
                        onClick={() =>
                          setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))
                        }
                        className={cn(
                          "rounded-xl border px-4 py-2 text-left text-sm transition-colors",
                          submitted && isCorrect
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                            : submitted && chosen
                              ? "border-red-500 bg-red-50 dark:bg-red-950/40"
                              : chosen
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-950/40"
                                : "border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/60"
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                    {question.explanation}
                  </p>
                )}
              </li>
            ))}
          </ol>

          {submitted ? (
            <p className="mt-6 text-lg font-semibold">
              {correctCount} / {exam.questions.length} ·{" "}
              {Math.round((correctCount / exam.questions.length) * 100)}%
            </p>
          ) : (
            <button type="button" onClick={() => void submit()} className="btn-primary mt-6">
              {t.common.save}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
