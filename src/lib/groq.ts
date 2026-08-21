import Groq from "groq-sdk";
import { Locale, MockExamQuestion } from "@/types";
import { DEFAULT_LOCALE, LOCALE_AI_NAMES } from "@/lib/i18n/config";

const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";

const SYSTEM_PROMPT = `You are an expert AI study assistant. 
Generate study material based ONLY on the provided text.
You MUST respond ONLY with a valid JSON object matching the requested schema. 
Do NOT include markdown formatting, triple backticks, or extra commentary.`;

function client(): Groq {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey: key });
}

function languageInstruction(locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return "Write everything in clear English.";
  return [
    `Write every user-facing string in ${LOCALE_AI_NAMES[locale]}.`,
    "Keep subject-specific technical terms in English inside brackets the first time they appear,",
    "so the learner can still recognise them in an international exam context.",
  ].join(" ");
}

async function generateJson<T>(prompt: string, systemMessage?: string): Promise<T> {
  const chatCompletion = await client().chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemMessage ?? SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const text = chatCompletion.choices[0]?.message?.content?.trim() ?? "{}";

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) {
      console.error("Groq JSON Parse Error. Raw text:", text);
      throw new Error("Groq returned a non-JSON response");
    }
    return JSON.parse(match[0]) as T;
  }
}

export async function feynmanCoachGroq(
  topic: string,
  explanation: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ score: number; gaps: string[]; feedback: string; nextStep: string }> {
  const prompt = `A learner explained "${topic}" in their own words. Coach them using the Feynman technique.
${languageInstruction(locale)}
Return JSON: {"score": number (0-100), "gaps": string[], "feedback": string, "nextStep": string}

LEARNER EXPLANATION:
"""
${explanation.slice(0, 8000)}
"""`;

  const parsed = await generateJson<{
    score?: number;
    gaps?: string[];
    feedback?: string;
    nextStep?: string;
  }>(prompt);

  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))),
    gaps: parsed.gaps ?? [],
    feedback: parsed.feedback ?? "",
    nextStep: parsed.nextStep ?? "",
  };
}

export async function generateFlashcardsGroq(
  topic: string,
  sourceMaterial: string,
  count = 10,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ question: string; answer: string }[]> {
  return generateStudyMaterialGroq("flashcards", topic, sourceMaterial, count, locale);
}

export async function generateQuizGroq(
  topic: string,
  sourceMaterial: string,
  count = 5,
  locale: Locale = DEFAULT_LOCALE
): Promise<any[]> {
  return generateStudyMaterialGroq("quiz", topic, sourceMaterial, count, locale);
}

export async function generateStudyMaterialGroq(
  mode: "flashcards" | "quiz",
  topic: string,
  sourceMaterial: string,
  count: number,
  locale: Locale = DEFAULT_LOCALE
): Promise<any[]> {
  const flashcardSchema = `{"flashcards": [{"question": string, "answer": string}]}`;
  const quizSchema = `{"quiz": [{"id": string, "question": string, "options": string[4], "correctAnswer": string, "explanation": string}]}`;
  
  const schema = mode === "flashcards" ? flashcardSchema : quizSchema;
  const key = mode === "flashcards" ? "flashcards" : "quiz";

  const prompt = `Create ${count} exam-focused ${mode} items on "${topic}" from the material below.

MATERIAL:
---
${sourceMaterial.slice(0, 12000)}
---

${languageInstruction(locale)}

CRITICAL QUALITY RULE: 
NEVER generate meta-questions about the exam structure.
ONLY generate subject-matter items.

Return JSON: ${schema}
${mode === "quiz" ? 'Ensure "options" contains exactly 4 choices and "correctAnswer" matches one of them exactly.' : 'Answers must be at most 3 sentences and testable in an exam.'}`;

  const parsed = await generateJson<any>(prompt);
  const items = parsed[key] ?? [];

  if (mode === "flashcards") {
    return items.filter((c: any) => c.question && c.answer).slice(0, count);
  } else {
    return items
      .filter((q: any) => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correctAnswer)
      .slice(0, count);
  }
}

export async function quickQuizGroq(
  topic: string,
  count = 5,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ question: string; options: string[]; correctIndex: number }[]> {
  const prompt = `Generate ${count} quick multiple-choice questions on "${topic}".
${languageInstruction(locale)}
Return JSON: {"questions": [{"question": string, "options": string[4], "correctIndex": number}]}`;

  const parsed = await generateJson<{
    questions?: { question: string; options: string[]; correctIndex: number }[];
  }>(prompt);

  return (parsed.questions ?? []).slice(0, count);
}

export async function generateMockExamGroq(
  topics: string[],
  difficulty: string,
  questionCount: number,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ title: string; questions: MockExamQuestion[] }> {
  const prompt = `Create a ${difficulty} difficulty mock exam with ${questionCount} multiple-choice questions
covering these topics: ${topics.join(", ")}.
${languageInstruction(locale)}
Return JSON: {"title": string, "questions": [{"question": string, "options": string[4], "correctIndex": number, "explanation": string, "topic": string}]}`;

  const parsed = await generateJson<{ title?: string; questions?: MockExamQuestion[] }>(prompt);

  return {
    title: parsed.title ?? `Mock exam: ${topics[0] ?? "General"}`,
    questions: (parsed.questions ?? [])
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length > 1)
      .slice(0, questionCount),
  };
}

export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}
