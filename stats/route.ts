import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateStreak } from "@/lib/utils";
import { startOfWeek } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const weekStart = startOfWeek(new Date());

  const [sessions, goal, quizResults, flashcardCount, docCount] = await Promise.all([
    prisma.studySession.findMany({ where: { userId }, select: { date: true, durationMin: true, topicsStudied: true } }),
    prisma.studyGoal.findUnique({ where: { userId } }),
    prisma.quizResult.findMany({ where: { userId } }),
    prisma.flashcard.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minutesToday = sessions
    .filter((s) => new Date(s.date) >= today)
    .reduce((sum, s) => sum + s.durationMin, 0);

  const topicsThisWeek = sessions
    .filter((s) => new Date(s.date) >= weekStart)
    .flatMap((s) => s.topicsStudied).length;

  const topicMap = new Map<string, { attempted: number; correct: number }>();
  for (const q of quizResults) {
    const existing = topicMap.get(q.topic) ?? { attempted: 0, correct: 0 };
    existing.attempted += q.totalQuestions;
    existing.correct += Math.round((q.score / 100) * q.totalQuestions);
    topicMap.set(q.topic, existing);
  }

  const weaknessMatrix = Array.from(topicMap.entries()).map(([topic, stats]) => {
    const strength = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
    const color = strength >= 70 ? "mint" : strength >= 40 ? "amber" : "red";
    return {
      topic,
      strength,
      color,
      questionsAttempted: stats.attempted,
      questionsCorrect: stats.correct,
    };
  });

  return NextResponse.json({
    streak: calculateStreak(sessions.map((s) => s.date)),
    minutesToday,
    dailyGoal: goal?.dailyMinutes ?? 20,
    topicsThisWeek,
    weeklyGoal: goal?.weeklyTopics ?? 5,
    flashcardCount,
    docCount,
    topicsMastered: weaknessMatrix.filter((t) => t.strength >= 80).length,
    weaknessMatrix,
  });
}
