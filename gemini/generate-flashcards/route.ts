import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateFlashcards } from "@/lib/gemini";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId, topic } = await req.json();
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: session.user.id },
  });

  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  try {
    const cards = await generateFlashcards(topic || doc.topics[0] || "General", doc.filename);
    const created = await Promise.all(
      cards.map((c) =>
        prisma.flashcard.create({
          data: {
            userId: session.user.id,
            documentId: doc.id,
            topic: topic || doc.topics[0] || "General",
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
