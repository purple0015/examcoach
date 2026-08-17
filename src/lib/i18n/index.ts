import { Locale } from "@/types";
import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n/config";
import { Dictionary, en } from "@/lib/i18n/dictionaries/en";
import { nd } from "@/lib/i18n/dictionaries/nd";
import { sn } from "@/lib/i18n/dictionaries/sn";
import { fr } from "@/lib/i18n/dictionaries/fr";
import { es } from "@/lib/i18n/dictionaries/es";
import { pt } from "@/lib/i18n/dictionaries/pt";
import { ar } from "@/lib/i18n/dictionaries/ar";
import { zh } from "@/lib/i18n/dictionaries/zh";
import { sw } from "@/lib/i18n/dictionaries/sw";

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { 
  en, nd, sn, fr, es, pt, ar, zh, sw 
};

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return DICTIONARIES[normalizeLocale(locale)];
}

/** Replaces `{name}` placeholders in a translated string. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}
