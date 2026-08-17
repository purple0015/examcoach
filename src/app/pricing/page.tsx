"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { PLANS } from "@/lib/plans";
import { formatCurrency } from "@/lib/utils";
import { SubscriptionStatus, SubscriptionTier } from "@/types";

export default function PricingPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [pending, setPending] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetch("/api/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSubscription(data as SubscriptionStatus | null));
  }, [status]);

  async function subscribe(tier: SubscriptionTier) {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/pricing");
      return;
    }

    setPending(tier);
    setError("");
    try {
      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { approvalUrl?: string; error?: string };
      if (!res.ok || !data.approvalUrl) {
        setError(data.error ?? t.common.error);
        return;
      }
      window.location.href = data.approvalUrl;
    } catch {
      setError(t.common.error);
    } finally {
      setPending(null);
    }
  }

  return (
    <AppShell>
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{t.pricing.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.pricing.subtitle}</p>
      </header>

      {error && (
        <p role="alert" className="mb-4 text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const current = subscription?.tier === plan.id;
          return (
            <article
              key={plan.id}
              className={`card flex flex-col ${current ? "ring-2 ring-primary-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{plan.name}</h2>
                {current && <span className="chip">{t.pricing.currentPlan}</span>}
              </div>
              <p className="mt-2 text-3xl font-bold">
                {plan.price === 0 ? t.common.free : formatCurrency(plan.price)}
                {plan.price > 0 && (
                  <span className="text-sm font-normal text-slate-500">{t.common.perMonth}</span>
                )}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm">
                <Feature text={`${plan.limits.dailyUploads} ${t.pricing.uploadsPerDay}`} />
                <Feature text={`${plan.studyMethods.length} ${t.pricing.studyMethods}`} />
                <Feature text={`${plan.limits.maxFileSizeMb}MB ${t.pricing.maxFileSize}`} />
                <Feature
                  text={`${plan.limits.mockExamQuestions} ${t.pricing.questionsPerExam}`}
                />
                {plan.limits.groqTokenLimit > 0 && (
                  <Feature text={`${(plan.limits.groqTokenLimit / 1000).toLocaleString()}k Groq Tokens`} />
                )}
                <Feature text={`${plan.maxSeats} ${t.common.seats}`} />
              </ul>

              {plan.id !== "starter_free" && (
                <button
                  type="button"
                  disabled={current || pending === plan.id}
                  onClick={() => void subscribe(plan.id)}
                  className="btn-primary mt-5 w-full justify-center"
                >
                  {pending === plan.id ? t.pricing.processing : t.pricing.choosePlan}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
      <span className="text-slate-600 dark:text-slate-300">{text}</span>
    </li>
  );
}
