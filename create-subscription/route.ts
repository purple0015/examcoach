import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPayPalSubscription, getPayPalPlanId } from "@/lib/paypal";
import { getPlanByTier } from "@/lib/plans";
import { SubscriptionTier } from "@/types";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tier } = await req.json();
  if (!tier || tier === "free_trial") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const planId = getPayPalPlanId(tier);
  if (!planId) {
    return NextResponse.json(
      { error: `PayPal plan not configured for ${tier}. Set PAYPAL_PLAN_${tier.toUpperCase()} env var.` },
      { status: 503 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const subscription = await createPayPalSubscription(
      planId,
      session.user.email,
      `${baseUrl}/dashboard?subscribed=${tier}`,
      `${baseUrl}/dashboard?cancelled=true`
    );

    const approvalUrl = subscription.links?.find(
      (l: { rel: string; href: string }) => l.rel === "approve"
    )?.href;

    return NextResponse.json({ approvalUrl, plan: getPlanByTier(tier as SubscriptionTier) });
  } catch (error) {
    console.error("PayPal error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
