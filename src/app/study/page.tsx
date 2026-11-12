"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import * as Icons from "lucide-react";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { STUDY_METHODS, isMethodAllowed, lowestTierWithMethod } from "@/lib/study-methods";
import { getPlanByTier } from "@/lib/plans";
import { SubscriptionStatus } from "@/types";
import { ZimsecSubjectSelector } from "@/components/study/ZimsecSubjectSelector";

export default function StudyMethodsPage() {
  const { t, format } = useI18n();
  const router = useRouter();
  const { status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/study");
    if (status === "authenticated") {
      void fetch("/api/subscription")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSubscription(data as SubscriptionStatus | null));
    }
  }, [status, router]);

  if (!subscription) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  const available = STUDY_METHODS.filter((m) => isMethodAllowed(subscription.tier, m.id));
  const locked = STUDY_METHODS.filter((m) => !isMethodAllowed(subscription.tier, m.id));

  return (
    <AppShell>
      <div className="study-shell space-y-6">
        <header className="mb-3">
          <div className="flex items-center gap-2">
            <span className="rail-pill">Practice</span>
            <span className="rail-pill">Study methods</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-[2.5rem]">{t.study.title}</h1>
          <p className="mt-2 text-sm text-brand-text-secondary dark:text-slate-400">{t.study.subtitle}</p>
        </header>

        <div className="soft-panel">
          <ZimsecSubjectSelector />
        </div>

        <div className="space-y-3">
          <h2 className="section-title">{t.study.available}</h2>
          <div className="mt-1 grid gap-4 sm:grid-cols-2">
            {available.map((method) => {
              const Icon = (Icons[method.icon as keyof typeof Icons] ?? Icons.BookOpen) as Icons.LucideIcon;
              return (
                <Link
                  key={method.id}
                  href={method.href}
                  className="card group transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500/40"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
                    <span className="chip">{method.minutes} min</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{t.study.methods[method.id].name}</h3>
                  <p className="mt-2 text-sm text-brand-text-secondary">
                    {t.study.methods[method.id].description}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-3 text-xs text-brand-text-secondary">
                    <span>
                      {t.study.duration}: {method.minutes} {t.common.minutes}
                    </span>
                    <span>
                      {t.study.intensity}: {t.study[method.intensity]}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {locked.length > 0 && (
          <>
            <h2 className="section-title mt-2">{t.study.lockedTitle}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {locked.map((method) => (
                <div key={method.id} className="card-muted">
                  <div className="flex items-center gap-2 text-brand-text-secondary">
                    <Lock className="h-4 w-4" aria-hidden />
                    <span className="text-xs uppercase tracking-wide">{t.common.locked}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{t.study.methods[method.id].name}</h3>
                  <p className="mt-1 text-sm text-brand-text-secondary dark:text-slate-400">
                    {t.study.methods[method.id].description}
                  </p>
                  <Link href="/pricing" className="btn-secondary mt-4 w-full justify-center rounded-full">
                    {format(t.study.unlockWith, {
                      plan: getPlanByTier(lowestTierWithMethod(method.id)).name,
                    })}
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
