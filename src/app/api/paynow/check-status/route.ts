import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPaynowHash, generatePaynowHash } from "@/lib/paynow";
import { PLANS } from "@/lib/plans";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { reference, userId: session.user.id },
    });

    if (!payment || !payment.gatewayRef) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Poll Paynow for status
    const response = await fetch(payment.gatewayRef);
    const responseText = await response.text();
    const data = new URLSearchParams(responseText);
    
    const params: Record<string, string> = {};
    data.forEach((value, key) => {
      params[key] = value;
    });

    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY!;
    if (!verifyPaynowHash(params, integrationKey)) {
      return NextResponse.json({ error: "Invalid hash from Paynow" }, { status: 500 });
    }

    const status = params.status.toLowerCase();

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

      return NextResponse.json({ status: "completed" });
    }

    return NextResponse.json({ status });
  } catch (error: any) {
    console.error("Paynow status check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
