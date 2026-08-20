"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { lightenDarkenColor } from "@/lib/utils";

export function OrgThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    const colors = session?.user?.orgColors;
    if (!colors) {
      // Clear variables if no org
      const root = document.documentElement;
      [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].forEach(n => {
        root.style.removeProperty(`--primary-${n}`);
      });
      [50, 100, 400, 500, 600].forEach(n => {
        root.style.removeProperty(`--accent-${n}`);
      });
      return;
    }

    const root = document.documentElement;
    const { primary, accent } = colors;

    // Primary scale
    if (primary) {
      root.style.setProperty("--primary-50", lightenDarkenColor(primary, 180));
      root.style.setProperty("--primary-100", lightenDarkenColor(primary, 150));
      root.style.setProperty("--primary-200", lightenDarkenColor(primary, 100));
      root.style.setProperty("--primary-300", lightenDarkenColor(primary, 50));
      root.style.setProperty("--primary-400", lightenDarkenColor(primary, 20));
      root.style.setProperty("--primary-500", primary);
      root.style.setProperty("--primary-600", lightenDarkenColor(primary, -20));
      root.style.setProperty("--primary-700", lightenDarkenColor(primary, -50));
      root.style.setProperty("--primary-800", lightenDarkenColor(primary, -80));
      root.style.setProperty("--primary-900", lightenDarkenColor(primary, -110));
      root.style.setProperty("--primary-950", lightenDarkenColor(primary, -140));
    }

    // Accent scale
    if (accent) {
      root.style.setProperty("--accent-50", lightenDarkenColor(accent, 180));
      root.style.setProperty("--accent-100", lightenDarkenColor(accent, 150));
      root.style.setProperty("--accent-400", lightenDarkenColor(accent, 20));
      root.style.setProperty("--accent-500", accent);
      root.style.setProperty("--accent-600", lightenDarkenColor(accent, -20));
    }
  }, [session?.user?.orgColors]);

  return <>{children}</>;
}
