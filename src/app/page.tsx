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
      <section className="rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 px-6 py-16 text-center text-white sm:px-12">
        <span className="chip bg-white/15 text-white">{t.common.tagline}</span>
        <h1 className="mt-5 text-3xl font-bold sm:text-5xl">{t.landing.heroTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
          {t.landing.heroSubtitle}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn bg-white text-primary-700 hover:bg-slate-100">
            {t.landing.ctaPrimary}
          </Link>
          <Link href="/pricing" className="btn border border-white/40 text-white hover:bg-white/10">
            {t.landing.ctaSecondary}
          </Link>
        </div>
        <p className="mt-4 text-sm text-white/70">{t.landing.trialNote}</p>
      </section>

      <section className="mt-12">
        <h2 className="section-title text-center">{t.landing.featuresTitle}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} className="card">
              <feature.icon className="h-6 w-6 text-primary-600 dark:text-primary-400" aria-hidden />
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 text-center">
        <h2 className="section-title">{t.landing.readyToStart}</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {t.landing.joinThousands}
        </p>
        <div className="mt-6">
          <Link href="/signup" className="btn-primary inline-flex">
            {t.landing.ctaPrimary}
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
