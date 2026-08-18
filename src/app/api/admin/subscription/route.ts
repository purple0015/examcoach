import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId, tier } = await req.json();
    if (!userId || !tier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = PLANS.find(p => p.id === tier);
    if (!plan) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

    const maxSeats = plan.maxSeats;
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 10); // Grant 10 years for "unlimited"

    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          tier,
          status: "active",
          currentPeriodEnd,
          maxSeats,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          tier,
          status: "active",
          currentPeriodEnd,
          maxSeats,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
