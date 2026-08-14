import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
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
      const first = parsed.error.errors[0];
      const field = first?.path?.[0] ? `${first.path[0]}: ` : "";
      return NextResponse.json({ error: `${field}${first.message}` }, { status: 400 });
    }

    const { name, password, locale } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
    } catch (dbError) {
      console.error("Signup DB connection error (findUser):", dbError);
      return NextResponse.json(
        { error: "Database unreachable — check DATABASE_URL / DB is running" },
        { status: 503 }
      );
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    let passwordHash: string;
    try {
      passwordHash = await bcrypt.hash(password, 12);
    } catch (hashError) {
      console.error("Password hash error:", hashError);
      return NextResponse.json({ error: "Could not process password" }, { status: 500 });
    }

    try {
      await prisma.user.create({
        data: {
          name,
          email,
          locale,
          password: passwordHash,
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
    } catch (createError) {
      console.error("Signup user create error:", createError);
      if (createError instanceof Prisma.PrismaClientKnownRequestError) {
        if (createError.code === "P2002") {
          return NextResponse.json({ error: "Email already registered" }, { status: 409 });
        }
        if (createError.code === "P2021" || createError.code === "P1001" || createError.code === "P1003") {
          return NextResponse.json(
            { error: "Database tables missing — run `npm run db:push` first" },
            { status: 503 }
          );
        }
      }
      if (
        createError instanceof Prisma.PrismaClientInitializationError ||
        String(createError).includes("Environment variable not found") ||
        String(createError).includes("DATABASE_URL")
      ) {
        return NextResponse.json(
          { error: "Database not configured — set DATABASE_URL and restart" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Could not create account — please retry" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup top-level error:", error);
    return NextResponse.json({ error: "Signup failed — please retry" }, { status: 500 });
  }
}
