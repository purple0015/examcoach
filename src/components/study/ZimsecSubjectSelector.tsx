"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2 } from "lucide-react";

type Subject = { id: string; name: string; format?: "pdf" | "txt" | "md" };

export function ZimsecSubjectSelector({ onChange }: { onChange?: (subject: string) => void }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem("zimsecSubject") || "";
    setSelected(stored);
    void fetch("/api/zimsec/subjects")
      .then((response) => response.json())
      .then((data) => {
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
        setWarning(data.warning || "");
      })
      .catch(() => setWarning("The ZIMSEC syllabus source is unavailable; using general mode."))
      .finally(() => setLoading(false));
  }, []);

  function change(value: string) {
    setSelected(value);
    window.localStorage.setItem("zimsecSubject", value);
    onChange?.(value);
  }

  const active = subjects.find((subject) => subject.id === selected);

  return (
    <section className="card border-primary-200 dark:border-primary-900/50" aria-label="ZIMSEC syllabus selector">
      <div className="flex items-start gap-3">
        {active ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">ZIMSEC syllabus mode</h2>
            {active && <span className="badge-success">Verified source loaded</span>}
            {!active && <span className="badge-warning">General mode</span>}
          </div>
          <p className="mt-1 text-sm text-brand-text-secondary dark:text-slate-400">
            Select a syllabus so generated answers can be checked against its objectives and terminology. PDFs are supported and converted to text on the server.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-text-secondary" aria-hidden />
            <select value={selected} onChange={(event) => change(event.target.value)} disabled={loading || subjects.length === 0} className="input w-full max-w-md">
              <option value="">No syllabus selected</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}{subject.format === "pdf" ? " (PDF)" : ""}</option>)}
            </select>
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading syllabuses" />}
          </div>
          {warning && <p className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />{warning}</p>}
        </div>
      </div>
    </section>
  );
}
