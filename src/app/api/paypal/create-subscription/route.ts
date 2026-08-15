import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPayPalSubscription, getPayPalPlanId } from "@/lib/paypal";
import { getPlanByTier, PLANS } from "@/lib/plans";
import { SubscriptionTier } from "@/types";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tier } = (await req.json()) as { tier?: string };
  const isKnownTier = PLANS.some((p) => p.id === tier && p.id !== "free_trial");
  if (!isKnownTier) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const planId = getPayPalPlanId(tier as SubscriptionTier);
  if (!planId) {
    return NextResponse.json(
      { error: `PayPal plan not configured for ${tier}. Set PAYPAL_PLAN_${tier!.toUpperCase()}.` },
      { status: 503 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    const subscription = await createPayPalSubscription(
      planId,
      session.user.email,
      `${baseUrl}/dashboard?subscribed=${tier}`,
      `${baseUrl}/pricing?cancelled=true`
    );

    const approvalUrl = subscription.links?.find((l) => l.rel === "approve")?.href;
    return NextResponse.json({ approvalUrl, plan: getPlanByTier(tier as SubscriptionTier) });
  } catch (error) {
    console.error("PayPal error:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
