"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";
import { AlertCircle, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const callbackUrl = useSearchParams().get("callbackUrl") ?? "/dashboard";

  const [loginType, setLoginType] = useState<"email" | "id">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", { 
        identifier: identifier.trim(), 
        password, 
        type: loginType,
        redirect: false 
      });
      setLoading(false);

      if (result?.error) {
        if (result.error === "TRIAL_EXPIRED") {
          setShowExpiredModal(true);
        } else {
          setError(t.auth.invalidCredentials);
        }
        return;
      }
      
      if (!result?.ok) {
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
      <div className="card relative overflow-hidden">
        <h1 className="text-2xl font-bold">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-brand-text-secondary dark:text-slate-400">{t.auth.loginSubtitle}</p>

        {/* Login Type Tabs */}
        <div className="mt-6 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => { setLoginType("email"); setError(""); }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
              loginType === "email" ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => { setLoginType("id"); setError(""); }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${
              loginType === "id" ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500"
            }`}
          >
            Organization ID
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="identifier" className="text-sm font-medium">
              {loginType === "email" ? t.auth.email : "Organization User ID"}
            </label>
            <input
              id="identifier"
              type={loginType === "email" ? "email" : "text"}
              required
              placeholder={loginType === "email" ? "name@example.com" : "e.g. HA-123456"}
              className="input-field mt-1"
              value={identifier}
              onChange={(e) => setIdentifier(loginType === "id" ? e.target.value.toUpperCase() : e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                {t.auth.password}
              </label>
              <Link href="/login/forgot-password" className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline">
                Forgot password?
              </Link>
            </div>
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

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? t.auth.signingIn : t.common.login}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500 dark:bg-slate-900">{t.auth.or}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="btn-secondary w-full justify-center"
        >
          {t.auth.googleContinue}
        </button>

        <p className="mt-6 text-center text-sm text-brand-text-secondary dark:text-slate-400">
          {t.auth.noAccount}{" "}
          <Link href="/signup" className="font-medium text-primary-600 dark:text-primary-400">
            {t.common.signup}
          </Link>
        </p>

        <p className="mt-2 text-center text-sm text-brand-text-secondary dark:text-slate-400">
          Have an Org ID?{" "}
          <Link href="/register-id" className="font-medium text-primary-600 dark:text-primary-400">
            Register it here
          </Link>
        </p>
      </div>

      {/* Trial Expired Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-in fade-in zoom-in duration-300">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <ShieldAlert className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold">Administrator Activation Required</h2>
            <p className="mt-2 text-brand-text-secondary dark:text-slate-400">
              Your organization&apos;s trial period has ended. Please contact your administrator to activate the full plan to continue studying.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowExpiredModal(false)}
                className="btn-primary w-full justify-center"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
