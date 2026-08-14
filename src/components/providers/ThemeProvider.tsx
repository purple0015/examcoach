"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThemePreference } from "@/types";

export const THEME_COOKIE = "examcoach_theme";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: ThemePreference): "light" | "dark" {
  const resolved = theme === "system" ? (systemPrefersDark() ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({
  children,
  initialTheme = "system",
}: {
  children: React.ReactNode;
  initialTheme?: ThemePreference;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(applyTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    void fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

/**
 * Inline script that applies the persisted theme before hydration so the first
 * paint never flashes the wrong colour scheme.
 */
export const themeInitScript = `(() => {
  try {
    const match = document.cookie.match(/${THEME_COOKIE}=(light|dark|system)/);
    const pref = match ? match[1] : "system";
    const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {}
})();`;
