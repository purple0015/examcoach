import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cards = await prisma.flashcard.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cards);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, confidence } = (await req.json()) as { id: string; confidence: "low" | "medium" | "high" };
  
  const card = await prisma.flashcard.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let interval = card.reviewInterval;
  if (confidence === "low") {
    interval = 1;
  } else if (confidence === "medium") {
    interval = Math.max(3, interval * 1.5);
  } else {
    interval = Math.max(7, interval * 2);
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + Math.round(interval));

  await prisma.flashcard.update({
    where: { id },
    data: { 
      confidence, 
      lastReviewed: new Date(),
      nextReview,
      reviewInterval: Math.round(interval),
    },
  });

  return NextResponse.json({ success: true });
}
