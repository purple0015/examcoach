import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { startOfWeek, subDays } from "date-fns";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateLongestStreak, calculateStreak, percent } from "@/lib/utils";
import { DailyActivity, DashboardStats, WeaknessCell } from "@/types";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [sessions, goal, quizResults, flashcardCount, docCount, mockExamCount] = await Promise.all([
    prisma.studySession.findMany({
      where: { userId },
      select: { date: true, durationMin: true, topicsStudied: true },
    }),
    prisma.studyGoal.findUnique({ where: { userId } }),
    prisma.quizResult.findMany({ where: { userId } }),
    prisma.flashcard.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
    prisma.mockExam.count({ where: { userId } }),
  ]);

  const dailyGoal = goal?.dailyMinutes ?? 20;
  const weeklyGoal = goal?.weeklyTopics ?? 5;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minutesToday = sessions
    .filter((s) => s.date >= today)
    .reduce((sum, s) => sum + s.durationMin, 0);

  const thisWeek = sessions.filter((s) => s.date >= weekStart);
  const minutesThisWeek = thisWeek.reduce((sum, s) => sum + s.durationMin, 0);
  const topicsThisWeek = new Set(thisWeek.flatMap((s) => s.topicsStudied)).size;

  const minutesByDay = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(s.date);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + s.durationMin);
  }

  const last14Days: DailyActivity[] = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(today, 13 - i);
    const minutes = minutesByDay.get(dayKey(date)) ?? 0;
    return { date: dayKey(date), minutes, goalMet: minutes >= dailyGoal };
  });

  const topicMap = new Map<string, { attempted: number; correct: number }>();
  for (const q of quizResults) {
    const existing = topicMap.get(q.topic) ?? { attempted: 0, correct: 0 };
    existing.attempted += q.totalQuestions;
    existing.correct += Math.round((q.score / 100) * q.totalQuestions);
    topicMap.set(q.topic, existing);
  }

  const weaknessMatrix: WeaknessCell[] = Array.from(topicMap.entries())
    .map(([topic, s]) => {
      const strength = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
      return {
        topic,
        strength,
        color: strength >= 70 ? "mint" : strength >= 40 ? "amber" : "red",
        questionsAttempted: s.attempted,
        questionsCorrect: s.correct,
      } satisfies WeaknessCell;
    })
    .sort((a, b) => a.strength - b.strength);

  const averageScore =
    quizResults.length > 0
      ? Math.round(quizResults.reduce((sum, q) => sum + q.score, 0) / quizResults.length)
      : 0;

  const stats: DashboardStats = {
    streak: calculateStreak(sessions.map((s) => s.date)),
    longestStreak: calculateLongestStreak(sessions.map((s) => s.date)),
    minutesToday,
    dailyGoal,
    dailyGoalPct: percent(minutesToday, dailyGoal),
    minutesThisWeek,
    topicsThisWeek,
    weeklyGoal,
    weeklyGoalPct: percent(topicsThisWeek, weeklyGoal),
    flashcardCount,
    docCount,
    mockExamCount,
    topicsMastered: weaknessMatrix.filter((t) => t.strength >= 80).length,
    averageScore,
    weaknessMatrix,
    last14Days,
    studiedToday: minutesToday > 0,
  };

  return NextResponse.json(stats);
}
