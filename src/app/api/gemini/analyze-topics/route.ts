import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDocumentText } from "@/lib/document-parser";
import { getSyllabus, hashText, syllabusInstruction, type TopicTrend } from "@/lib/zimsec";
import { GoogleGenerativeAI } from "@google/generative-ai";

function normaliseTopics(value: unknown): TopicTrend[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<TopicTrend> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      topic: String(item.topic || "").trim(),
      frequency: Math.max(1, Math.round(Number(item.frequency) || 1)),
      importanceScore: Math.min(100, Math.max(0, Math.round(Number(item.importanceScore) || 0))),
      summary: String(item.summary || "").trim(),
    }))
    .filter((item) => item.topic)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 30);
}

async function analyseMaterial(material: string, syllabus: string): Promise<TopicTrend[]> {
  if (!process.env.GEMINI_API_KEY) throw new Error("AI service is not configured");

  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });

  const result = await model.generateContent(`You are an academic topic-trend analyst. Analyse the complete study material below.
Extract and cluster synonymous academic topics. Count frequency as meaningful occurrences or sections, not filler-word matches. Score importance from 0 to 100 using frequency, conceptual centrality, learning objectives, and assessment relevance. Do not include administrative text.
${syllabus ? syllabusInstruction(syllabus) : ""}
Return only JSON in this shape: {"topics":[{"topic":"string","frequency":number,"importanceScore":number,"summary":"one concise sentence"}]}

STUDY MATERIAL:
---
${material.slice(0, 60000)}
---`);

  const raw = result.response.text().trim();
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) as { topics?: unknown };
  return normaliseTopics(parsed.topics);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analyses = await prisma.topicAnalysis.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { document: { select: { filename: true } } },
  });
  return NextResponse.json({ analyses });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { documentId?: string; text?: string; zimsecSubject?: string };
    const document = body.documentId
      ? await prisma.document.findFirst({ where: { id: body.documentId, userId: session.user.id } })
      : null;
    if (body.documentId && !document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const material = body.text?.trim() || (document ? await getDocumentText(document.fileUrl, document.filename) : "");
    if (material.trim().length < 50) return NextResponse.json({ error: "Material is too short to analyse" }, { status: 400 });

    const syllabusResult = body.zimsecSubject ? await getSyllabus(body.zimsecSubject) : { text: "", available: false, warning: "" };
    const topics = await analyseMaterial(material, syllabusResult.text);
    if (topics.length === 0) return NextResponse.json({ error: "No academic topics were found in this material" }, { status: 422 });

    const analysis = document
      ? await prisma.topicAnalysis.upsert({
          where: { documentId: document.id },
          create: { userId: session.user.id, documentId: document.id, topics, sourceHash: hashText(material) },
          update: { topics, sourceHash: hashText(material) },
          include: { document: { select: { filename: true } } },
        })
      : null;

    return NextResponse.json({ topics, analysis, syllabusApplied: syllabusResult.available, warning: syllabusResult.warning });
  } catch (error) {
    console.error("Topic analysis failed", error);
    return NextResponse.json({ error: "Could not analyse this material. Please try again." }, { status: 500 });
  }
}
