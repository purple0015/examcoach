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
  sourceMaterial: string,
  count = 10,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ question: string; answer: string }[]> {
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

EXAMPLES OF FORBIDDEN META-QUESTIONS (DO NOT GENERATE THESE):
- ❌ "Which topic is covered in question 1?"
- ❌ "What is the recommended structure for Paper 3?"
- ❌ "How many marks are allocated to section B?"

EXAMPLES OF ALLOWED SUBJECT-MATTER FLASHCARDS (ALWAYS GENERATE THESE):
- ✅ "What is the primary difference between a stack and a queue?"
- ✅ "Define the term 'polymorphism' in object-oriented programming."
- ✅ "What is the time complexity of a binary search algorithm?"

Return JSON: {"flashcards": [{"question": string, "answer": string}]}
Answers must be concise (at most 3 sentences) and clear.`;

  const parsed = await generateJson<{ flashcards?: { question: string; answer: string }[] }>(prompt);
  return (parsed.flashcards ?? []).filter((c) => c.question && c.answer).slice(0, count);
}

export async function generateQuiz(
  topic: string,
  sourceMaterial: string,
  count = 5,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ id: string; question: string; options: string[]; correctAnswer: string; explanation: string }[]> {
  const prompt = `Create ${count} high-quality multiple-choice questions on "${topic}" from the material below.

MATERIAL:
---
${sourceMaterial}
---

${languageInstruction(locale)}

CRITICAL QUALITY RULE: 
NEVER generate meta-questions about the exam structure.
ONLY generate subject-matter questions.

Return JSON: {"quiz": [{"id": string, "question": string, "options": string[4], "correctAnswer": string, "explanation": string}]}
Ensure "options" contains exactly 4 choices and "correctAnswer" matches one of them exactly.`;

  const parsed = await generateJson<{
    quiz?: { id: string; question: string; options: string[]; correctAnswer: string; explanation: string }[];
  }>(prompt);

  return (parsed.quiz ?? [])
    .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4 && q.correctAnswer)
    .slice(0, count);
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

export async function generateRapidRecall(
  topic: string,
  sourceMaterial: string,
  count = 10,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ id: string; prompt: string; answer: string; hints: string[] }[]> {
  const prompt = `You are an expert tutor creating "Rapid Fire" recall prompts.
These prompts are designed for 4-second response times.

Target Topic: "${topic}"

Material Context:
---
${sourceMaterial.slice(0, 15000)}
---

${languageInstruction(locale)}

STRICT RULES:
1. Generate exactly ${count} bite-sized recall prompts.
2. The ANSWER must be exactly 1 to 3 words max.
3. Prompts should be direct and test single concepts/facts.
4. Provide 2-3 short hints for each prompt.

Return JSON: {"recalls": [{"id": string, "prompt": string, "answer": string, "hints": string[]}]}
`;

  const parsed = await generateJson<{ recalls?: { id: string; prompt: string; answer: string; hints: string[] }[] }>(
    prompt
  );
  return (parsed.recalls ?? []).slice(0, count);
}

export async function summarizeDocument(
  filename: string,
  content: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<{ summary: string; keyTopics: string[] }> {
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
  return {
    summary: parsed.summary ?? "",
    keyTopics: parsed.keyTopics ?? [],
  };
}

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
