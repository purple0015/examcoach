"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { cn } from "@/lib/utils";

export function NavBar() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/study", label: t.nav.study, icon: BookOpen },
    { href: "/upload", label: t.nav.upload, icon: Upload },
    { href: "/pricing", label: t.nav.pricing, icon: Sparkles },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  if (session?.user?.role === "admin") {
    links.push({ href: "/admin", label: t.nav.admin, icon: Shield });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface-light/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex max-w-[1280px] items-center gap-3 px-3 py-2.5 sm:px-4 lg:px-6">
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-500 text-sm text-white shadow-[0_8px_20px_-12px_rgba(242,140,56,0.9)]">
            E
          </span>
          <span className="hidden text-sm sm:inline">{t.common.appName}</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {session &&
            links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200",
                  pathname === href || pathname.startsWith(`${href}/`)
                    ? "border border-primary-500/30 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-950/40 dark:text-primary-300"
                    : "text-brand-text-secondary hover:bg-surface-canvas hover:text-brand-text-primary dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          {session ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn-ghost rounded-full"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t.common.logout}
            </button>
          ) : (
            <>
              <Link href="/login" className="btn-secondary rounded-full">
                {t.common.login}
              </Link>
              <Link href="/signup" className="btn-primary rounded-full">
                {t.common.getStarted}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-auto rounded-full border border-surface-border bg-surface-light p-2 md:hidden dark:border-slate-700 dark:bg-slate-900"
          aria-label={t.nav.menu}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-surface-border px-4 py-3 md:hidden dark:border-slate-800">
          <div className="flex flex-col gap-1">
            {session &&
              links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-brand-text-primary hover:bg-surface-canvas dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="mt-3 flex gap-2">
            {session ? (
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="btn-secondary w-full rounded-full">
                <LogOut className="h-4 w-4" aria-hidden />
                {t.common.logout}
              </button>
            ) : (
              <>
                <Link href="/login" className="btn-secondary flex-1 rounded-full">
                  {t.common.login}
                </Link>
                <Link href="/signup" className="btn-primary flex-1 rounded-full">
                  {t.common.getStarted}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
