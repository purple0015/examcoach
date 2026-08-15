import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { feynmanCoach } from "@/lib/gemini";
import { getUserTier } from "@/lib/subscription";
import { isMethodAllowed } from "@/lib/study-methods";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!isMethodAllowed(tier, "feynman")) {
    return NextResponse.json(
      { error: "The Feynman coach is available from the Individual plan" },
      { status: 403 }
    );
  }

  const { topic, explanation } = (await req.json()) as { topic?: string; explanation?: string };
  if (!topic || !explanation) {
    return NextResponse.json({ error: "Topic and explanation required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await feynmanCoach(topic, explanation, session.user.locale));
  } catch (error) {
    console.error("Feynman coach error:", error);
    return NextResponse.json({ error: "Coach unavailable" }, { status: 500 });
  }
}
