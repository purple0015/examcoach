"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<"email" | "id">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { 
        identifier: type === "email" ? identifier.toLowerCase() : identifier.toUpperCase(), 
        password, 
        type,
        redirect: false 
      });
      setLoading(false);

      if (result?.error || !result?.ok) {
        setError(t.auth.invalidCredentials);
        return;
      }
      router.replace(callbackUrl);
    } catch {
      setLoading(false);
      setError(t.auth.invalidCredentials);
    }
  }

  return (
    <AppShell width="narrow">
      <div className="card">
        <h1 className="text-2xl font-bold">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.auth.loginSubtitle}</p>

        <div className="mt-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800/50">
          <button
            onClick={() => setType("email")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
              type === "email" ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400" : "text-slate-500"
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => setType("id")}
            className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
              type === "id" ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400" : "text-slate-500"
            }`}
          >
            Login with ID
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="identifier" className="text-sm font-medium">
              {type === "email" ? t.auth.email : "Organization ID (e.g. GR-123456)"}
            </label>
            <input
              id="identifier"
              type={type === "email" ? "email" : "text"}
              required
              className="input-field mt-1"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
              autoComplete="current-password"
              className="input-field mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Link href="/login/forgot-password" className="text-xs font-medium text-primary-600 dark:text-primary-400">
              Forgot password?
            </Link>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? t.auth.signingIn : t.common.login}
          </button>
        </form>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="btn-secondary mt-3 w-full justify-center"
        >
          {t.auth.googleContinue}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Have an Organization ID?{" "}
          <Link href="/register-id" className="font-medium text-primary-600 dark:text-primary-400">
            Register it here
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {t.auth.noAccount}{" "}
          <Link href="/signup" className="font-medium text-primary-600 dark:text-primary-400">
            {t.common.signup}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
