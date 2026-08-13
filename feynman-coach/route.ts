import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { feynmanCoach } from "@/lib/gemini";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topic, explanation } = await req.json();
  if (!topic || !explanation) {
    return NextResponse.json({ error: "Topic and explanation required" }, { status: 400 });
  }

  try {
    const result = await feynmanCoach(topic, explanation);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Feynman coach error:", error);
    return NextResponse.json({ error: "Coach unavailable" }, { status: 500 });
  }
}
