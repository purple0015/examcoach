import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { getUploadQuota, releaseUploadSlot, reserveUploadSlot } from "@/lib/subscription";
import { isGeminiConfigured, parseDocument } from "@/lib/gemini";
import { prisma } from "@/lib/db";
import { getFileText } from "@/lib/document-parser";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Do not rely only on the JWT subject. A deployed app can retain a stale
  // session after its database is reset or a user is deleted.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Your session is no longer valid. Please sign in again." },
      { status: 401 }
    );
  }

  let quota;
  try {
    quota = await reserveUploadSlot(user.id);
  } catch (err) {
    console.error("Quota check failed:", err);
    return NextResponse.json({ error: "Could not verify upload quota" }, { status: 500 });
  }

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
      await releaseUploadSlot(user.id);
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > quota.maxFileSizeMb * 1024 * 1024) {
      await releaseUploadSlot(user.id);
      return NextResponse.json(
        { error: `File too large (max ${quota.maxFileSizeMb}MB on your plan)`, quota },
        { status: 413 }
      );
    }

    const isAllowedType = ALLOWED_TYPES.includes(file.type);
    const isAllowedExt = /\.(txt|pdf|docx?)$/i.test(file.name);

    if (!isAllowedType && !isAllowedExt) {
      await releaseUploadSlot(user.id);
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, DOCX or TXT." },
        { status: 415 }
      );
    }

    let fileUrl = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`uploads/${user.id}/${Date.now()}-${file.name}`, file, {
          access: "private",
        });
        fileUrl = blob.url;
      } catch (blobError) {
        console.error("Vercel Blob upload failed:", blobError);
        await releaseUploadSlot(user.id);
        return NextResponse.json(
          { error: "Storage service unavailable. Please try again later." },
          { status: 503 }
        );
      }
    } else {
      if (process.env.NODE_ENV === "production") {
        await releaseUploadSlot(user.id);
        return NextResponse.json(
          { error: "Cloud storage is not configured. Upload disabled." },
          { status: 500 }
        );
      }
      fileUrl = `local://${file.name}`;
    }

    const fallbackTopic = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    let topics: string[] = [fallbackTopic || "General"];
    let parsedAt: Date | null = null;

    if (isGeminiConfigured()) {
      try {
        const content = await getFileText(file);
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
        userId: user.id,
        filename: file.name,
        fileUrl,
        fileType: file.type || "text/plain",
        topics,
        parsedAt,
      },
    });

    try {
      await prisma.studySession.create({
        data: {
          userId: user.id,
          method: "flashcards",
          durationMin: 5,
          topicsStudied: topics.slice(0, 3),
        },
      });
    } catch (sessionError) {
      console.error("Failed to create study session record:", sessionError);
    }

    return NextResponse.json({
      document: { ...document, createdAt: document.createdAt.toISOString() },
      quota: await getUploadQuota(user.id),
    });
  } catch (error) {
    console.error("Upload error detail:", error);
    await releaseUploadSlot(user.id);
    return NextResponse.json({ error: "Upload failed — please check file and try again" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const quota = await getUploadQuota(session.user.id);
    return NextResponse.json(quota);
  } catch (err) {
    console.error("Failed to fetch upload quota:", err);
    return NextResponse.json({ 
      error: "Could not load upload quota",
      canUpload: false,
      uploadsToday: 0,
      maxUploads: 0,
      uploadsRemaining: 0,
      maxFileSizeMb: 0,
      tier: "starter_free"
    }, { status: 500 });
  }
}
