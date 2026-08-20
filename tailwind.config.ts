import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "var(--primary-50, #fff7ed)",
          100: "var(--primary-100, #ffedd5)",
          200: "var(--primary-200, #fed7aa)",
          300: "var(--primary-300, #fdba74)",
          400: "var(--primary-400, #fb923c)",
          500: "var(--primary-500, #f97316)",
          600: "var(--primary-600, #ea580c)",
          700: "var(--primary-700, #c2410c)",
          800: "var(--primary-800, #9a3412)",
          900: "var(--primary-900, #7c2d12)",
          950: "var(--primary-950, #431407)",
        },
        accent: {
          50: "var(--accent-50, #fffafb)",
          100: "var(--accent-100, #fff1f2)",
          400: "var(--accent-400, #fb7185)",
          500: "var(--accent-500, #f43f5e)",
          600: "var(--accent-600, #e11d48)",
        },
        success: { 50: "#f0fdf4", 100: "#dcfce7", 500: "#22c55e", 600: "#16a34a" },
        warning: { 50: "#fffbeb", 100: "#fef3c7", 500: "#f59e0b", 600: "#d97706" },
        danger: { 50: "#fef2f2", 100: "#fee2e2", 500: "#ef4444", 600: "#dc2626" },
        surface: {
          light: "#fafafa",
          dark: "#1c1917",
          "dark-elevated": "#292524",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.18)",
      },
      animation: {
        flip: "flip 0.6s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
