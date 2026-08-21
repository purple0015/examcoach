import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFlashcards } from "@/lib/gemini";
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

  const { documentId, topic, reset } = (await req.json()) as { 
    documentId?: string; 
    topic?: string; 
    reset?: boolean 
  };
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
  });
  
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const resolvedTopic = topic || doc.topics[0] || "General";

  if (reset) {
    await prisma.flashcard.deleteMany({
      where: {
        userId: session.user.id,
        documentId: doc.id,
        topic: resolvedTopic,
      },
    });
  }

  const count = getTierLimits(tier).flashcardsPerBatch;

  // Fetch document content using robust parser
  let documentContext = doc.filename;
  if (doc.fileUrl) {
    try {
      documentContext = await getDocumentText(doc.fileUrl, doc.filename);
    } catch (err: any) {
      if (err.message === "INSUFFICIENT_TEXT") {
        return NextResponse.json(
          { error: "Could not extract text from document. Please upload a searchable PDF." },
          { status: 400 }
        );
      }
      if (err.message.startsWith("DOCUMENT_REUPLOAD_REQUIRED")) {
        return NextResponse.json(
          {
            error: "DOCUMENT_REUPLOAD_REQUIRED",
            message: "This document was stored on temporary storage and must be re-uploaded.",
          },
          { status: 422 }
        );
      }
      if (err.message.startsWith("DOCUMENT_UNAVAILABLE")) {
        const status = parseInt(err.message.split(":")[1]) || 422;
        return NextResponse.json(
          {
            error: "DOCUMENT_UNAVAILABLE",
            message: "The requested document could not be retrieved from cloud storage. Please re-upload the file.",
          },
          { status }
        );
      }
      console.error("Failed to fetch file content from fileUrl:", err);
    }
  }

  // Guardrail: Ensure text exists and is long enough
  if (!documentContext || documentContext.trim().length < 50) {
    return NextResponse.json(
      { error: "Document content is missing or unreadable. Please upload a higher quality document." },
      { status: 400 }
    );
  }

  try {
    let cards;
    if (isGroqConfigured()) {
      try {
        cards = await generateFlashcardsGroq(
          resolvedTopic,
          documentContext,
          count,
          session.user.locale
        );
      } catch (groqError: any) {
        console.error("Groq flashcard generation failed, falling back to Gemini:", groqError);
        // Seamless fallback to Gemini
        cards = await generateFlashcards(
          resolvedTopic,
          documentContext,
          count,
          session.user.locale
        );
      }
    } else {
      cards = await generateFlashcards(
        resolvedTopic,
        documentContext,
        count,
        session.user.locale
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
              documentId: doc.id,
              topic: resolvedTopic,
              question: c.question,
              answer: c.answer,
            },
          })
        )
    );

    return NextResponse.json({ flashcards: created });
  } catch (error) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
  }
}
