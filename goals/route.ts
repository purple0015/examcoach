import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dailyMinutes, weeklyTopics } = await req.json();

  await prisma.studyGoal.upsert({
    where: { userId: session.user.id },
    update: { dailyMinutes, weeklyTopics },
    create: { userId: session.user.id, dailyMinutes, weeklyTopics },
  });

  return NextResponse.json({ success: true });
}
