"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { UploadQuota } from "@/types";
import { percent } from "@/lib/utils";

export function UploadQuotaCard({ quota }: { quota: UploadQuota }) {
  const { t } = useI18n();
  const used = percent(quota.uploadsToday, quota.maxUploads);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t.upload.quota}</h2>
        <Upload className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden />
      </div>
      <p className="mt-2 text-3xl font-bold">
        {quota.uploadsRemaining}
        <span className="ml-2 text-sm font-medium text-stone-500 dark:text-stone-400">
          {t.dashboard.uploadsLeft}
        </span>
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${used}%` }} />
      </div>
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        {quota.uploadsToday} {t.common.of} {quota.maxUploads} · {t.upload.maxSize}{" "}
        {quota.maxFileSizeMb}MB
      </p>
      <Link href="/upload" className="btn-secondary mt-4 w-full">
        {t.nav.upload}
      </Link>
    </div>
  );
}
