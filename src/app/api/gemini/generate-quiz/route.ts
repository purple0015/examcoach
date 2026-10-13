import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDocumentText } from "@/lib/document-parser";
import { generateQuizGroq, isGroqConfigured } from "@/lib/groq";
import { generateQuiz, isGeminiConfigured, parseDocument } from "@/lib/gemini";

function normalizeMode(mode?: string): "replace" | "append" {
  return mode === "append" ? "append" : "replace";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId, topic, count, mode, reRunAnalysis } = await req.json();

    if (!documentId && !topic) {
      return NextResponse.json(
        { error: "Provide a documentId or a topic to generate a quiz" },
        { status: 400 }
      );
    }

    const resolvedMode = normalizeMode(mode);
    let sourceMaterial = "";
    let finalTopic = topic || "General Study";

    const doc = documentId
      ? await prisma.document.findUnique({
          where: { id: documentId, userId: session.user.id },
        })
      : null;

    if (documentId && !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (doc) {
      try {
        sourceMaterial = await getDocumentText(doc.fileUrl, doc.filename);
        if (!topic && doc.topics.length > 0) {
          finalTopic = doc.topics[0];
        }
        if (reRunAnalysis !== false) {
          const analysis = await parseDocument(sourceMaterial, session.user.locale);
          await prisma.document.update({
            where: { id: doc.id },
            data: {
              topics: analysis.topics,
              parsedAt: new Date(),
            },
          });
          doc.topics = analysis.topics;
        }
      } catch (err: any) {
        console.error("Quiz source material extraction failed:", err);
        if (err.message === "GEMINI_TEMPORARILY_UNAVAILABLE") {
          return NextResponse.json(
            {
              error: "GEMINI_TEMPORARILY_UNAVAILABLE",
              message: "AI document processing is temporarily unavailable. Please try again later.",
            },
            { status: 503, headers: { "Retry-After": "60" } }
          );
        }
        if (err.message === "FAILED_TO_EXTRACT_DOCUMENT_TEXT") {
          return NextResponse.json(
            { error: "FAILED_TO_EXTRACT_DOCUMENT_TEXT", message: "Could not parse document text. The file may be corrupt or protected." },
            { status: 500 }
          );
        }
        if (err.message === "INSUFFICIENT_TEXT") {
          return NextResponse.json(
            { error: "This document is too short to generate a meaningful quiz." },
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
        throw err;
      }
    }

    let quizItems: any[] = [];
    const requestedCount = count || 5;
    const material = sourceMaterial || `General knowledge about ${finalTopic}`;

    if (isGroqConfigured()) {
      try {
        quizItems = await generateQuizGroq(
          finalTopic,
          material,
          requestedCount,
          session.user.locale
        );
      } catch (groqError) {
        console.error("Groq quiz generation failed, trying Gemini fallback:", groqError);
      }
    }

    if (quizItems.length === 0 && isGeminiConfigured()) {
      try {
        quizItems = await generateQuiz(
          finalTopic,
          material,
          requestedCount,
          session.user.locale
        );
      } catch (geminiError) {
        console.error("Gemini quiz generation failed:", geminiError);
      }
    }

    if (!quizItems || quizItems.length === 0) {
      const errorMsg = !isGroqConfigured() && !isGeminiConfigured()
        ? "AI service is not configured. Please contact support."
        : "Failed to generate quiz questions. AI services might be temporarily overloaded.";

      return NextResponse.json(
        { error: errorMsg },
        { status: 503 }
      );
    }

    if (resolvedMode === "replace" && documentId) {
      await prisma.quizQuestion.deleteMany({
        where: {
          userId: session.user.id,
          documentId,
          topic: finalTopic,
        },
      });
    }

    await prisma.quizQuestion.createMany({
      data: quizItems.map((q: any) => ({
        userId: session.user.id,
        documentId: documentId || null,
        topic: finalTopic,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
      })),
    });

    const analysis = {
      documentId: documentId || undefined,
      topics: doc?.topics?.length ? doc.topics : [finalTopic],
      summary: doc ? `Study set analyzed for ${finalTopic}.` : `Generated study content for ${finalTopic}.`,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json({ quiz: quizItems, mode: resolvedMode, analysis });
  } catch (error: any) {
    console.error("Quiz generation route error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User session mismatch. Please log out and back in." }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An unexpected error occurred while generating your quiz." },
      { status: 500 }
    );
  }
}
