import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFlashcards } from "@/lib/gemini";
import { generateFlashcardsGroq, isGroqConfigured } from "@/lib/groq";
import { prisma } from "@/lib/db";
import { getTierLimits, getUserTier } from "@/lib/subscription";
import { isMethodAllowed } from "@/lib/study-methods";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!isMethodAllowed(tier, "flashcards")) {
    return NextResponse.json({ error: "Flashcards are not available on your plan" }, { status: 403 });
  }

  const { documentId, topic } = (await req.json()) as { documentId?: string; topic?: string };
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
  });
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const resolvedTopic = topic || doc.topics[0] || "General";
  const count = getTierLimits(tier).flashcardsPerBatch;

  try {
    let cards;
    if (isGroqConfigured()) {
      cards = await generateFlashcardsGroq(
        resolvedTopic,
        doc.filename,
        count,
        session.user.locale
      );
    } else {
      cards = await generateFlashcards(
        resolvedTopic,
        doc.filename,
        count,
        session.user.locale
      );
    }

    const created = await prisma.$transaction(
      cards.map((c) =>
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
