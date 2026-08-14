import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const resultSchema = z.object({
  topic: z.string().min(1),
  score: z.number().min(0).max(100),
  totalQuestions: z.number().int().min(1).max(200),
  answers: z.array(z.number().int()).max(200),
  mockExamId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = resultSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  const { topic, score, totalQuestions, answers, mockExamId } = parsed.data;

  await prisma.quizResult.create({
    data: { userId: session.user.id, topic, score, totalQuestions, answers },
  });

  if (mockExamId) {
    await prisma.mockExam.updateMany({
      where: { id: mockExamId, userId: session.user.id },
      data: { score, completedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
