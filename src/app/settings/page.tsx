"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { SubscriptionStatus } from "@/types";
import { getPlanByTier } from "@/lib/plans";

export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?callbackUrl=/settings");
    if (status === "authenticated") {
      void fetch("/api/subscription")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setSubscription(data as SubscriptionStatus | null));
    }
  }, [status, router]);

  return (
    <AppShell width="narrow">
      <h1 className="text-2xl font-bold sm:text-3xl">{t.settings.title}</h1>

      <section className="card mt-6">
        <h2 className="font-semibold">{t.settings.appearance}</h2>

        <div className="mt-4">
          <p className="text-sm font-medium">{t.common.language}</p>
          <p className="text-xs text-brand-text-secondary dark:text-slate-400">{t.settings.languageDesc}</p>
          <div className="mt-3">
            <LanguageSwitcher variant="full" />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium">{t.common.theme}</p>
          <p className="text-xs text-brand-text-secondary dark:text-slate-400">{t.settings.themeDesc}</p>
          <div className="mt-3">
            <ThemeToggle variant="full" />
          </div>
        </div>
      </section>

      <section className="card mt-4">
        <h2 className="font-semibold">{t.settings.account}</h2>
        <p className="mt-3 text-sm text-brand-text-secondary dark:text-slate-400">
          {t.settings.signedInAs} <span className="font-medium">{session?.user?.email}</span>
        </p>
        {subscription && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {t.settings.plan}:{" "}
              <span className="font-semibold">{getPlanByTier(subscription.tier).name}</span>
              {subscription.isTrial && (
                <span className="ml-2 text-brand-text-secondary">
                  {t.dashboard.trialEnds} {subscription.trialDaysLeft} {t.common.days}
                </span>
              )}
            </p>
            <Link href="/pricing" className="btn-secondary">
              {t.common.upgrade}
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
