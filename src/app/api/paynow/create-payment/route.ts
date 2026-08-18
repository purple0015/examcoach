import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { initiatePaynowPayment } from "@/lib/paynow";
import { PLANS } from "@/lib/plans";
import { SubscriptionTier } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier } = await req.json();
    const plan = PLANS.find((p) => p.id === tier);

    if (!plan || plan.price <= 0) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Generate a unique reference
    const reference = `EXC-${session.user.id.slice(-4)}-${Date.now()}`;

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: plan.price,
        currency: "USD",
        status: "pending",
        reference: reference,
        gateway: "paynow",
        tier: tier as string,
      },
    });

    // Initiate Paynow payment
    const { browserUrl, pollUrl } = await initiatePaynowPayment({
      amount: plan.price,
      email: session.user.email,
      reference: reference,
      items: `ExamCoach ${plan.name} Subscription`,
    });

    // Update payment record with poll URL
    await prisma.payment.update({
      where: { reference },
      data: { gatewayRef: pollUrl },
    });

    return NextResponse.json({ checkoutUrl: browserUrl });
  } catch (error: any) {
    console.error("Paynow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate Paynow payment" },
      { status: 500 }
    );
  }
}
