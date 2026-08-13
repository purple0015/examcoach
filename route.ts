import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkDailyUploadLimit, incrementDailyUpload } from "@/lib/subscription";
import { parseDocument } from "@/lib/gemini";
import { prisma } from "@/lib/db";
import { put } from "@vercel/blob";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadLimit = await checkDailyUploadLimit(session.user.id);
  if (!uploadLimit.canUpload) {
    return NextResponse.json(
      { error: `Daily upload limit reached (${uploadLimit.maxUploads}/day). Upgrade your plan for unlimited uploads.` },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const allowedTypes = ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".txt")) {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, TXT, or DOCX." }, { status: 400 });
    }

    let fileUrl = "";
    const content = await file.text();

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${session.user.id}/${Date.now()}-${file.name}`, file, { access: "public" });
      fileUrl = blob.url;
    } else {
      fileUrl = `local://${file.name}`;
    }

    let topics: string[] = [];
    let parsedAt: Date | null = null;

    if (process.env.GEMINI_API_KEY && content.trim()) {
      try {
        const parsed = await parseDocument(content);
        topics = parsed.topics;
        parsedAt = new Date();
      } catch {
        topics = ["General"];
      }
    } else {
      topics = ["General"];
    }

    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        filename: file.name,
        fileUrl,
        fileType: file.type || "text/plain",
        topics,
        parsedAt,
      },
    });

    await incrementDailyUpload(session.user.id);

    await prisma.studySession.create({
      data: {
        userId: session.user.id,
        durationMin: 5,
        topicsStudied: topics.slice(0, 3),
      },
    });

    return NextResponse.json({ document, uploadsRemaining: uploadLimit.maxUploads - uploadLimit.uploadsToday - 1 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
