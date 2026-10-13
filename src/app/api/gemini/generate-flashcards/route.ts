import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFlashcards, isGeminiConfigured, parseDocument } from "@/lib/gemini";
import { generateFlashcardsGroq, isGroqConfigured } from "@/lib/groq";
import { prisma } from "@/lib/db";
import { getTierLimits, getUserTier } from "@/lib/subscription";
import { isMethodAllowed } from "@/lib/study-methods";
import { getDocumentText } from "@/lib/document-parser";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!isMethodAllowed(tier, "flashcards")) {
    return NextResponse.json({ error: "Flashcards are not available on your plan" }, { status: 403 });
  }

  const { documentId, topic, reset, mode = "replace" } = (await req.json()) as {
    documentId?: string;
    topic?: string;
    reset?: boolean;
    mode?: "replace" | "append";
  };

  let doc = null as Awaited<ReturnType<typeof prisma.document.findFirst>>;
  if (documentId) {
    doc = await prisma.document.findFirst({
      where: { id: documentId, userId: session.user.id },
    });

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const resolvedTopic = (topic || doc?.topics?.[0] || "General").trim();

  if (reset || mode === "replace") {
    await prisma.flashcard.deleteMany({
      where: {
        userId: session.user.id,
        ...(documentId ? { documentId } : {}),
        ...(resolvedTopic ? { topic: resolvedTopic } : {}),
      },
    });
  }

  const count = getTierLimits(tier).flashcardsPerBatch;

  let documentContext = doc?.filename ?? "";
  if (doc?.fileUrl) {
    try {
      documentContext = await getDocumentText(doc.fileUrl, doc.filename);
    } catch (error: any) {
      if (error.message?.startsWith("DOCUMENT_REUPLOAD_REQUIRED") || error.message?.startsWith("DOCUMENT_UNAVAILABLE")) {
        return NextResponse.json(
          { error: "The requested document is no longer accessible. Please re-upload the file." },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: "Failed to process document." }, { status: 500 });
    }
  }

  const analysis = documentContext
    ? await parseDocument(documentContext, session.user.locale).catch(() => ({ topics: [], summary: "" }))
    : { topics: [], summary: "" };

  const detectedTopics = Array.from(
    new Set([...(doc?.topics ?? []), ...(analysis.topics ?? [])].filter(Boolean))
  );
  const finalTopic = resolvedTopic || detectedTopics[0] || "General";

  if (!documentContext || documentContext.trim().length < 50) {
    return NextResponse.json(
      { error: "Document content is missing or unreadable. Please upload a higher quality document." },
      { status: 400 }
    );
  }

  try {
    let cards;
    let generationError: any = null;

    if (isGroqConfigured()) {
      try {
        cards = await generateFlashcardsGroq(finalTopic, documentContext, count, session.user.locale);
      } catch (groqError: any) {
        console.error("Groq flashcard generation failed:", groqError.message);
        generationError = groqError;
      }
    }

    if (!cards && isGeminiConfigured()) {
      try {
        cards = await generateFlashcards(finalTopic, documentContext, count, session.user.locale);
      } catch (geminiError: any) {
        console.error("Gemini flashcard generation failed:", geminiError.message);
        generationError = geminiError;
      }
    }

    if (!cards) {
      const isGeminiUnavailable = generationError?.code === "GEMINI_UNAVAILABLE" || generationError?.message?.includes("high demand");
      const isGroqJsonError = generationError?.message?.includes("JSON");

      if (isGeminiUnavailable) {
        return NextResponse.json(
          { error: "AI service is temporarily overloaded. Please try again in a moment." },
          { status: 503 }
        );
      }

      if (isGroqJsonError) {
        return NextResponse.json(
          { error: "AI failed to generate valid flashcards. Please try a different topic or document." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "AI service is currently unavailable. Please try again later." },
        { status: 503 }
      );
    }

    const created = await prisma.$transaction(
      cards
        .filter((c: { question: string; answer: string }) => {
          const q = c.question.toLowerCase();
          const FORBIDDEN_WORDS = [
            "paper", "section", "question 1", "question 2", "short answer",
            "marks", "structure", "cover page", "instructions", "first question"
          ];
          return !FORBIDDEN_WORDS.some((word) => q.includes(word));
        })
        .map((c: { question: string; answer: string }) =>
          prisma.flashcard.create({
            data: {
              userId: session.user.id,
              documentId: doc?.id ?? null,
              topic: finalTopic,
              question: c.question,
              answer: c.answer,
            },
          })
        )
    );

    return NextResponse.json({
      flashcards: created,
      analysis: {
        topics: detectedTopics,
        summary: analysis.summary,
        usedTopic: finalTopic,
      },
    });
  } catch (error: any) {
    console.error("Flashcard generation final catch:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User session mismatch. Please log out and back in." }, { status: 401 });
    }
    return NextResponse.json({ error: "An unexpected error occurred during generation." }, { status: 500 });
  }
}

