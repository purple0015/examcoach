import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDocumentText } from "@/lib/document-parser";
import { summarizeDocument } from "@/lib/gemini";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId, userId: session.user.id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const content = await getDocumentText(doc.fileUrl, doc.filename);
    const summary = await summarizeDocument(doc.filename, content, session.user.locale);

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Summarization error:", error);
    if (error.message === "FAILED_TO_EXTRACT_DOCUMENT_TEXT") {
      return NextResponse.json(
        { error: "FAILED_TO_EXTRACT_DOCUMENT_TEXT", message: "Could not parse document text." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Failed to summarize document" }, { status: 500 });
  }
}
