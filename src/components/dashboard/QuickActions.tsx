"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { getMethodsForTier } from "@/lib/study-methods";
import { StudyMethodId, SubscriptionTier } from "@/types";

export function QuickActions({ tier }: { tier: SubscriptionTier }) {
  const { t } = useI18n();
  const methods = getMethodsForTier(tier).slice(0, 6);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{t.dashboard.quickActions}</h2>
        <Link href="/study" className="text-sm font-medium text-primary-600 dark:text-primary-400">
          {t.study.title}
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((method) => {
          const Icon = (Icons[method.icon as keyof typeof Icons] ??
            Icons.BookOpen) as Icons.LucideIcon;
          const copy = t.study.methods[method.id as StudyMethodId];
          return (
            <Link
              key={method.id}
              href={method.href}
              className="group flex items-start gap-3 rounded-xl border border-surface-border p-3 transition-colors hover:border-primary-400 hover:bg-primary-50/60 dark:border-slate-800 dark:hover:border-primary-600 dark:hover:bg-primary-950/30"
            >
              <Icon className="mt-0.5 h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{copy.name}</span>
                <span className="block text-xs text-brand-text-secondary dark:text-slate-400">
                  {method.minutes} {t.common.minutes}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
