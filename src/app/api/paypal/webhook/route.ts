import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPlanByTier } from "@/lib/plans";
import { tierForPayPalPlanId, verifyWebhookSignature } from "@/lib/paypal";

export async function POST(req: Request) {
  const rawBody = await req.text();

  if (process.env.PAYPAL_WEBHOOK_ID) {
    const valid = await verifyWebhookSignature(req.headers, rawBody);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("PAYPAL_WEBHOOK_ID is not set — rejecting unverified webhook");
    return NextResponse.json({ error: "Webhook verification not configured" }, { status: 503 });
  }

  try {
    const body = JSON.parse(rawBody) as {
      event_type?: string;
      resource?: {
        id?: string;
        plan_id?: string;
        subscriber?: { email_address?: string };
      };
    };

    if (body.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
      const email = body.resource?.subscriber?.email_address?.toLowerCase();
      if (!email) return NextResponse.json({ received: true });

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ received: true });

      const tier = tierForPayPalPlanId(body.resource?.plan_id) ?? "individual";
      const plan = getPlanByTier(tier);

      await prisma.$transaction([
        prisma.subscription.updateMany({
          where: { userId: user.id, status: "active" },
          data: { status: "cancelled" },
        }),
        prisma.subscription.create({
          data: {
            userId: user.id,
            tier,
            paypalSubId: body.resource?.id,
            status: "active",
            maxSeats: plan.maxSeats,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);
    }

    if (
      body.event_type === "BILLING.SUBSCRIPTION.CANCELLED" ||
      body.event_type === "BILLING.SUBSCRIPTION.EXPIRED" ||
      body.event_type === "BILLING.SUBSCRIPTION.SUSPENDED"
    ) {
      const subId = body.resource?.id;
      if (subId) {
        await prisma.subscription.updateMany({
          where: { paypalSubId: subId },
          data: { status: body.event_type.endsWith("EXPIRED") ? "expired" : "cancelled" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
