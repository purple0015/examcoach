import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const resetRecord = await prisma.passwordResetCode.findFirst({
      where: { email: email.toLowerCase(), code, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { password: hashedPassword },
    });

    // Delete the code after successful use
    await prisma.passwordResetCode.deleteMany({ where: { email: email.toLowerCase() } });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset verify error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
