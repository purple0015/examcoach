import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        status: "pending",
        gateway: "paynow",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pendingPayment || null);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
