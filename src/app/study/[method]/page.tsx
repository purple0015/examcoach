"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FlashcardReviewer } from "@/components/study/FlashcardReviewer";
import { FeynmanCoach } from "@/components/study/FeynmanCoach";
import { PomodoroTimer } from "@/components/study/PomodoroTimer";
import { MockExamRunner } from "@/components/study/MockExamRunner";
import { GuidedWorkspace } from "@/components/study/GuidedWorkspace";
import { SessionLogger } from "@/components/study/SessionLogger";
import { WeaknessHeatmap } from "@/components/dashboard/WeaknessHeatmap";
import { getMethodBySlug, isMethodAllowed, lowestTierWithMethod } from "@/lib/study-methods";
import { getPlanByTier } from "@/lib/plans";
import { DashboardStats, SubscriptionStatus } from "@/types";

export default function StudyMethodPage({ params }: { params: { method: string } }) {
  const { t, format } = useI18n();
  const router = useRouter();
  const { status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const method = getMethodBySlug(params.method);

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?callbackUrl=/study/${params.method}`);
    if (status === "authenticated") {
      void fetch("/api/subscription")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSubscription(data as SubscriptionStatus | null));
      void fetch("/api/stats")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setStats(data as DashboardStats | null));
    }
  }, [status, router, params.method]);

  if (!method) notFound();

  if (!subscription) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      </AppShell>
    );
  }

  const allowed = isMethodAllowed(subscription.tier, method.id);
  const methodKey = method.id as keyof typeof t.study.methods;
  const copy = t.study.methods[methodKey] ?? {
    name: method.id,
    description: "",
  };

  return (
    <AppShell>
      <header className="mb-6">
        <Link href="/study" className="text-sm text-primary-600 dark:text-primary-400">
          ← {t.study.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{copy.name}</h1>
        <p className="text-sm text-brand-text-secondary dark:text-slate-400">{copy.description}</p>
      </header>

      {!allowed ? (
        <div className="card text-center">
          <Lock className="mx-auto h-8 w-8 text-brand-text-secondary" aria-hidden />
          <p className="mt-3 font-medium">{t.study.lockedTitle}</p>
          <p className="mt-1 text-sm text-brand-text-secondary dark:text-slate-400">
            {format(t.study.unlockWith, {
              plan: getPlanByTier(lowestTierWithMethod(method.id)).name,
            })}
          </p>
          <Link href="/pricing" className="btn-primary mt-4">
            {t.common.upgrade}
          </Link>
        </div>
      ) : (
        <>
          {method.id === "flashcards" && <FlashcardReviewer />}
          {method.id === "spaced_repetition" && <FlashcardReviewer spaced />}
          {method.id === "feynman" && <FeynmanCoach />}
          {method.id === "pomodoro" && <PomodoroTimer />}
          {method.id === "mock_exam" && <MockExamRunner />}
          {method.id === "past_paper_drill" && <MockExamRunner pastPaperMode />}
          {method.id === "cohort_analytics" && (
            <WeaknessHeatmap cells={stats?.weaknessMatrix ?? []} />
          )}
          {[
            "active_recall",
            "cornell_notes",
            "blurting",
            "mind_map",
            "interleaving",
            "exam_blueprint",
            "peer_teaching",
          ].includes(method.id) && <GuidedWorkspace method={method.id} />}

          <SessionLogger method={method.id} defaultMinutes={method.minutes} />
        </>
      )}
    </AppShell>
  );
}
