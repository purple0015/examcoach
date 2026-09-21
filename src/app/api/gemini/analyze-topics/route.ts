import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDocumentText } from "@/lib/document-parser";
import { getSyllabus, hashText, syllabusInstruction, type TopicTrend } from "@/lib/zimsec";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function analyze(material: string, syllabus: string): Promise<TopicTrend[]> {
  if (!process.env.GEMINI_API_KEY) throw new Error("AI service is not configured");
  const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json", temperature: 0.2 } });
  const result = await model.generateContent(`You are an exam trend analyst. Extract and cluster the distinct academic topics in this material. Count frequency as the number of meaningful mentions or sections, then rank importance from 0 to 100 using repetition, learning objectives, assessment relevance, and prerequisite value. Return ONLY JSON: {"topics":[{"topic":string,"frequency":number,"importanceScore":number,"summary":string}]}. Sort descending by importanceScore. Maximum 15 topics.\n${syllabusInstruction(syllabus)}\nMATERIAL:\n${material.slice(0, 30000)}`);
  const raw = result.response.text();
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) as { topics?: TopicTrend[] };
  return (parsed.topics || []).filter((t) => t.topic && Number.isFinite(t.frequency)).map((t) => ({ topic: t.topic.trim(), frequency: Math.max(1, Math.round(t.frequency)), importanceScore: Math.max(0, Math.min(100, Math.round(t.importanceScore))), summary: t.summary || "" })).slice(0, 15);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.topicAnalysis.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20, include: { document: { select: { filename: true } } } });
  return NextResponse.json({ analyses: rows });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { documentId, text, zimsecSubject } = await req.json();
    const document = documentId ? await prisma.document.findFirst({ where: { id: documentId, userId: session.user.id } }) : null;
    if (documentId && !document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const material = text || (document ? await getDocumentText(document.fileUrl, document.filename) : "");
    if (material.trim().length < 50) return NextResponse.json({ error: "Material is too short to analyze" }, { status: 400 });
    const syllabus = zimsecSubject ? (await getSyllabus(zimsecSubject)).text : "";
    const topics = await analyze(material, syllabus);
    const analysis = document ? await prisma.topicAnalysis.upsert({ where: { documentId: document.id }, create: { userId: session.user.id, documentId: document.id, topics, sourceHash: hashText(material) }, update: { topics, sourceHash: hashText(material) } }) : null;
    return NextResponse.json({ topics, analysis, syllabusApplied: Boolean(syllabus) });
  } catch (error) { console.error("Topic analysis failed", error); return NextResponse.json({ error: "Could not analyze topics" }, { status: 500 }); }
}
