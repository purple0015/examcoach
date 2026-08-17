import Groq from "groq-sdk";
import { Locale, MockExamQuestion } from "@/types";
import { DEFAULT_LOCALE, LOCALE_AI_NAMES } from "@/lib/i18n/config";

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

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
        content: systemMessage ?? "You are a helpful AI study assistant. You always respond in JSON format.",
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
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("Groq returned a non-JSON response");
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
  }>(prompt, "You are an expert tutor using the Feynman Technique. Be encouraging and precise.");

  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 0))),
    gaps: parsed.gaps ?? [],
    feedback: parsed.feedback ?? "",
    nextStep: parsed.nextStep ?? "",
  };
}

export async function generateFlashcardsGroq(
  topic: string,
  sourceName: string,
  count = 10,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ question: string; answer: string }[]> {
  const prompt = `Create ${count} exam-focused flashcards on "${topic}" from the material "${sourceName}".
${languageInstruction(locale)}
Return JSON: {"cards": [{"question": string, "answer": string}]}
Answers must be at most 3 sentences and testable in an exam.`;

  const parsed = await generateJson<{ cards?: { question: string; answer: string }[] }>(
    prompt,
    "You are a flashcard architect. Create clear, concise, and highly testable questions and answers."
  );
  return (parsed.cards ?? []).filter((c) => c.question && c.answer).slice(0, count);
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
  }>(prompt, "You are a quiz master. Create high-quality, ultra-fast MCQ questions.");

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

  const parsed = await generateJson<{ title?: string; questions?: MockExamQuestion[] }>(
    prompt,
    "You are a rigorous exam board examiner. Create challenging but fair MCQ questions."
  );

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
