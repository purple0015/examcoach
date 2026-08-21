import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDocumentText } from "@/lib/document-parser";
import { generateRapidRecall } from "@/lib/gemini";
import { getUserTier } from "@/lib/subscription";
import { isMethodAllowed } from "@/lib/study-methods";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!isMethodAllowed(tier, "active_recall")) {
    return NextResponse.json({ error: "Active recall is not available on your plan" }, { status: 403 });
  }

  try {
    const { documentId, topic, count } = await req.json();

    if (!documentId && !topic) {
      return NextResponse.json(
        { error: "Provide a documentId or a topic to generate recall prompts" },
        { status: 400 }
      );
    }

    let sourceMaterial = "";
    let finalTopic = topic || "General Study";

    if (documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId, userId: session.user.id },
      });

      if (!doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      try {
        sourceMaterial = await getDocumentText(doc.fileUrl, doc.filename);
        if (!topic && doc.topics.length > 0) {
          finalTopic = doc.topics[0];
        }
      } catch (err: any) {
        if (err.message === "FAILED_TO_EXTRACT_DOCUMENT_TEXT") {
          return NextResponse.json(
            { error: "FAILED_TO_EXTRACT_DOCUMENT_TEXT", message: "Could not parse document text. The file may be corrupt or protected." },
            { status: 500 }
          );
        }
        if (err.message === "INSUFFICIENT_TEXT") {
          return NextResponse.json(
            { error: "This document is too short to generate meaningful recall prompts." },
            { status: 400 }
          );
        }
        if (err.message.startsWith("DOCUMENT_REUPLOAD_REQUIRED")) {
          return NextResponse.json(
            {
              error: "DOCUMENT_REUPLOAD_REQUIRED",
              message: "This document was stored on temporary storage and must be re-uploaded.",
            },
            { status: 422 }
          );
        }
        if (err.message.startsWith("DOCUMENT_UNAVAILABLE")) {
          const status = parseInt(err.message.split(":")[1]) || 422;
          return NextResponse.json(
            {
              error: "DOCUMENT_UNAVAILABLE",
              message: "The requested document could not be retrieved from cloud storage. Please re-upload the file.",
            },
            { status }
          );
        }
        throw err;
      }
    }

    const recalls = await generateRapidRecall(
      finalTopic,
      sourceMaterial || `General knowledge about ${finalTopic}`,
      count || 10,
      session.user.locale
    );

    return NextResponse.json({ recalls });
  } catch (error: any) {
    console.error("Rapid Recall generation error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating your recall session." },
      { status: 500 }
    );
  }
}
