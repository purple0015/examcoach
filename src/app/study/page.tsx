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
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t.study.title}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">{t.study.subtitle}</p>
      </header>

      <h2 className="section-title">{t.study.available}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((method) => {
          const Icon = (Icons[method.icon as keyof typeof Icons] ??
            Icons.BookOpen) as Icons.LucideIcon;
          return (
            <Link key={method.id} href={method.href} className="card transition-shadow hover:shadow-md">
              <Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" aria-hidden />
              <h3 className="mt-3 font-semibold">{t.study.methods[method.id].name}</h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {t.study.methods[method.id].description}
              </p>
              <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                {t.study.duration}: {method.minutes} {t.common.minutes} · {t.study.intensity}:{" "}
                {t.study[method.intensity]}
              </p>
            </Link>
          );
        })}
      </div>

      {locked.length > 0 && (
        <>
          <h2 className="section-title mt-10">{t.study.lockedTitle}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((method) => (
              <div key={method.id} className="card-muted">
                <div className="flex items-center gap-2 text-stone-400">
                  <Lock className="h-4 w-4" aria-hidden />
                  <span className="text-xs uppercase tracking-wide">{t.common.locked}</span>
                </div>
                <h3 className="mt-3 font-semibold">{t.study.methods[method.id].name}</h3>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                  {t.study.methods[method.id].description}
                </p>
                <Link href="/pricing" className="btn-secondary mt-4 w-full justify-center">
                  {format(t.study.unlockWith, {
                    plan: getPlanByTier(lowestTierWithMethod(method.id)).name,
                  })}
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
