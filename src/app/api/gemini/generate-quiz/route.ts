import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateQuiz } from "@/lib/gemini";
import { generateQuizGroq, isGroqConfigured } from "@/lib/groq";
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
  if (!isMethodAllowed(tier, "quiz")) {
    return NextResponse.json({ error: "Quizzes are not available on your plan" }, { status: 403 });
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
    await prisma.quizQuestion.deleteMany({
      where: {
        userId: session.user.id,
        documentId: doc.id,
        topic: resolvedTopic,
      },
    });
  }

  const count = 5; // Default quiz size

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
    let quiz;
    if (isGroqConfigured()) {
      try {
        quiz = await generateQuizGroq(
          resolvedTopic,
          documentContext,
          count,
          session.user.locale
        );
      } catch (groqError: any) {
        console.error("Groq quiz generation failed, falling back to Gemini:", groqError);
        // Seamless fallback to Gemini
        quiz = await generateQuiz(
          resolvedTopic,
          documentContext,
          count,
          session.user.locale
        );
      }
    } else {
      quiz = await generateQuiz(
        resolvedTopic,
        documentContext,
        count,
        session.user.locale
      );
    }

    const created = await prisma.quizQuestion.createMany({
      data: quiz.map((q) => ({
        userId: session.user.id,
        documentId: doc.id,
        topic: resolvedTopic,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    });

    const savedQuestions = await prisma.quizQuestion.findMany({
      where: {
        userId: session.user.id,
        documentId: doc.id,
        topic: resolvedTopic,
      },
      orderBy: { createdAt: "desc" },
      take: count,
    });

    return NextResponse.json({ quiz: savedQuestions });
  } catch (error) {
    console.error("Quiz generation error:", error);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
