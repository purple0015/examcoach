import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseDocument } from "@/lib/gemini";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = (await req.json()) as { content?: string };
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

  try {
    return NextResponse.json(await parseDocument(content, session.user.locale));
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json({ error: "Failed to parse document" }, { status: 500 });
  }
}
