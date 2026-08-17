import { Locale } from "@/types";

export const LOCALES: Locale[] = ["en", "nd", "sn", "fr", "es", "pt", "ar", "zh", "sw"];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "examcoach_locale";

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; flag: string }> = {
  en: { native: "English", english: "English", flag: "US" },
  nd: { native: "isiNdebele", english: "Ndebele", flag: "ZW" },
  sn: { native: "chiShona", english: "Shona", flag: "ZW" },
  fr: { native: "Français", english: "French", flag: "FR" },
  es: { native: "Español", english: "Spanish", flag: "ES" },
  pt: { native: "Português", english: "Portuguese", flag: "PT" },
  ar: { native: "العربية", english: "Arabic", flag: "SA" },
  zh: { native: "中文", english: "Mandarin", flag: "CN" },
  sw: { native: "Kiswahili", english: "Swahili", flag: "TZ" },
};

/** BCP-47 tags used for the <html lang> attribute and AI prompts. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  nd: "nd-ZW",
  sn: "sn-ZW",
  fr: "fr",
  es: "es",
  pt: "pt",
  ar: "ar",
  zh: "zh",
  sw: "sw",
};

export const LOCALE_AI_NAMES: Record<Locale, string> = {
  en: "English",
  nd: "isiNdebele (Zimbabwean Northern Ndebele)",
  sn: "chiShona (Zimbabwean Shona)",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  ar: "Arabic",
  zh: "Mandarin Chinese",
  sw: "Swahili",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
