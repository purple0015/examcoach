"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { DocumentSummary, MockExamQuestion } from "@/types";

interface GeneratedExam {
  id: string;
  title: string;
  questions: MockExamQuestion[];
}

export function MockExamRunner({ pastPaperMode = false }: { pastPaperMode?: boolean }) {
  const { t } = useI18n();
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [exam, setExam] = useState<GeneratedExam | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/documents")
      .then((res) => (res.ok ? res.json() : []))
      .then((docs: DocumentSummary[]) =>
        setTopics(Array.from(new Set(docs.flatMap((d) => d.topics))).slice(0, 12))
      );
  }, []);

  async function generate() {
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
      setStartTime(Date.now());
      setXpEarned(null);
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

    // Save result
    await fetch("/api/quiz-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: exam.questions[0]?.topic ?? "General",
        score,
        totalQuestions: exam.questions.length,
        answers,
        mockExamId: exam.id,
      }),
    });

    // Log study session and award XP
    const duration = Math.ceil((Date.now() - startTime) / 60000);
    try {
      const res = await fetch("/api/study-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "mock_exam",
          durationMin: Math.max(1, duration),
          topics: [exam.questions[0]?.topic ?? "General"],
          score,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setXpEarned(data.xpEarned);
      }
    } catch (err) {
      console.error("Failed to log session", err);
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
                                : "border-surface-border hover:bg-surface-canvas dark:border-slate-700 dark:hover:bg-slate-800/60"
                        )}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="mt-2 text-sm text-brand-text-secondary dark:text-slate-400">
                    {question.explanation}
                  </p>
                )}
              </li>
            ))}
          </ol>

          {submitted ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                <div className="p-2 bg-white rounded-full dark:bg-emerald-900">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {Math.round((correctCount / exam.questions.length) * 100)}%
                  </p>
                  <p className="text-sm font-bold text-emerald-600/80 uppercase tracking-wider">
                    {correctCount} / {exam.questions.length} Correct
                  </p>
                </div>
                {xpEarned !== null && (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-600 text-white rounded-full text-xs font-bold animate-bounce shadow-lg">
                      <Star className="h-3 w-3 fill-current" />
                      {t.study.xpEarned.replace("{amount}", xpEarned.toString())}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-center text-slate-500 font-medium">
                {t.study.sessionLogged}
              </p>
            </div>
          ) : (
            <button type="button" onClick={() => void submit()} className="btn-primary mt-6 w-full py-4 text-base font-bold shadow-lg shadow-primary-500/20">
              {t.common.save}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
