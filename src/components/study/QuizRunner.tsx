"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, CheckCircle2, XCircle, ChevronRight, RefreshCw, BookOpen } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DocumentSummary, QuizQuestion } from "@/types";

export function QuizRunner() {
  const { t } = useI18n();
  const [stage, setStage] = useState<"setup" | "loading" | "active" | "result">("setup");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/documents")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setDocuments(data));
  }, []);

  async function startQuiz() {
    if (!selectedDocId && !selectedTopic) return;
    setStage("loading");
    setError("");
    try {
      const res = await fetch("/api/gemini/generate-quiz", {
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
      
      setQuestions(data.quiz);
      setStage("active");
      setCurrentIdx(0);
      setUserAnswers({});
      setStartTime(Date.now());
    } catch (err: any) {
      setError(err.message);
      setStage("setup");
    }
  }

  async function finishQuiz() {
    const finalScore = questions.reduce((acc, q, idx) => {
      return acc + (userAnswers[idx] === q.correctAnswer ? 1 : 0);
    }, 0);
    setScore(finalScore);
    setStage("result");

    // Auto-log session
    const duration = Math.ceil((Date.now() - startTime) / 60000);
    const doc = documents.find(d => d.id === selectedDocId);
    void fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "quiz",
        durationMin: Math.max(1, duration),
        topics: [selectedTopic || doc?.topics[0] || "General"],
      }),
    });
  }

  function handleSelect(option: string) {
    if (userAnswers[currentIdx] !== undefined) return;
    setUserAnswers({ ...userAnswers, [currentIdx]: option });
  }

  if (stage === "setup") {
    return (
      <div className="card max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg dark:bg-primary-900/30">
            <Brain className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Interactive AI Quiz</h2>
            <p className="text-sm text-slate-500">Generate a custom quiz from your notes</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Select Document</label>
            <select
              className="input-field w-full"
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                const doc = documents.find(d => d.id === e.target.value);
                if (doc && doc.topics.length > 0) setSelectedTopic(doc.topics[0]);
              }}
            >
              <option value="">-- Choose a document --</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.filename}</option>
              ))}
            </select>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-white px-2 text-slate-400 dark:bg-slate-900">or</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Study Topic</label>
            <input
              type="text"
              placeholder="e.g. Photosynthesis, Supply & Demand..."
              className="input-field w-full"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <button
            onClick={startQuiz}
            disabled={!selectedDocId && !selectedTopic}
            className="btn-primary w-full py-3 mt-4 text-base font-semibold transition-all hover:scale-[1.01]"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (stage === "loading") {
    return (
      <div className="card text-center py-16 animate-pulse">
        <LoadingSpinner size="lg" className="mx-auto" />
        <h2 className="mt-6 text-xl font-bold">AI is generating your quiz</h2>
        <p className="text-slate-500 max-w-xs mx-auto mt-2">
          Analyzing your study material to create targeted questions...
        </p>
      </div>
    );
  }

  if (stage === "active") {
    const q = questions[currentIdx];
    const userChoice = userAnswers[currentIdx];
    const isAnswered = userChoice !== undefined;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="text-sm font-medium text-slate-500">
            Question <span className="text-slate-900 dark:text-white font-bold">{currentIdx + 1}</span> of {questions.length}
          </div>
          <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
            <div 
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="card animate-in fade-in slide-in-from-right-4 duration-300">
          <h2 className="text-lg font-bold sm:text-xl leading-relaxed">{q.question}</h2>
          
          <div className="mt-8 grid gap-3">
            {q.options.map((option, i) => {
              const isSelected = userChoice === option;
              const isCorrect = option === q.correctAnswer;
              
              let variantClasses = "border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 dark:border-slate-800 dark:hover:bg-primary-950/30";
              if (isAnswered) {
                if (isCorrect) variantClasses = "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400 ring-2 ring-emerald-500/20";
                else if (isSelected) variantClasses = "border-red-500 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-400 ring-2 ring-red-500/20";
                else variantClasses = "opacity-50 border-slate-200 dark:border-slate-800";
              }

              return (
                <button
                  key={i}
                  disabled={isAnswered}
                  onClick={() => handleSelect(option)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 text-left font-medium transition-all ${variantClasses}`}
                >
                  <span>{option}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="h-5 w-5 shrink-0" />}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Explanation</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isAnswered && (
            <button
              onClick={() => {
                if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
                else finishQuiz();
              }}
              className="btn-primary w-full mt-8 py-3 flex items-center justify-center gap-2 group"
            >
              {currentIdx < questions.length - 1 ? "Next Question" : "Finish Quiz"}
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (stage === "result") {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="card max-w-md mx-auto text-center space-y-8 animate-in zoom-in duration-500">
        <div>
          <div className="mx-auto w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center dark:bg-emerald-900/30">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h2 className="mt-6 text-3xl font-black">Great job!</h2>
          <p className="text-slate-500">Quiz session completed</p>
        </div>

        <div className="p-8 bg-slate-50 rounded-3xl dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
          <div className="text-5xl font-black text-primary-600">{percentage}%</div>
          <p className="mt-2 text-sm font-bold text-slate-500 uppercase tracking-widest">
            You scored {score} out of {questions.length}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setStage("setup")}
            className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5" /> Retake Quiz
          </button>
          <Link 
            href="/study"
            className="btn-secondary w-full py-4 text-base font-bold"
          >
            Back to Study Methods
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
