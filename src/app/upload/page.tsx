"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, FileText, UploadCloud } from "lucide-react";
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

  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<UploadQuota | null>(null);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [quotaRes, docsRes] = await Promise.all([
        fetch("/api/upload"), 
        fetch("/api/documents")
      ]);
      
      if (quotaRes.ok) {
        setQuota((await quotaRes.json()) as UploadQuota);
      } else {
        const data = await quotaRes.json().catch(() => ({}));
        setError(data.error || t.common.error);
      }

      if (docsRes.ok) {
        setDocuments((await docsRes.json()) as DocumentSummary[]);
      }
    } catch (err) {
      console.error("Load failed:", err);
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t.common.error]);

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

  if (status === "loading" || (loading && !quota)) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  // Fallback for quota failure to allow rendering the error message
  const displayQuota = quota || {
    canUpload: false,
    uploadsToday: 0,
    maxUploads: 0,
    uploadsRemaining: 0,
    maxFileSizeMb: 0,
    tier: "starter_free" as const,
  };

  const disabled = uploading || !displayQuota.canUpload;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t.upload.title}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">{t.upload.subtitle}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          
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
                : "border-stone-300 dark:border-stone-700"
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
                <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
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
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {t.upload.maxSize}: {displayQuota.maxFileSizeMb}MB · PDF, DOCX, TXT
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

          {!displayQuota.canUpload && quota && (
            <div className="card-muted mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">{t.upload.limitReached}</p>
              <Link href="/pricing" className="btn-primary">
                {t.upload.upgradeForMore}
              </Link>
            </div>
          )}

          {message && (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {message}
            </p>
          )}
        </section>

        <UploadQuotaCard quota={displayQuota} />
      </div>

      <section className="mt-8">
        <h2 className="section-title">{t.upload.recentUploads}</h2>
        {documents.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t.upload.noUploads}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {documents.map((doc) => (
              <li key={doc.id} className="card flex items-start gap-3 py-3">
                <FileText className="mt-1 h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.filename}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {t.upload.topics}: {doc.topics.join(", ") || "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
