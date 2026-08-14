import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserTier } from "@/lib/subscription";
import { isMethodAllowed } from "@/lib/study-methods";
import { StudyMethodId } from "@/types";

const sessionSchema = z.object({
  method: z.string().min(1),
  durationMin: z.number().int().min(1).max(600),
  topics: z.array(z.string()).max(10).default([]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = sessionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const tier = await getUserTier(session.user.id);
  const method = parsed.data.method as StudyMethodId;
  if (!isMethodAllowed(tier, method)) {
    return NextResponse.json({ error: "Method not available on your plan" }, { status: 403 });
  }

  const created = await prisma.studySession.create({
    data: {
      userId: session.user.id,
      method,
      durationMin: parsed.data.durationMin,
      topicsStudied: parsed.data.topics,
    },
  });

  return NextResponse.json({ session: created });
}
