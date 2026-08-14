import { Locale } from "@/types";

export const LOCALES: Locale[] = ["en", "nd", "sn"];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "examcoach_locale";

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; flag: string }> = {
  en: { native: "English", english: "English", flag: "EN" },
  nd: { native: "isiNdebele", english: "Ndebele", flag: "ND" },
  sn: { native: "chiShona", english: "Shona", flag: "SN" },
};

/** BCP-47 tags used for the <html lang> attribute and AI prompts. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  nd: "nd-ZW",
  sn: "sn-ZW",
};

export const LOCALE_AI_NAMES: Record<Locale, string> = {
  en: "English",
  nd: "isiNdebele (Zimbabwean Northern Ndebele)",
  sn: "chiShona (Zimbabwean Shona)",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
