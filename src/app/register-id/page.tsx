"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shared/AppShell";
import { useI18n } from "@/components/providers/I18nProvider";

export default function RegisterIdPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAlternatives([]);

    try {
      const res = await fetch("/api/auth/register-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tempPassword, name, email, password }),
      });
      const data = await res.json();
      setLoading(false);

      if (res.status === 409) {
        setError(data.error);
        setAlternatives(data.alternatives || []);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Failed to register ID");
        return;
      }

      alert("ID registered successfully! You can now log in.");
      router.push("/login");
    } catch {
      setLoading(false);
      setError("An unexpected error occurred");
    }
  }

  return (
    <AppShell width="narrow">
      <div className="card">
        <h1 className="text-2xl font-bold">Register Organization ID</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Claim your admin-generated ID to start studying.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Organization ID</label>
              <input
                required
                placeholder="e.g. GR-123456"
                className="input-field mt-1"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Temporary Password</label>
              <input
                required
                type="password"
                className="input-field mt-1"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
              />
            </div>
          </div>

          <hr className="my-2 border-slate-100 dark:border-slate-800" />

          <div>
            <label className="text-sm font-medium">Your Name</label>
            <input
              required
              className="input-field mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
          <div>
            <label className="text-sm font-medium">Set New Password</label>
            <input
              required
              type="password"
              className="input-field mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
              {alternatives.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 font-medium">Try one of these unclaimed IDs:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {alternatives.map(alt => (
                      <button
                        key={alt}
                        type="button"
                        onClick={() => setCode(alt)}
                        className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-600 shadow-sm transition-all hover:bg-red-50"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Registering..." : "Claim ID & Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-600 dark:text-primary-400">
            {t.common.login}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
