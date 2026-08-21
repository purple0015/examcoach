"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, CheckCircle2, FileText, Trash2, UploadCloud, X } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { UploadQuotaCard } from "@/components/dashboard/UploadQuotaCard";
import { DocumentSummary, UploadQuota } from "@/types";

export default function UploadPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { status } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);

  const [quota, setQuota] = useState<UploadQuota | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [quotaRes, docsRes] = await Promise.all([fetch("/api/upload"), fetch("/api/documents")]);
    if (quotaRes.ok) setQuota((await quotaRes.json()) as UploadQuota);
    if (docsRes.ok) setDocuments((await docsRes.json()) as DocumentSummary[]);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/upload");
    if (status === "authenticated") void load();
  }, [status, router, load]);

  async function uploadFile(file: File) {
    if (!quota) return;
    setError("");
    setMessage("");

    if (file.size > quota.maxFileSizeMb * 1024 * 1024) {
      setError(t.upload.fileTooLarge);
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { error?: string; quota?: UploadQuota };

      if (!res.ok) {
        setError(data.error ?? t.common.error);
        if (data.quota) setQuota(data.quota);
        return;
      }

      setMessage(`${t.upload.success}: ${file.name}`);
      await load();
    } catch {
      setError(t.common.error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleResetAll() {
    setResetting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/documents/reset", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t.common.error);
        return;
      }

      setMessage(t.upload.resetUploadsSuccess);
      setDocuments([]);
      setShowResetModal(false);
      // Quota shouldn't change, but let's refresh to be safe and consistent
      await load();
    } catch {
      setError(t.common.error);
    } finally {
      setResetting(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadFile(file);
  }

  if (status === "loading" || !quota) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  const disabled = uploading || resetting || !quota.canUpload;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t.upload.title}</h1>
        <p className="text-sm text-brand-text-secondary dark:text-slate-400">{t.upload.subtitle}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`card flex flex-col items-center justify-center border-2 border-dashed py-14 text-center transition-colors ${
              dragging
                ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
                : "border-surface-border dark:border-slate-700"
            } ${disabled ? "opacity-60" : ""}`}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="lg" />
                <p className="mt-3 text-sm">{t.upload.uploading}</p>
              </>
            ) : (
              <>
                <UploadCloud
                  className="h-10 w-10 text-primary-600 dark:text-primary-400"
                  aria-hidden
                />
                <p className="mt-3 text-sm text-brand-text-primary dark:text-slate-300">
                  {t.upload.dropzone}{" "}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                    className="font-semibold text-primary-600 underline disabled:no-underline dark:text-primary-400"
                  >
                    {t.upload.browse}
                  </button>
                </p>
                <p className="mt-2 text-xs text-brand-text-secondary dark:text-slate-400">
                  {t.upload.maxSize}: {quota.maxFileSizeMb}MB · PDF, DOCX, TXT
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={handleSelect}
            />
          </div>

          {!quota.canUpload && (
            <div className="card-muted mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{t.upload.limitReached}</p>
              <Link href="/pricing" className="btn-primary">
                {t.upload.upgradeForMore}
              </Link>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {message && (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {message}
            </p>
          )}
        </section>

        <UploadQuotaCard quota={quota} />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="section-title">{t.upload.recentUploads}</h2>
          {documents.length > 0 && (
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-2 text-xs font-medium text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
              {t.upload.resetUploads}
            </button>
          )}
        </div>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-brand-text-secondary dark:text-slate-400">{t.upload.noUploads}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="card flex items-start gap-3 py-3">
                <FileText className="mt-1 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.filename}</p>
                  <p className="text-xs text-brand-text-secondary dark:text-slate-400">
                    {t.upload.topics}: {doc.topics.join(", ") || "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-xl font-bold text-brand-text-primary dark:text-white">
                {t.upload.resetUploadsTitle}
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <p className="text-sm text-brand-text-secondary dark:text-slate-400">
                {t.upload.resetUploadsDesc}
              </p>

              <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-xs font-medium leading-relaxed">
                  {t.upload.resetUploadsWarning}
                </p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="btn-secondary flex-1 justify-center"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleResetAll}
                disabled={resetting}
                className="flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {resetting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {t.upload.resetUploadsConfirm}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
