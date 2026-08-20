import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Return success even if user not found for security reasons
      return NextResponse.json({ success: true, message: "If an account exists, a reset code has been sent." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { resetCode: code, resetCodeExpiresAt: expiresAt },
    });

    // In a real app, send this via email. For now, we log it.
    console.log(`PASSWORD RESET CODE for ${email}: ${code}`);

    return NextResponse.json({ success: true, message: "Verification code sent to your email." });
  } catch (error) {
    console.error("Reset request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
