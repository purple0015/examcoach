import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  locale: z.enum(["en", "nd", "sn"]).default("en"),
});

export async function POST(req: Request) {
  try {
    const parsed = signupSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, password, locale } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    await prisma.user.create({
      data: {
        name,
        email,
        locale,
        password: await bcrypt.hash(password, 12),
        subscriptions: {
          create: {
            tier: "free_trial",
            status: "active",
            trialStartDate: new Date(),
            trialEndDate,
            maxSeats: 1,
          },
        },
        studyGoal: { create: { dailyMinutes: 20, weeklyTopics: 5 } },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
