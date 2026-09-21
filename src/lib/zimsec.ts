import { createHash } from "crypto";
import { fetchRemoteFile } from "./fetch-remote-file";

export type TopicTrend = {
  topic: string;
  frequency: number;
  importanceScore: number;
  summary: string;
};

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

async function githubJson(path: string) {
  const c = config();
  if (!c.owner || !c.repo) return null;
  const url = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}?ref=${encodeURIComponent(c.ref)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Syllabus source returned ${response.status}`);
  return response.json();
}

export async function listSyllabusSubjects() {
  const local = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/syllabuses/manifest.json`, { next: { revalidate: 3600 } }).then((r) => r.ok ? r.json() : null).catch(() => null);
  if (local?.subjects?.length) return local.subjects;
  const listing = await githubJson(config().path);
  if (!Array.isArray(listing)) return [];
  return listing.filter((item) => item.type === "file" && /\.(txt|md)$/i.test(item.name)).map((item) => ({ id: item.name.replace(/\.(txt|md)$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: item.name.replace(/\.(txt|md)$/i, ""), path: item.path }));
}

export async function getSyllabus(subject: string) {
  if (!subject) return { text: "", available: false, warning: "No ZIMSEC syllabus selected; using general mode." };
  const subjects = await listSyllabusSubjects();
  const entry = subjects.find((item: { id: string }) => item.id === subject);
  if (!entry) return { text: "", available: false, warning: "The selected ZIMSEC syllabus is unavailable; using general mode." };
  const key = entry.path;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return { text: hit.value, available: true };
  try {
    let text = "";
    if (config().owner && config().repo) {
      const file = await githubJson(entry.path);
      text = Buffer.from(file.content, "base64").toString("utf8");
    } else {
      const response = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/syllabuses/${entry.path.split("/").pop()}`, { next: { revalidate: 3600 } });
      if (!response.ok) throw new Error("Local syllabus unavailable");
      text = await response.text();
    }
    cache.set(key, { value: text, expires: Date.now() + 60 * 60 * 1000 });
    return { text, available: true };
  } catch (error) {
    console.error("Syllabus load failed", error);
    return { text: "", available: false, warning: "We could not load that syllabus; using general mode." };
  }
}

export function syllabusInstruction(text: string) {
  return text ? `\n\nZIMSEC ALIGNMENT (authoritative constraints; do not invent objectives outside this syllabus):\n${text.slice(0, 18000)}\nUse ZIMSEC terminology, objectives, expected depth, and grading style. If the material conflicts with the syllabus, flag the conflict rather than following it.` : "\n\nNo ZIMSEC syllabus is available. Use general academic mode and do not claim ZIMSEC alignment.";
}

export function hashText(text: string) { return createHash("sha256").update(text).digest("hex"); }
