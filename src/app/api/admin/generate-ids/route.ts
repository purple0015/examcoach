import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { orgId, count, status } = await req.json();
    if (!orgId || !count) {
      return NextResponse.json({ error: "Missing orgId or count" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const prefix = org.prefix.toUpperCase();
    const generatedIds = [];

    for (let i = 0; i < count; i++) {
      const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
      const code = `${prefix}-${randomPart}`;
      const tempPassword = Math.random().toString(36).slice(-8);

      const orgIdRecord = await prisma.orgID.create({
        data: {
          code,
          tempPassword, // Store plaintext for admin export, but user will set real password on registration
          status: status || "trial",
          trialEndsAt: status === "trial" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
          orgId,
        },
      });
      generatedIds.push(orgIdRecord);
    }

    return NextResponse.json(generatedIds);
  } catch (error) {
    console.error("ID generation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");

  try {
    const ids = await prisma.orgID.findMany({
      where: orgId ? { orgId } : {},
      include: {
        organization: { select: { name: true } },
        // user: { select: { email: true, name: true } } // Added if needed
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ids);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { ids, status, trialEndsAt } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (trialEndsAt !== undefined) updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;

    // If setting to paid, clear trial end date
    if (status === "paid") updateData.trialEndsAt = null;

    await prisma.orgID.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Batch update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
