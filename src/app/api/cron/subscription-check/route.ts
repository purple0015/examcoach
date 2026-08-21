import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  // Simple secret check to prevent unauthorized execution
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const startOfTargetDay = new Date(sevenDaysFromNow);
    startOfTargetDay.setHours(0, 0, 0, 0);
    const endOfTargetDay = new Date(sevenDaysFromNow);
    endOfTargetDay.setHours(23, 59, 59, 999);

    // 1. Find subscriptions expiring in 7 days
    const nearingExpiry = await prisma.subscription.findMany({
      where: {
        status: "active",
        currentPeriodEnd: {
          gte: startOfTargetDay,
          lte: endOfTargetDay,
        },
      },
      include: { user: true },
    });

    for (const sub of nearingExpiry) {
      console.log(`[CRON] SENDING EXPIRY ALERT to ${sub.user.email}: Your subscription expires in 7 days on ${sub.currentPeriodEnd?.toLocaleDateString()}.`);
      // In a real app: await sendEmail({ to: sub.user.email, ... })
    }

    // 2. Find subscriptions that have expired (past period end AND past grace period)
    const expiredSubs = await prisma.subscription.findMany({
      where: {
        status: "active",
        currentPeriodEnd: { lt: now },
        OR: [
          { gracePeriodEnd: null },
          { gracePeriodEnd: { lt: now } }
        ]
      },
      include: { user: true }
    });

    for (const sub of expiredSubs) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "expired" }
      });
      console.log(`[CRON] SUBSCRIPTION EXPIRED for ${sub.user.email}. Access downgraded to Read-Only/Starter.`);
    }

    return NextResponse.json({
      success: true,
      alertsSent: nearingExpiry.length,
      subscriptionsExpired: expiredSubs.length
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
