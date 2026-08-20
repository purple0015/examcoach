"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        setError(data.error);
      }
    } catch {
      setLoading(false);
      setError("An error occurred. Please try again.");
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        alert("Password reset successfully! Please log in.");
        router.push("/login");
      } else {
        setError(data.error);
      }
    } catch {
      setLoading(false);
      setError("An error occurred. Please try again.");
    }
  }

  return (
    <AppShell width="narrow">
      <div className="card">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {step === 1 ? "Enter your email to receive a 6-digit verification code." : "Enter the code sent to your email and your new password."}
        </p>

        {step === 1 ? (
          <form onSubmit={handleRequest} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <input
                required
                type="email"
                className="input-field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Verification Code (6 digits)</label>
              <input
                required
                maxLength={6}
                className="input-field mt-1 font-mono tracking-widest text-center text-lg"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">New Password</label>
              <input
                required
                type="password"
                className="input-field mt-1"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600 font-bold">{error}</p>}
            {message && <p className="text-sm text-primary-600 font-medium">{message}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? "Verifying..." : "Reset Password"}
            </button>
            <button type="button" onClick={() => setStep(1)} className="btn-secondary w-full justify-center">
              Back to Email
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-primary-600 dark:text-primary-400">
            {t.common.login}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
