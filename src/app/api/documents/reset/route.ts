import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { del } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * DELETE /api/documents/reset
 * Permanently removes all documents for the authenticated user from storage and DB.
 * CRITICAL: Does NOT modify quota counters or DailyUpload logs.
 */
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Fetch all documents to get their fileUrls for storage deletion
    const documents = await prisma.document.findMany({
      where: { userId },
      select: { fileUrl: true },
    });

    // 2. Delete remote files from Vercel Blob
    // We filter for valid blob URLs (those starting with https) to avoid errors with local dev files
    const blobUrls = documents
      .map((doc) => doc.fileUrl)
      .filter((url) => url.startsWith("https://"));

    if (blobUrls.length > 0) {
      await del(blobUrls);
    }

    // 3. Delete database records in a transaction for atomicity
    // We delete documents and all generated study materials (flashcards, quizzes, exams)
    await prisma.$transaction([
      prisma.flashcard.deleteMany({ where: { userId } }),
      prisma.quizQuestion.deleteMany({ where: { userId } }),
      prisma.quizResult.deleteMany({ where: { userId } }),
      prisma.mockExam.deleteMany({ where: { userId } }),
      prisma.document.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({
      success: true,
      message: "All documents and study materials removed. Upload quota remains unchanged.",
    });
  } catch (error) {
    console.error("Reset uploads failed:", error);
    return NextResponse.json(
      { error: "Failed to reset uploads. Please try again." },
      { status: 500 }
    );
  }
}
