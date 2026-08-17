import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { generateMockExam } from "@/lib/gemini";
import { generateMockExamGroq, isGroqConfigured } from "@/lib/groq";
import { getTierLimits, getUserTier } from "@/lib/subscription";
import { isMethodAllowed } from "@/lib/study-methods";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!isMethodAllowed(tier, "mock_exam")) {
    return NextResponse.json(
      { error: "Mock exams are available from the Pro Scholar plan" },
      { status: 403 }
    );
  }

  const { topics, difficulty, questionCount } = (await req.json()) as {
    topics?: string[];
    difficulty?: string;
    questionCount?: number;
  };

  const count = Math.min(questionCount ?? 10, getTierLimits(tier).mockExamQuestions);

  try {
    const examTopics = topics?.length ? topics : ["General"];
    const examDifficulty = difficulty ?? "medium";
    
    let exam;
    if (isGroqConfigured()) {
      exam = await generateMockExamGroq(
        examTopics,
        examDifficulty,
        count,
        session.user.locale
      );
    } else {
      exam = await generateMockExam(
        examTopics,
        examDifficulty,
        count,
        session.user.locale
      );
    }

    const saved = await prisma.mockExam.create({
      data: {
        userId: session.user.id,
        title: exam.title,
        questions: exam.questions as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ exam: saved });
  } catch (error) {
    console.error("Mock exam error:", error);
    return NextResponse.json({ error: "Failed to generate mock exam" }, { status: 500 });
  }
}
