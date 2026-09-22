import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDocumentText } from "@/lib/document-parser";
import { getSyllabus, hashText, syllabusInstruction, type TopicTrend } from "@/lib/zimsec";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_MATERIAL_LENGTH = 30000;

type StoredAnalysis = {
  topics: unknown;
  sourceHash: string;
  document: { filename: string };
};

async function analyze(material: string, syllabus: string): Promise<TopicTrend[]> {
  if (!process.env.GEMINI_API_KEY) throw new Error("AI service is not configured");
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const result = await model.generateContent(`You are an exam trend analyst. Extract and cluster the distinct academic topics in this material. Count frequency as the number of meaningful mentions or sections, then rank importance from 0 to 100 using repetition, learning objectives, assessment relevance, and prerequisite value. Return ONLY JSON: {"topics":[{"topic":string,"frequency":number,"importanceScore":number,"summary":string}]}. Sort descending by importanceScore. Maximum 15 topics.\n${syllabusInstruction(syllabus)}\nMATERIAL:\n${material.slice(0, MAX_MATERIAL_LENGTH)}`);
  const raw = result.response.text();
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) as { topics?: TopicTrend[] };
  return (parsed.topics || [])
    .filter((topic) => topic.topic && Number.isFinite(topic.frequency))
    .map((topic) => ({
      topic: topic.topic.trim(),
      frequency: Math.max(1, Math.round(topic.frequency)),
      importanceScore: Math.max(0, Math.min(100, Math.round(topic.importanceScore))),
      summary: topic.summary || "",
    }))
    .slice(0, 15);
}

function aggregateAnalyses(analyses: StoredAnalysis[]) {
  const grouped = new Map<string, TopicTrend & { documents: number; filenames: string[] }>();

  for (const analysis of analyses) {
    const topics = Array.isArray(analysis.topics) ? (analysis.topics as TopicTrend[]) : [];
    const documentName = analysis.document.filename;
    for (const topic of topics) {
      const key = topic.topic.trim().toLowerCase();
      if (!key) continue;
      const current = grouped.get(key);
      if (current) {
        current.frequency += Math.max(1, Number(topic.frequency) || 1);
        current.importanceScore = Math.max(current.importanceScore, Number(topic.importanceScore) || 0);
        current.documents += 1;
        if (!current.filenames.includes(documentName)) current.filenames.push(documentName);
      } else {
        grouped.set(key, {
          topic: topic.topic.trim(),
          frequency: Math.max(1, Number(topic.frequency) || 1),
          importanceScore: Math.max(0, Math.min(100, Number(topic.importanceScore) || 0)),
          summary: topic.summary || "",
          documents: 1,
          filenames: [documentName],
        });
      }
    }
  }

  return [...grouped.values()]
    .map((topic) => ({ ...topic, importanceScore: Math.min(100, Math.round(topic.importanceScore + Math.min(20, (topic.documents - 1) * 5))) }))
    .sort((a, b) => b.importanceScore - a.importanceScore || b.frequency - a.frequency)
    .slice(0, 15);
}

async function getUserAnalyses(userId: string) {
  return prisma.topicAnalysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { document: { select: { filename: true } } },
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const analyses = await getUserAnalyses(session.user.id);
  return NextResponse.json({ analyses, trends: aggregateAnalyses(analyses as StoredAnalysis[]) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as { documentId?: string; text?: string; zimsecSubject?: string; all?: boolean };

    if (body.all) {
      const documents = await prisma.document.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } });
      const existing = await prisma.topicAnalysis.findMany({ where: { userId: session.user.id }, select: { documentId: true, sourceHash: true } });
      const existingByDocument = new Map(existing.map((analysis) => [analysis.documentId, analysis.sourceHash]));

      for (const document of documents) {
        try {
          const material = await getDocumentText(document.fileUrl, document.filename);
          if (material.trim().length < 50) continue;
          const sourceHash = hashText(material);
          if (existingByDocument.get(document.id) === sourceHash) continue;
          const syllabus = body.zimsecSubject ? (await getSyllabus(body.zimsecSubject)).text : "";
          const topics = await analyze(material, syllabus);
          await prisma.topicAnalysis.upsert({
            where: { documentId: document.id },
            create: { userId: session.user.id, documentId: document.id, topics, sourceHash, syllabusSubject: body.zimsecSubject },
            update: { topics, sourceHash, syllabusSubject: body.zimsecSubject },
          });
        } catch (error) {
          console.error(`Topic analysis failed for ${document.filename}:`, error);
        }
      }

      const analyses = await getUserAnalyses(session.user.id);
      return NextResponse.json({ analyses, trends: aggregateAnalyses(analyses as StoredAnalysis[]) });
    }

    const document = body.documentId
      ? await prisma.document.findFirst({ where: { id: body.documentId, userId: session.user.id } })
      : null;
    if (body.documentId && !document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const material = body.text || (document ? await getDocumentText(document.fileUrl, document.filename) : "");
    if (material.trim().length < 50) return NextResponse.json({ error: "Material is too short to analyze" }, { status: 400 });
    const syllabus = body.zimsecSubject ? (await getSyllabus(body.zimsecSubject)).text : "";
    const topics = await analyze(material, syllabus);
    const analysis = document
      ? await prisma.topicAnalysis.upsert({
          where: { documentId: document.id },
          create: { userId: session.user.id, documentId: document.id, topics, sourceHash: hashText(material), syllabusSubject: body.zimsecSubject },
          update: { topics, sourceHash: hashText(material), syllabusSubject: body.zimsecSubject },
        })
      : null;
    return NextResponse.json({ topics, analysis, syllabusApplied: Boolean(syllabus) });
  } catch (error) {
    console.error("Topic analysis failed", error);
    return NextResponse.json({ error: "Could not analyze topics" }, { status: 500 });
  }
}
