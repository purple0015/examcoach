import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createPayPalProduct, createPayPalPlan } from "@/lib/paypal";
import { PLANS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // High-security check for the specified super-admin
  if (!session?.user?.id || session.user.email !== "purpleteddy002@gmail.com") {
    return NextResponse.json({ error: "Forbidden: Super-Admin Only" }, { status: 403 });
  }

  try {
    console.log("Starting PayPal setup...");
    
    // 1. Create the Product
    const product = await createPayPalProduct();
    console.log("Created PayPal Product:", product.id);

    // 2. Create Plans for each paid tier
    const results: Record<string, string> = {};
    const paidTiers = PLANS.filter(p => p.price > 0 && p.id !== "free_trial");

    for (const plan of paidTiers) {
      console.log(`Creating plan for tier: ${plan.name} ($${plan.price})...`);
      const paypalPlan = await createPayPalPlan(product.id, plan.name, plan.price);
      results[plan.id] = paypalPlan.id;
      console.log(`Created PayPal Plan for ${plan.id}: ${paypalPlan.id}`);
    }

    return NextResponse.json({
      success: true,
      productId: product.id,
      plans: results,
      instructions: "Copy these Plan IDs into your .env file as PAYPAL_PLAN_PRO_SCHOLAR, PAYPAL_PLAN_GLOBAL_ELITE, etc."
    });
  } catch (error: any) {
    console.error("PayPal Setup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
