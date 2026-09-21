"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
export function ZimsecSubjectSelector({ onChange }: { onChange?: (subject: string) => void }) {
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [warning, setWarning] = useState("");
  useEffect(() => { fetch("/api/zimsec/subjects").then((r) => r.json()).then((d) => { setSubjects(d.subjects || []); setWarning(d.warning || ""); }); }, []);
  function change(value: string) { setSelected(value); localStorage.setItem("zimsecSubject", value); onChange?.(value); }
  return <div className="card border-primary-200 dark:border-primary-900/50"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><div className="w-full"><h2 className="font-semibold">ZIMSEC syllabus alignment</h2><p className="mt-1 text-sm text-slate-500">AI content will follow the selected syllabus objectives and grading style.</p><select className="input-field mt-3 w-full" value={selected} onChange={(e) => change(e.target.value)}><option value="">General mode (no syllabus)</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{selected ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Syllabus selected. This preference is used by AI study sessions on this device.</p> : <p className="mt-2 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" />General mode warning: select a syllabus for ZIMSEC-aligned answers.</p>}{warning && <p className="mt-2 text-xs text-amber-700">{warning}</p>}</div></div></div>;
}
