import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, hours } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found for this user" }, { status: 404 });
    }

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setHours(gracePeriodEnd.getHours() + (hours || 48));

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "active", // Reactivate if it was expired
        gracePeriodEnd,
        updatedAt: new Date(),
      },
    });

    console.log(`[ADMIN] GRACE PERIOD GRANTED by ${session.user.email} to ${userId} for ${hours || 48} hours.`);

    return NextResponse.json({ 
      success: true, 
      message: `Grace period granted until ${gracePeriodEnd.toLocaleString()}` 
    });
  } catch (error) {
    console.error("Grace period error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
