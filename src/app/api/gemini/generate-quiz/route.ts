import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDocumentText } from "@/lib/document-parser";
import { generateQuizGroq, isGroqConfigured } from "@/lib/groq";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "Quiz generation is currently unavailable (API not configured)" },
      { status: 503 }
    );
  }

  try {
    const { documentId, topic, count } = await req.json();

    if (!documentId && !topic) {
      return NextResponse.json(
        { error: "Provide a documentId or a topic to generate a quiz" },
        { status: 400 }
      );
    }

    let sourceMaterial = "";
    let finalTopic = topic || "General Study";

    if (documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId, userId: session.user.id },
      });

      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      try {
        sourceMaterial = await getDocumentText(doc.fileUrl, doc.filename);
        if (!topic && doc.topics.length > 0) {
          finalTopic = doc.topics[0];
        }
      } catch (err: any) {
        if (err.message === "INSUFFICIENT_TEXT") {
          return NextResponse.json(
            { error: "This document is too short to generate a meaningful quiz." },
            { status: 400 }
          );
        }
        if (err.message.startsWith("DOCUMENT_REUPLOAD_REQUIRED")) {
          return NextResponse.json(
            { error: "This file was uploaded to local storage and is no longer available. Please re-upload it." },
            { status: 410 }
          );
        }
        throw err;
      }
    }

    // Use Groq to generate the quiz
    // If no sourceMaterial, it will generate a general quiz based on the topic string
    const quizItems = await generateQuizGroq(
      finalTopic,
      sourceMaterial || `General knowledge about ${finalTopic}`,
      count || 5,
      session.user.locale
    );

    if (!quizItems || quizItems.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate quiz questions. Try a different topic or document." },
        { status: 500 }
      );
    }

    // Store the generated quiz questions in Prisma for later review/analytics
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

    return NextResponse.json({ quiz: quizItems });
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating your quiz." },
      { status: 500 }
    );
  }
}
