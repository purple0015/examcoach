import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paymentId, status, durationDays, note } = body;

    if (!paymentId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (status === "rejected") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { 
          status: "rejected", 
          verificationNote: note,
          adminId: session.user.id 
        },
      });
      return NextResponse.json({ success: true, message: "Payment rejected" });
    }

    if (status === "completed") {
      const days = durationDays || 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      // 1. Update Payment
      await prisma.payment.update({
        where: { id: paymentId },
        data: { 
          status: "completed", 
          verificationNote: note,
          adminId: session.user.id 
        },
      });

      // 2. Update/Create Subscription
      const existingSub = await prisma.subscription.findFirst({
        where: { userId: payment.userId },
      });

      const plan = PLANS.find(p => p.id === payment.tier);
      const maxSeats = plan?.maxSeats || 1;

      if (existingSub) {
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            tier: payment.tier,
            status: "active",
            currentPeriodEnd: expiryDate,
            maxSeats,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.subscription.create({
          data: {
            userId: payment.userId,
            tier: payment.tier,
            status: "active",
            currentPeriodEnd: expiryDate,
            maxSeats,
          },
        });
      }

      // 3. Handle Organization for Institutional Plans
      if (["school", "ministry", "ngo"].includes(payment.tier) && payment.schoolName) {
        // Find or Create Organization
        let org = await prisma.organization.findFirst({
          where: { name: payment.schoolName }
        });

        if (!org) {
          const slug = payment.schoolName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
          const prefix = payment.schoolName.slice(0, 3).toUpperCase();
          
          org = await prisma.organization.create({
            data: {
              name: payment.schoolName,
              slug: `${slug}-${Date.now().toString().slice(-4)}`,
              prefix,
              dailyUploadsLimit: plan?.limits.dailyUploads || 1000,
              groqTokensLimit: plan?.limits.groqTokenLimit || 5000000,
              seatLimit: maxSeats,
            }
          });
        }

        // Link User to Org
        await prisma.user.update({
          where: { id: payment.userId },
          data: { orgId: org.id }
        });
      }

      return NextResponse.json({ success: true, message: "Payment approved and subscription activated" });
    }

    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
