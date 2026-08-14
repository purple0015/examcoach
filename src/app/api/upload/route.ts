import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getUploadQuota, releaseUploadSlot, reserveUploadSlot } from "@/lib/subscription";
import { isGeminiConfigured, parseDocument } from "@/lib/gemini";
import { prisma } from "@/lib/db";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Returns the readable text of a file, or null when the bytes are binary
 * (PDF/DOCX containers) and would only produce noise for the parser.
 */
async function readableText(file: File): Promise<string | null> {
  const raw = await file.text();
  const sample = raw.slice(0, 4000);
  if (!sample.trim()) return null;
  const printable = sample.replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "").length;
  return printable / sample.length > 0.85 ? raw.slice(0, 40000) : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await reserveUploadSlot(session.user.id);
  if (!quota.canUpload) {
    return NextResponse.json(
      {
        error: `Daily upload limit reached (${quota.maxUploads}/day on the ${quota.tier} plan).`,
        quota,
      },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      await releaseUploadSlot(session.user.id);
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > quota.maxFileSizeMb * 1024 * 1024) {
      await releaseUploadSlot(session.user.id);
      return NextResponse.json(
        { error: `File too large (max ${quota.maxFileSizeMb}MB on your plan)`, quota },
        { status: 413 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type) && !/\.(txt|pdf|docx?)$/i.test(file.name)) {
      await releaseUploadSlot(session.user.id);
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX or TXT." },
        { status: 415 }
      );
    }

    let fileUrl = `local://${file.name}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`uploads/${session.user.id}/${Date.now()}-${file.name}`, file, {
        access: "public",
      });
      fileUrl = blob.url;
    }

    const fallbackTopic = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    let topics: string[] = [fallbackTopic || "General"];
    let parsedAt: Date | null = null;

    if (isGeminiConfigured()) {
      try {
        const content = await readableText(file);
        if (content) {
          const parsed = await parseDocument(content, session.user.locale);
          if (parsed.topics.length > 0) topics = parsed.topics;
          parsedAt = new Date();
        }
      } catch (error) {
        console.error("Document parse failed, falling back to General:", error);
      }
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

    await prisma.studySession.create({
      data: {
        userId: session.user.id,
        method: "flashcards",
        durationMin: 5,
        topicsStudied: topics.slice(0, 3),
      },
    });

    return NextResponse.json({
      document: { ...document, createdAt: document.createdAt.toISOString() },
      quota: await getUploadQuota(session.user.id),
    });
  } catch (error) {
    console.error("Upload error:", error);
    await releaseUploadSlot(session.user.id);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getUploadQuota(session.user.id));
}
