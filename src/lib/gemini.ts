import { GoogleGenerativeAI } from "@google/generative-ai";
import { Locale, MockExamQuestion } from "@/types";
import { DEFAULT_LOCALE, LOCALE_AI_NAMES } from "@/lib/i18n/config";

// Gemini 2.5 models are no longer available for generateContent.
// We default to gemini-3.6-flash and transparently migrate old values.
const CONFIGURED_MODEL = process.env.GEMINI_MODEL?.trim();
const MODEL = !CONFIGURED_MODEL || CONFIGURED_MODEL.includes("2.5")
  ? "gemini-3.6-flash"
  : CONFIGURED_MODEL;

const FALLBACK_MODEL = "gemini-1.5-flash";
const MAX_ATTEMPTS = 3;
const INITIAL_BACKOFF_MS = 500;

export class GeminiUnavailableError extends Error {
  code = "GEMINI_UNAVAILABLE" as const;

  constructor() {
    super("The AI service is temporarily unavailable");
    this.name = "GeminiUnavailableError";
  }
}

export function isGeminiUnavailableError(error: unknown): error is GeminiUnavailableError {
  return error instanceof GeminiUnavailableError || (error as { code?: string })?.code === "GEMINI_UNAVAILABLE";
}

function client(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

function languageInstruction(locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return "Write everything in clear English.";
  return [
    `Write every user-facing string in ${LOCALE_AI_NAMES[locale]}.`,
    "Keep subject-specific technical terms in English inside brackets the first time they appear,",
    "so the learner can still recognise them in an English exam context.",
  ].join(" ");
}

function isRetryableGeminiError(error: unknown): boolean {
  const value = error as { status?: number; code?: number | string; message?: string };
  const status = Number(value?.status ?? value?.code);
  const message = String(value?.message ?? error ?? "").toLowerCase();
  return (
    [404, 429, 500, 503].includes(status) ||
    /model.*(not found|not supported)|overloaded|resource exhausted|rate limit|temporarily unavailable|high demand/.test(
      message
    )
  );
}

function delay(attempt: number): Promise<void> {
  const exponential = INITIAL_BACKOFF_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * Math.max(1, exponential * 0.25));
  return new Promise((resolve) => setTimeout(resolve, exponential + jitter));
}

async function generateWithModel(modelName: string, prompt: string): Promise<string> {
  let lastError: unknown;
  const model = client().getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      lastError = error;
      if (!isRetryableGeminiError(error) || attempt === MAX_ATTEMPTS - 1) break;
      await delay(attempt);
    }
  }

  throw lastError;
}

async function generateJson<T>(prompt: string): Promise<T> {
  let text: string;
  try {
    text = await generateWithModel(MODEL, prompt);
  } catch (error) {
    // A missing/retired configured model or a busy preferred model should not
    // make generation fail when a supported fallback is available.
    if (MODEL === FALLBACK_MODEL) throw error;
    try {
      text = await generateWithModel(FALLBACK_MODEL, prompt);
    } catch (fallbackError) {
      if (isRetryableGeminiError(fallbackError)) throw new GeminiUnavailableError();
      throw fallbackError;
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("Gemini returned a non-JSON response");
    return JSON.parse(match[0]) as T;
  }
}

export async function parseDocument(content: string, locale: Locale = DEFAULT_LOCALE): Promise<{ topics: string[]; summary: string }> {
  const prompt = `You are a syllabus analyst for international secondary and tertiary exams.
${languageInstruction(locale)}
Extract the study topics from the material below.

Return JSON: {"topics": string[], "summary": string}
- topics: 3 to 12 concise topic names.
- summary: at most 2 sentences.

MATERIAL:
"""
${content.slice(0, 20000)}
"""`;
  const parsed = await generateJson<{ topics?: string[]; summary?: string }>(prompt);
  return { topics: (parsed.topics ?? []).filter(Boolean).slice(0, 12), summary: parsed.summary ?? "" };
}

export async function generateFlashcards(topic: string, sourceMaterial: string, count = 10, locale: Locale = DEFAULT_LOCALE): Promise<{ question: string; answer: string }[]> {
  const prompt = `You are an expert educational tutor creating study flashcards.

Target Topic: "${topic}"

Study Material Context:
---
${sourceMaterial}
---

${languageInstruction(locale)}

STRICT RULES:
1. Generate exactly ${count} flashcards testing academic and technical knowledge found in the study material.
2. CRITICAL: NEVER generate meta-questions about the exam structure, question numbers, or paper layouts.
3. Focus purely on subject definitions, algorithms, pseudocode, concepts, and problem-solving steps.

Return JSON: {"flashcards": [{"question": string, "answer": string}]}
Answers must be concise (at most 3 sentences) and clear.`;
  const parsed = await generateJson<{ flashcards?: { question: string; answer: string }[] }>(prompt);
  return (parsed.flashcards ?? []).filter((c) => c.question && c.answer).slice(0, count);
}

export async function generateQuiz(topic: string, sourceMaterial: string, count = 5, locale: Locale = DEFAULT_LOCALE): Promise<{ id: string; question: string; options: string[]; correctAnswer: string; explanation: string }[]> {
  const prompt = `Create ${count} high-quality multiple-choice questions on "${topic}" from the material below.

MATERIAL:
---
${sourceMaterial}
---

${languageInstruction(locale)}

CRITICAL QUALITY RULE: NEVER generate meta-questions about the exam structure. ONLY generate subject-matter questions.

Return JSON: {"quiz": [{"id": string, "question": string, "options": string[4], "correctAnswer": string, "explanation": string}]}
Ensure "options" contains exactly 4 choices and "correctAnswer" matches one of them exactly.`;
  const parsed = await generateJson<{ quiz?: { id: string; question: string; options: string[]; correctAnswer: string; explanation: string }[] }>(prompt);
  return (parsed.quiz ?? []).filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correctAnswer).slice(0, count);
}

