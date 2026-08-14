import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const goalSchema = z.object({
  dailyMinutes: z.number().int().min(5).max(600),
  weeklyTopics: z.number().int().min(1).max(100),
  weeklyMinutes: z.number().int().min(10).max(3000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goal = await prisma.studyGoal.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json(
    goal ?? { dailyMinutes: 20, weeklyTopics: 5, weeklyMinutes: 120 }
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = goalSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const goal = await prisma.studyGoal.upsert({
    where: { userId: session.user.id },
    update: parsed.data,
    create: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json(goal);
}
