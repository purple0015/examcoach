import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    totalUsers,
    activeSubscriptions,
    trialUsers,
    totalDocuments,
    totalFlashcards,
    totalMockExams,
    subscriptions,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: "active", tier: { not: "free_trial" } } }),
    prisma.subscription.count({ where: { tier: "free_trial", status: "active" } }),
    prisma.document.count(),
    prisma.flashcard.count(),
    prisma.mockExam.count(),
    prisma.subscription.groupBy({ by: ["tier"], _count: { tier: true }, where: { status: "active" } }),
    prisma.user.findMany({ take: 10, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, createdAt: true } }),
  ]);

  const planBreakdown: Record<string, number> = {};
  for (const s of subscriptions) {
    planBreakdown[s.tier] = s._count.tier;
  }

  return NextResponse.json({
    totalUsers,
    activeSubscriptions,
    trialUsers,
    planBreakdown,
    totalDocuments,
    totalFlashcards,
    totalMockExams,
    recentSignups: recentUsers.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