export async function generateMockExam(topics: string[], difficulty: string, questionCount: number, locale: Locale = DEFAULT_LOCALE): Promise<{ title: string; questions: MockExamQuestion[] }> {
  const prompt = `Create a ${difficulty} difficulty mock exam with ${questionCount} multiple-choice questions covering these topics: ${topics.join(", ")}.
${languageInstruction(locale)}
Return JSON: {"title": string, "questions": [{"question": string, "options": string[4], "correctIndex": number, "explanation": string, "topic": string}]}`;
  const parsed = await generateJson<{ title?: string; questions?: MockExamQuestion[] }>(prompt);
  return { title: parsed.title ?? `Mock exam: ${topics[0] ?? "General"}`, questions: (parsed.questions ?? []).filter((q) => q.question && Array.isArray(q.options) && q.options.length > 1).slice(0, questionCount) };
}

export async function feynmanCoach(topic: string, explanation: string, locale: Locale = DEFAULT_LOCALE): Promise<{ score: number; gaps: string[]; feedback: string; nextStep: string }> {
  const prompt = `A learner explained "${topic}" in their own words. Coach them using the Feynman technique.
${languageInstruction(locale)}
Return JSON: {"score": number (0-100), "gaps": string[], "feedback": string, "nextStep": string}

LEARNER EXPLANATION:
"""
${explanation.slice(0, 8000)}
"""`;
  const parsed = await generateJson<{ score?: number; gaps?: string[]; feedback?: string; nextStep?: string }>(prompt);
  return { score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))), gaps: parsed.gaps ?? [], feedback: parsed.feedback ?? "", nextStep: parsed.nextStep ?? "" };
}

export async function studyCoach(methodId: string, content: string, topic?: string, locale: Locale = DEFAULT_LOCALE): Promise<{ score: number; gaps: string[]; feedback: string; nextStep: string }> {
  const methodNames: Record<string, string> = { active_recall: "Active Recall", cornell_notes: "Cornell Notes", blurting: "Blurting Technique", mind_map: "Mind Mapping", interleaving: "Interleaving" };
  const methodName = methodNames[methodId] || "Study Workspace";
  const topicContext = topic ? ` on the topic of "${topic}"` : "";
  const prompt = `You are a learning science expert. A student is using the ${methodName} technique${topicContext}. Review their provided notes/explanation below and provide coaching feedback.

${languageInstruction(locale)}

Return JSON: {"score": number (0-100), "gaps": string[], "feedback": string, "nextStep": string}

STUDENT CONTENT:
"""
${content.slice(0, 10000)}
"""`;
  const parsed = await generateJson<{ score?: number; gaps?: string[]; feedback?: string; nextStep?: string }>(prompt);
  return { score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))), gaps: parsed.gaps ?? [], feedback: parsed.feedback ?? "", nextStep: parsed.nextStep ?? "" };
}

export async function generateRapidRecall(topic: string, sourceMaterial: string, count = 10, locale: Locale = DEFAULT_LOCALE): Promise<{ id: string; prompt: string; answer: string; hints: string[] }[]> {
  const prompt = `You are an expert tutor creating "Rapid Fire" recall prompts for "${topic}". Generate exactly ${count} bite-sized prompts with 1-3 word answers and 2-3 short hints.

${languageInstruction(locale)}

MATERIAL:
---
${sourceMaterial.slice(0, 15000)}
---

Return JSON: {"recalls": [{"id": string, "prompt": string, "answer": string, "hints": string[]}]}`;
  const parsed = await generateJson<{ recalls?: { id: string; prompt: string; answer: string; hints: string[] }[] }>(prompt);
  return (parsed.recalls ?? []).slice(0, count);
}

export async function summarizeDocument(filename: string, content: string, locale: Locale = DEFAULT_LOCALE): Promise<{ summary: string; keyTopics: string[] }> {
  const prompt = `Summarize the following document for study purposes.
${languageInstruction(locale)}
Return JSON: {"summary": string, "keyTopics": string[]}
- summary: exactly 3 bullet points.
- keyTopics: list of 5-8 core academic topics.

DOCUMENT: ${filename}
"""
${content.slice(0, 15000)}
"""`;
  const parsed = await generateJson<{ summary?: string; keyTopics?: string[] }>(prompt);
  return { summary: parsed.summary ?? "", keyTopics: parsed.keyTopics ?? [] };
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
