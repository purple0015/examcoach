import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlanByTier } from "@/lib/plans";
import { SubscriptionTier } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventType = body.event_type;

    if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const subId = body.resource?.id;
      const planId = body.resource?.plan_id;
      const subscriberEmail = body.resource?.subscriber?.email_address;

      if (!subscriberEmail) return NextResponse.json({ received: true });

      const user = await prisma.user.findUnique({ where: { email: subscriberEmail } });
      if (!user) return NextResponse.json({ received: true });

      let tier: SubscriptionTier = "individual";
      for (const [key, envPlanId] of Object.entries({
        individual: process.env.PAYPAL_PLAN_INDIVIDUAL,
        family: process.env.PAYPAL_PLAN_FAMILY,
        school: process.env.PAYPAL_PLAN_SCHOOL,
        ministry: process.env.PAYPAL_PLAN_MINISTRY,
        ngo: process.env.PAYPAL_PLAN_NGO,
      })) {
        if (envPlanId === planId) tier = key as SubscriptionTier;
      }

      const plan = getPlanByTier(tier);

      await prisma.subscription.updateMany({
        where: { userId: user.id, status: "active" },
        data: { status: "cancelled" },
      });

      await prisma.subscription.create({
        data: {
          userId: user.id,
          tier,
          paypalSubId: subId,
          status: "active",
          maxSeats: plan.maxSeats,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
      const subId = body.resource?.id;
      if (subId) {
        await prisma.subscription.updateMany({
          where: { paypalSubId: subId },
          data: { status: "cancelled" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
