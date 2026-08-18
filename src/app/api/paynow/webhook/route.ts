import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPaynowHash } from "@/lib/paynow";
import { PLANS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
    if (!integrationKey || !verifyPaynowHash(data, integrationKey)) {
      console.warn("Paynow Webhook: Invalid hash received", data);
      return new Response("Invalid hash", { status: 400 });
    }

    const reference = data.reference;
    const status = data.status.toLowerCase();

    const payment = await prisma.payment.findUnique({
      where: { reference },
      include: { user: true }
    });

    if (!payment) {
      console.warn(`Paynow Webhook: Payment not found for reference ${reference}`);
      return new Response("Payment not found", { status: 404 });
    }

    if (status === "paid" || status === "awaiting delivery") {
      // Update payment status
      await prisma.payment.update({
        where: { reference },
        data: { status: "completed" },
      });

      const plan = PLANS.find(p => p.id === payment.tier);
      const maxSeats = plan?.maxSeats || 1;
      
      const currentPeriodEnd = new Date();
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      // Upsert subscription
      const existingSub = await prisma.subscription.findFirst({
        where: { userId: payment.userId },
      });

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            tier: payment.tier,
            status: "active",
            currentPeriodEnd,
            maxSeats,
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId: payment.userId,
            tier: payment.tier,
            status: "active",
            currentPeriodEnd,
            maxSeats,
          },
        });
      }
      
      console.log(`Paynow Webhook: Successfully activated subscription for user ${payment.userId} (Tier: ${payment.tier})`);
    } else if (status === "failed" || status === "cancelled") {
      await prisma.payment.update({
        where: { reference },
        data: { status: "failed" },
      });
      console.log(`Paynow Webhook: Payment failed for reference ${reference}`);
    }

    // Paynow expects a 200 OK response
    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Paynow Webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
