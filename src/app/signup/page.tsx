"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export default function SignupPage() {
  const { t, locale } = useI18n();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, locale }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t.auth.signupFailed);
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error || !signInResult?.ok) {
        setError(t.auth.signupFailed);
        setLoading(false);
        router.replace("/login");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError(t.auth.signupFailed);
      setLoading(false);
    }
  }

  return (
    <AppShell width="narrow">
      <div className="card">
        <h1 className="text-2xl font-bold">{t.auth.signupTitle}</h1>
        <p className="mt-1 text-sm text-brand-text-secondary dark:text-slate-400">{t.auth.signupSubtitle}</p>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">{t.common.language}</p>
          <LanguageSwitcher variant="full" />
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">
              {t.auth.name}
            </label>
            <input
              id="name"
              required
              autoComplete="name"
              className="input-field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              {t.auth.email}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input-field mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">
              {t.auth.password}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-brand-text-secondary dark:text-slate-400">{t.auth.passwordHint}</p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? t.auth.creatingAccount : t.landing.ctaPrimary}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-text-secondary dark:text-slate-400">
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="font-medium text-primary-600 dark:text-primary-400">
            {t.common.login}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
