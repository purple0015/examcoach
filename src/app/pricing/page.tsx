"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck, Zap, Globe, Users, GraduationCap } from "lucide-react";
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
  const [region, setRegion] = useState<"international" | "zimbabwe">("international");
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetch("/api/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSubscription(data as SubscriptionStatus | null));

    void fetch("/api/payments/pending")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPendingPayment(data));
  }, [status]);

  async function checkPaymentStatus() {
    if (!pendingPayment) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/paynow/check-status?reference=${pendingPayment.reference}`);
      const data = await res.json();
      if (data.status === "completed") {
        window.location.reload();
      } else {
        alert("Payment is still pending. If you just paid via EcoCash/InnBucks, please wait a few seconds and try again.");
      }
    } catch {
      alert("Failed to check status. Please contact support if you have already paid.");
    } finally {
      setCheckingStatus(false);
    }
  }

  async function subscribe(tier: SubscriptionTier) {
    if (status !== "authenticated") {
      router.push("/signup");
      return;
    }

    if (tier === "starter_free" || tier === "free_trial") {
      router.push("/dashboard");
      return;
    }

    setPending(tier);
    setError("");
    try {
      const endpoint = region === "zimbabwe" ? "/api/paynow/create-payment" : "/api/paypal/create-subscription";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { approvalUrl?: string; checkoutUrl?: string; error?: string };
      const url = data.checkoutUrl || data.approvalUrl;
      
      if (!res.ok || !url) {
        setError(data.error ?? t.common.error);
        return;
      }
      window.location.href = url;
    } catch {
      setError(t.common.error);
    } finally {
      setPending(null);
    }
  }

  return (
    <AppShell>
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">{t.pricing.title}</h1>
        <p className="mt-4 mx-auto max-w-2xl text-slate-500 dark:text-slate-400">
          {t.pricing.subtitle}
        </p>

        {/* Region Selector */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => setRegion("international")}
              className={`rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                region === "international"
                  ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              International (PayPal/Cards)
            </button>
            <button
              onClick={() => setRegion("zimbabwe")}
              className={`rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                region === "zimbabwe"
                  ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              Zimbabwe (EcoCash/InnBucks)
            </button>
          </div>
        </div>
      </header>

      {pendingPayment && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/30 dark:bg-amber-900/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            You have a pending {pendingPayment.gateway === 'paynow' ? 'local' : ''} payment for the <strong>{PLANS.find(p => p.id === pendingPayment.tier)?.name}</strong> plan.
          </p>
          <button 
            onClick={() => void checkPaymentStatus()}
            disabled={checkingStatus}
            className="mt-2 text-xs font-bold uppercase tracking-wider text-amber-600 hover:underline dark:text-amber-400"
          >
            {checkingStatus ? "Checking..." : "Click here to confirm payment & activate"}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-8 rounded-lg bg-red-50 p-4 text-center text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = subscription?.tier === plan.id;
          const isTrial = plan.id === "free_trial";
          const isStarter = plan.id === "starter_free";
          
          return (
            <article
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
                isCurrent ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-950" : "border-slate-200"
              }`}
            >
              {isTrial && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white shadow-sm">
                  Recommended
                </span>
              )}
              
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{plan.name}</h2>
                {isCurrent && <span className="chip bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">{t.pricing.currentPlan}</span>}
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold">
                  {plan.price === 0 ? (isTrial ? "Trial" : t.common.free) : formatCurrency(plan.price)}
                </span>
                {plan.price > 0 && <span className="ml-1 text-sm text-slate-500">{t.common.perMonth}</span>}
                {isTrial && <span className="ml-1 text-sm text-slate-500">for 7 days</span>}
              </div>

              <div className="mb-6 flex-1">
                <p className="mb-4 text-sm font-medium text-slate-900 dark:text-slate-100">Key Features:</p>
                <ul className="space-y-3">
                  <FeatureItem text={`${plan.limits.dailyUploads} ${t.pricing.uploadsPerDay}`} />
                  <FeatureItem text={`${plan.studyMethods.length} ${t.study.title}`} />
                  <FeatureItem text={`${plan.limits.maxFileSizeMb}MB ${t.pricing.maxFileSize}`} />
                  <FeatureItem text={`${plan.limits.mockExamQuestions} ${t.pricing.questionsPerExam}`} />
                  {plan.limits.groqTokenLimit > 0 && (
                    <FeatureItem text={`${(plan.limits.groqTokenLimit / 1000).toLocaleString()}k Groq Tokens`} />
                  )}
                  {plan.maxSeats > 1 ? (
                    <FeatureItem text={`${plan.maxSeats} ${t.common.seats}`} icon={<Users className="h-4 w-4 text-primary-500" />} />
                  ) : (
                    <FeatureItem text={`${plan.maxSeats} Seat`} icon={<Users className="h-4 w-4 text-slate-400" />} />
                  )}
                  {plan.limits.hasPriorityInference && (
                    <FeatureItem text="Priority AI Processing" icon={<Zap className="h-4 w-4 text-amber-500" />} />
                  )}
                </ul>
              </div>

              <button
                type="button"
                disabled={isCurrent || pending === plan.id}
                onClick={() => void subscribe(plan.id)}
                className={`mt-auto w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
                  isCurrent 
                    ? "bg-slate-100 text-slate-400 cursor-default dark:bg-slate-800" 
                    : isTrial || plan.price > 20
                      ? "bg-primary-600 text-white hover:bg-primary-700 shadow-sm shadow-primary-200 dark:shadow-none"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                }`}
              >
                {isCurrent ? t.pricing.currentPlan : (pending === plan.id ? t.pricing.processing : (isTrial || isStarter ? "Start Now" : t.pricing.choosePlan))}
              </button>
            </article>
          );
        })}
      </div>

      <section className="mt-20 rounded-3xl bg-slate-50 p-8 dark:bg-slate-900/50">
        <h2 className="mb-8 text-center text-xl font-bold">Why upgrade?</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Full Study Suite</h3>
              <p className="mt-1 text-sm text-slate-500">Unlock all 14 study methods including Feynman Coaching and Mock Exams.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Turbo Inference</h3>
              <p className="mt-1 text-sm text-slate-500">Get priority access to Groq LPU processing for instant AI responses.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Global Language Support</h3>
              <p className="mt-1 text-sm text-slate-500">Study in Swahili, Arabic, Mandarin, and more with full AI support.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Collaborative Study</h3>
              <p className="mt-1 text-sm text-slate-500">Higher tiers allow multiple seats for families, classes, or NGOs.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">Past Paper Drills</h3>
              <p className="mt-1 text-sm text-slate-500">Practice with real exam formats and get detailed AI feedback.</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function FeatureItem({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      {icon ?? <Check className="h-4 w-4 text-emerald-500" aria-hidden />}
      <span className="text-sm text-slate-600 dark:text-slate-300">{text}</span>
    </li>
  );
}
