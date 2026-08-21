"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Brain, Timer, CheckCircle2, XCircle, ChevronRight, RefreshCw, BookOpen, AlertTriangle } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DocumentSummary, RecallPrompt } from "@/types";

const RECALL_TIME_LIMIT = 4; // seconds

export function ActiveRecallSession() {
  const { t } = useI18n();
  const [stage, setStage] = useState<"setup" | "loading" | "active" | "result">("setup");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  const [prompts, setPrompts] = useState<RecallPrompt[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserAnswers] = useState("");
  const [results, setResults] = useState<{ id: string; correct: boolean; responseTime: number }[]>([]);
  
  const [timeLeft, setTimeLeft] = useState(RECALL_TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setSessionStartTime] = useState<number>(0);
  const [error, setError] = useState("");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    void fetch("/api/documents")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDocuments(data));
  }, []);

  const finishSession = useCallback(async () => {
    setStage("result");
    if (timerRef.current) clearInterval(timerRef.current);

    // Auto-log session
    const duration = Math.ceil((Date.now() - startTime) / 60000);
    const doc = documents.find((d) => d.id === selectedDocId);
    void fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "active_recall",
        durationMin: Math.max(1, duration),
        topics: [selectedTopic || doc?.topics[0] || "General"],
      }),
    });
  }, [startTime, documents, selectedDocId, selectedTopic]);

  const nextQuestion = useCallback(() => {
    if (currentIdx < prompts.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setTimeLeft(RECALL_TIME_LIMIT);
      setUserAnswers("");
      setIsPaused(false);
    } else {
      void finishSession();
    }
  }, [currentIdx, prompts.length, finishSession]);

  const handleTimeout = useCallback(() => {
    const currentPrompt = prompts[currentIdx];
    if (!currentPrompt) return;
    setResults((prev) => [...prev, { id: currentPrompt.id, correct: false, responseTime: RECALL_TIME_LIMIT }]);
    setIsPaused(true);
    setTimeout(nextQuestion, 1500);
  }, [currentIdx, nextQuestion, prompts]);

  useEffect(() => {
    if (stage === "active" && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0.1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimeout();
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, isPaused, handleTimeout]);

  async function startSession() {
    if (!selectedDocId && !selectedTopic) return;
    setStage("loading");
    setError("");
    try {
      const res = await fetch("/api/gemini/generate-active-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDocId, topic: selectedTopic }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "DOCUMENT_UNAVAILABLE") {
          throw new Error(t.common.documentUnavailable);
        }
        throw new Error(data.error || "Generation failed");
      }

      setPrompts(data.recalls);
      setStage("active");
      setCurrentIdx(0);
      setResults([]);
      setTimeLeft(RECALL_TIME_LIMIT);
      setSessionStartTime(Date.now());
    } catch (err: any) {
      setError(err.message);
      setStage("setup");
    }
  }

  function submitAnswer(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (isPaused || !userInput.trim()) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsPaused(true);

    const currentPrompt = prompts[currentIdx];
    const responseTime = RECALL_TIME_LIMIT - timeLeft;
    
    // Rapid fire scoring: direct inclusion or similarity
    const isCorrect = 
      userInput.toLowerCase().trim() === (currentPrompt?.answer || "").toLowerCase().trim() ||
      (currentPrompt?.answer || "").toLowerCase().split(' ').some(word => userInput.toLowerCase().includes(word));

    setResults((prev) => [...prev, { id: currentPrompt?.id || "", correct: isCorrect, responseTime }]);
    
    setTimeout(nextQuestion, 1200);
  }

  if (stage === "setup") {
    return (
      <div className="card max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg dark:bg-primary-900/30">
            <Timer className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Rapid Active Recall</h3>
            <p className="text-sm text-brand-text-secondary">4-second rapid fire session</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Document</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="input-field"
            >
              <option value="">-- Study everything --</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.filename}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Specific Topic (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Mitochondria, Supply and Demand"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="input-field"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex gap-2 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={startSession}
            disabled={!selectedDocId && !selectedTopic}
            className="btn-primary w-full justify-center py-3"
          >
            Start Rapid Recall
          </button>
        </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="card max-w-2xl mx-auto flex flex-col items-center py-16">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-brand-text-secondary animate-pulse">Gemini is preparing your rapid-fire prompts...</p>
      </div>
    );
  }

  if (stage === "active") {
    const currentPrompt = prompts[currentIdx];
    const progress = (timeLeft / RECALL_TIME_LIMIT) * 100;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-bold uppercase tracking-wider text-brand-text-secondary">
            Question {currentIdx + 1} of {prompts.length}
          </span>
          <div className="flex items-center gap-2">
             <div className="relative" style={{ width: 40, height: 40 }}>
                <svg width="40" height="40" className="-rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    strokeWidth="4"
                    className="fill-none stroke-surface-border dark:stroke-slate-800"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={100.5}
                    strokeDashoffset={100.5 - (progress / 100) * 100.5}
                    className="fill-none stroke-primary-600 transition-[stroke-dashoffset] duration-100 dark:stroke-primary-400"
                  />
                </svg>
             </div>
             <span className="text-xl font-mono font-bold w-12">{timeLeft.toFixed(1)}s</span>
          </div>
        </div>

        <div className="card py-12 px-8 text-center min-h-[300px] flex flex-col justify-center items-center relative overflow-hidden">
          {isPaused && results[currentIdx] && (
             <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center backdrop-blur-sm transition-all duration-300 ${results[currentIdx].correct ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {results[currentIdx].correct ? (
                   <>
                    <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-2 animate-bounce" />
                    <p className="text-2xl font-bold text-emerald-600">Correct!</p>
                   </>
                ) : (
                  <>
                    <XCircle className="h-16 w-16 text-red-500 mb-2" />
                    <p className="text-xl font-bold text-red-600">Time&apos;s Up! or Incorrect</p>
                    <p className="mt-1 text-brand-text-primary">Answer: <span className="font-bold underline">{currentPrompt.answer}</span></p>
                  </>
                )}
             </div>
          )}

          <h2 className="text-2xl sm:text-3xl font-bold mb-8 leading-tight">
            {currentPrompt.prompt}
          </h2>

          <form onSubmit={submitAnswer} className="w-full max-w-md mx-auto">
            <input
              autoFocus
              autoComplete="off"
              value={userInput}
              onChange={(e) => setUserAnswers(e.target.value)}
              disabled={isPaused}
              placeholder="Type answer here..."
              className={`input-field text-center text-xl h-14 ${isPaused ? 'opacity-50' : ''}`}
            />
            <p className="mt-4 text-xs text-brand-text-secondary">
              Hints: {currentPrompt.hints.join(", ")}
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (stage === "result") {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = Math.round((correctCount / prompts.length) * 100);
    const avgTime = results.reduce((acc, r) => acc + r.responseTime, 0) / prompts.length;

    return (
      <div className="card max-w-2xl mx-auto text-center py-10 animate-in zoom-in duration-500">
        <div className="inline-flex p-4 bg-emerald-100 rounded-full dark:bg-emerald-900/30 mb-6">
          <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
        <p className="text-brand-text-secondary mb-8">You survived the rapid fire.</p>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="p-4 bg-surface-muted rounded-xl">
            <p className="text-sm text-brand-text-secondary mb-1">Accuracy</p>
            <p className="text-3xl font-bold text-primary-600">{accuracy}%</p>
          </div>
          <div className="p-4 bg-surface-muted rounded-xl">
            <p className="text-sm text-brand-text-secondary mb-1">Avg. Response</p>
            <p className="text-3xl font-bold text-primary-600">{avgTime.toFixed(1)}s</p>
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={() => setStage("setup")} className="btn-primary w-full justify-center py-3">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </button>
          <button onClick={() => window.location.reload()} className="btn-secondary w-full justify-center py-3">
             Finish Session
          </button>
        </div>
      </div>
    );
  }

  return null;
}
