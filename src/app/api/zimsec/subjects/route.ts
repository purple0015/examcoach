import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listSyllabusSubjects } from "@/lib/zimsec";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ subjects: await listSyllabusSubjects() }); }
  catch { return NextResponse.json({ subjects: [], warning: "Syllabus source is temporarily unavailable." }, { status: 200 }); }
}
