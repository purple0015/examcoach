import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tier, reference, phoneNumber, schoolName, contactDetails, gateway } = body;

    if (!tier || !reference || !phoneNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = PLANS.find((p) => p.id === tier);
    if (!plan) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Check if reference already exists to prevent duplicate submissions
    const existingPayment = await prisma.payment.findUnique({
      where: { reference },
    });

    if (existingPayment) {
      return NextResponse.json(
        { error: "This transaction reference has already been submitted." },
        { status: 400 }
      );
    }

    // Create a pending payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: plan.price,
        currency: "USD",
        status: "pending",
        reference,
        gateway: gateway || "ecocash",
        tier,
        phoneNumber,
        schoolName,
        contactDetails,
      },
    });

    return NextResponse.json({ 
      success: true, 
      paymentId: payment.id,
      message: "Payment proof submitted for verification" 
    });
  } catch (error) {
    console.error("Manual payment submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit payment proof" },
      { status: 500 }
    );
  }
}
