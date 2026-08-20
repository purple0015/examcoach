import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { code, tempPassword, name, email, password } = await req.json();
    if (!code || !tempPassword || !name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const orgIdRecord = await prisma.orgID.findUnique({
      where: { code: code.toUpperCase() },
      include: { organization: true },
    });

    if (!orgIdRecord) {
      return NextResponse.json({ error: "Invalid ID code" }, { status: 404 });
    }

    if (orgIdRecord.isClaimed) {
      // Find 3 alternative unclaimed IDs for the same org
      const alternatives = await prisma.orgID.findMany({
        where: { orgId: orgIdRecord.orgId, isClaimed: false },
        take: 3,
        select: { code: true },
      });
      return NextResponse.json({ 
        error: "This ID has already been claimed", 
        alternatives: alternatives.map(a => a.code) 
      }, { status: 409 });
    }

    if (orgIdRecord.tempPassword !== tempPassword) {
      return NextResponse.json({ error: "Incorrect temporary password" }, { status: 401 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and claim ID
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        orgId: orgIdRecord.orgId,
        orgIdCode: orgIdRecord.code,
      },
    });

    await prisma.orgID.update({
      where: { id: orgIdRecord.id },
      data: { isClaimed: true, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Register ID error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
