import { GoogleGenerativeAI } from "@google/generative-ai";
import { Locale, MockExamQuestion } from "@/types";
import { DEFAULT_LOCALE, LOCALE_AI_NAMES } from "@/lib/i18n/config";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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
    "so the learner can still recognise them in an English exam paper.",
  ].join(" ");
}

async function generateJson<T>(prompt: string): Promise<T> {
  const model = client().getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) throw new Error("Gemini returned a non-JSON response");
    return JSON.parse(match[0]) as T;
  }
}

export async function parseDocument(
  content: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ topics: string[]; summary: string }> {
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
  return {
    topics: (parsed.topics ?? []).filter(Boolean).slice(0, 12),
    summary: parsed.summary ?? "",
  };
}

export async function generateFlashcards(
  topic: string,
  sourceName: string,
  count = 10,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ question: string; answer: string }[]> {
  const prompt = `Create ${count} exam-focused flashcards on "${topic}" from the material "${sourceName}".
${languageInstruction(locale)}
Return JSON: {"cards": [{"question": string, "answer": string}]}
Answers must be at most 3 sentences and testable in an exam.`;

  const parsed = await generateJson<{ cards?: { question: string; answer: string }[] }>(prompt);
  return (parsed.cards ?? []).filter((c) => c.question && c.answer).slice(0, count);
}

export async function generateMockExam(
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

export async function feynmanCoach(
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

export async function studyCoach(
  methodId: string,
  content: string,
  topic?: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ score: number; gaps: string[]; feedback: string; nextStep: string }> {
  const methodNames: Record<string, string> = {
    active_recall: "Active Recall",
    cornell_notes: "Cornell Notes",
    blurting: "Blurting Technique",
    mind_map: "Mind Mapping",
    interleaving: "Interleaving Study",
    exam_blueprint: "Exam Blueprinting",
    peer_teaching: "Peer Teaching",
  };

  const methodName = methodNames[methodId] || "Study Workspace";
  const topicContext = topic ? ` on the topic of "${topic}"` : "";

  const prompt = `You are a learning science expert. A student is using the ${methodName} technique${topicContext}.
Review their provided notes/explanation below and provide coaching feedback.

${languageInstruction(locale)}

Return JSON: {"score": number (0-100), "gaps": string[], "feedback": string, "nextStep": string}
- score: reflect how effectively they used the technique and how complete their understanding appears.
- gaps: list specific areas or details missing from their notes.
- feedback: a supportive, academic critique of their work.
- nextStep: a specific task to improve their mastery.

STUDENT CONTENT:
"""
${content.slice(0, 10000)}
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

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
