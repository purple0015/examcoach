"use client";

import Link from "next/link";
import { BookOpenCheck, Flame, Languages, Sparkles } from "lucide-react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";

export default function LandingPage() {
  const { t } = useI18n();

  const features = [
    { icon: Sparkles, title: t.landing.feature1Title, body: t.landing.feature1Body },
    { icon: BookOpenCheck, title: t.landing.feature2Title, body: t.landing.feature2Body },
    { icon: Flame, title: t.landing.feature3Title, body: t.landing.feature3Body },
    { icon: Languages, title: t.landing.feature4Title, body: t.landing.feature4Body },
  ];

  return (
    <AppShell>
      <div className="study-shell space-y-8">
        <section className="rounded-[28px] border border-primary-500/20 bg-primary-500/5 px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rail-pill">{t.common.tagline}</span>
          </div>
          <h1 className="max-w-xl text-3xl font-bold sm:text-5xl">{t.landing.heroTitle}</h1>
          <p className="mt-4 max-w-2xl text-base text-brand-text-secondary sm:text-lg">
            {t.landing.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-start gap-3">
            <Link href="/signup" className="btn-primary rounded-full">
              {t.landing.ctaPrimary}
            </Link>
            <Link href="/pricing" className="btn-secondary rounded-full">
              {t.landing.ctaSecondary}
            </Link>
          </div>
          <p className="mt-4 text-sm text-brand-text-secondary">{t.landing.trialNote}</p>
        </section>

        <section className="space-y-4">
          <h2 className="section-title">{t.landing.featuresTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="card group hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <feature.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" aria-hidden />
                  <span className="chip">Live</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-brand-text-secondary">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="soft-panel text-center">
          <h2 className="section-title">{t.landing.readyToStart}</h2>
          <p className="mt-3 text-sm text-brand-text-secondary">{t.landing.joinThousands}</p>
          <div className="mt-6">
            <Link href="/signup" className="btn-primary rounded-full inline-flex">
              {t.landing.ctaPrimary}
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
