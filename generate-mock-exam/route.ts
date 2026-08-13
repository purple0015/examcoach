import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateMockExam } from "@/lib/gemini";
import { getTierLimits, getActiveSubscription } from "@/lib/subscription";
import { prisma } from "@/lib/db";
import { SubscriptionTier } from "@/types";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topics, difficulty, questionCount } = await req.json();
  const subscription = await getActiveSubscription(session.user.id);
  const tier = (subscription?.tier ?? "free_trial") as SubscriptionTier;
  const limits = getTierLimits(tier);

  const count = Math.min(questionCount ?? 10, limits.mockExamQuestions);

  try {
    const exam = await generateMockExam(topics ?? ["General"], difficulty ?? "medium", count);
    const saved = await prisma.mockExam.create({
      data: {
        userId: session.user.id,
        title: exam.title,
        questions: exam.questions,
      },
    });
    return NextResponse.json({ exam: saved });
  } catch (error) {
    console.error("Mock exam error:", error);
    return NextResponse.json({ error: "Failed to generate mock exam" }, { status: 500 });
  }
}
