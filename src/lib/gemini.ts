import { GoogleGenerativeAI } from "@google/generative-ai";
import { Locale, MockExamQuestion } from "@/types";
import { DEFAULT_LOCALE, LOCALE_AI_NAMES } from "@/lib/i18n/config";

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.0-flash";
const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 500;
