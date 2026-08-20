import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { studyCoach } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { methodId, content, topic } = await req.json();

    if (!methodId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await studyCoach(
      methodId,
      content,
      topic,
      session.user.locale
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Study Coach API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get AI coaching feedback" },
      { status: 500 }
    );
  }
}
