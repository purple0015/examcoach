import { createHash } from "crypto";
import { extractTextWithGemini } from "./document-parser";
import { fetchRemoteFile } from "./fetch-remote-file";

export type TopicTrend = {
  topic: string;
  frequency: number;
  importanceScore: number;
  summary: string;
};

export type SyllabusSubject = { id: string; name: string; path: string; format?: "txt" | "md" | "pdf" };

const DEFAULT_REPO_PATH = "syllabuses";
const cache = new Map<string, { expires: number; value: string }>();

function config() {
  return {
    owner: process.env.ZIMSEC_SYLLABUS_REPO_OWNER,
    repo: process.env.ZIMSEC_SYLLABUS_REPO_NAME,
    path: process.env.ZIMSEC_SYLLABUS_REPO_PATH || DEFAULT_REPO_PATH,
    ref: process.env.ZIMSEC_SYLLABUS_REPO_REF || "main",
  };
}

async function githubJson(filePath: string) {
  const c = config();
  if (!c.owner || !c.repo) return null;
  const url = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${filePath}?ref=${encodeURIComponent(c.ref)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Syllabus source returned ${response.status}`);
  return response.json();
}

function subjectFromFile(name: string, filePath: string): SyllabusSubject {
  const extension = name.toLowerCase().match(/\.(pdf|txt|md)$/)?.[1] as SyllabusSubject["format"];
  const stem = name.replace(/\.(pdf|txt|md)$/i, "");
  return {
    id: stem.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: stem.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    path: filePath,
    format: extension,
  };
}

export async function listSyllabusSubjects(): Promise<SyllabusSubject[]> {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const local = await fetch(`${base}/syllabuses/manifest.json`, { next: { revalidate: 3600 } })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

  if (Array.isArray(local?.subjects)) {
    return local.subjects.filter((subject: SyllabusSubject) => subject.id && subject.name && subject.path);
  }

  const listing = await githubJson(config().path);
  if (!Array.isArray(listing)) return [];
  return listing
    .filter((item) => item.type === "file" && /\.(pdf|txt|md)$/i.test(item.name))
    .map((item) => subjectFromFile(item.name, item.path));
}

async function readSyllabusFile(entry: SyllabusSubject): Promise<string> {
  const c = config();
  if (c.owner && c.repo) {
    const file = await githubJson(entry.path);
    if (!file?.content) throw new Error("Syllabus file has no content");
    const buffer = Buffer.from(file.content.replace(/\s/g, ""), "base64");
    if (entry.format === "pdf" || entry.path.toLowerCase().endsWith(".pdf")) {
      return extractTextWithGemini(buffer, "application/pdf");
    }
    return buffer.toString("utf8");
  }

  const filename = entry.path.split("/").pop() || entry.path;
  const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/syllabuses/${encodeURIComponent(filename)}`, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`Local syllabus returned ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (entry.format === "pdf" || filename.toLowerCase().endsWith(".pdf")) {
    return extractTextWithGemini(buffer, "application/pdf");
  }
  return buffer.toString("utf8");
}

export async function getSyllabus(subject: string) {
  if (!subject) return { text: "", available: false, warning: "No ZIMSEC syllabus selected; using general mode." };
  const subjects = await listSyllabusSubjects();
  const entry = subjects.find((item) => item.id === subject);
  if (!entry) return { text: "", available: false, warning: "The selected ZIMSEC syllabus is unavailable; using general mode." };

  const cacheKey = `${entry.path}:${entry.format || "text"}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return { text: cached.value, available: true, format: entry.format };

  try {
    const text = await readSyllabusFile(entry);
    if (text.trim().length < 50) throw new Error("Syllabus text is too short");
    cache.set(cacheKey, { value: text, expires: Date.now() + 3600000 });
    return { text, available: true, format: entry.format };
  } catch (error) {
    console.error("Syllabus load failed", error);
    return { text: "", available: false, warning: "We could not extract that syllabus PDF; using general mode." };
  }
}

export function syllabusInstruction(text: string) {
  return text
    ? `\n\nZIMSEC GROUNDING (authoritative source):\n${text.slice(0, 18000)}\nOnly answer using the uploaded study material and this syllabus. If a claim cannot be verified from them, say: "This is not covered or cannot be verified from the selected ZIMSEC syllabus." Do not use general model knowledge to fill gaps.`
    : "\n\nGENERAL MODE: No verified ZIMSEC syllabus is available. Do not claim that any answer is ZIMSEC-aligned.";
}

export function hashText(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
