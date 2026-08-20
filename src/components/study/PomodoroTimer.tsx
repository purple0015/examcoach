"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { ProgressRing } from "@/components/ui/ProgressRing";

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export function PomodoroTimer() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    setRunning(false);
    if (mode === "focus") {
      setCompleted((c) => c + 1);
      setMode("break");
      setSecondsLeft(BREAK_SECONDS);
    } else {
      setMode("focus");
      setSecondsLeft(FOCUS_SECONDS);
    }
  }, [secondsLeft, mode]);

  const total = mode === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
  const minutes = Math.floor(Math.max(secondsLeft, 0) / 60);
  const seconds = Math.max(secondsLeft, 0) % 60;

  return (
    <div className="card flex flex-col items-center">
      <ProgressRing
        value={((total - secondsLeft) / total) * 100}
        label={`${minutes}:${String(seconds).padStart(2, "0")}`}
        caption={mode === "focus" ? t.study.methods.pomodoro.name : t.common.today}
        size={200}
      />
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} className="btn-primary">
          {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
          {running ? t.common.cancel : t.study.startSession}
        </button>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setMode("focus");
            setSecondsLeft(FOCUS_SECONDS);
          }}
          className="btn-secondary"
        >
          <RotateCcw className="mr-1 h-4 w-4" aria-hidden />
          {t.common.retry}
        </button>
      </div>
      <p className="mt-4 text-sm text-brand-text-secondary dark:text-slate-400">
        {completed} × {t.study.methods.pomodoro.name}
      </p>
    </div>
  );
}
