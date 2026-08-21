// @ts-ignore
const pdf = require("pdf-parse");
import fs from "fs";
import path from "path";

/**
 * Strips common exam boilerplate to prevent AI from focusing on meta-data.
 */
function sanitizeContent(text: string): string {
  const lines = text.split("\n");
  const BOILERPLATE_PATTERNS = [
    "instructions to candidates",
    "time allowed",
    "write your center number",
    "answer all questions",
    "information for candidates",
    "materials required",
    "total marks",
    "do not open this booklet",
    "candidate name",
    "index number",
  ];

  const filteredLines = lines.filter((line) => {
    const lowLine = line.toLowerCase().trim();
    if (lowLine.length < 2) return true; // Keep short lines like formulas
    return !BOILERPLATE_PATTERNS.some((pattern) => lowLine.includes(pattern));
  });

  return filteredLines.join("\n");
}

/**
 * Utility to extract text from a file URL (Local vs Remote)
 */
export async function getDocumentText(fileUrl: string, filename: string): Promise<string> {
  try {
    let buffer: Buffer;
    
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Failed to fetch remote file: ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Handle local:// or relative paths
      const relativePath = fileUrl.replace("local://", "");
      // Look in process.cwd()/uploads as per requirement, or fallback to current dir if not prefixed
      const fullPath = path.isAbsolute(relativePath) 
        ? relativePath 
        : path.join(process.cwd(), "uploads", relativePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Local file not found at ${fullPath}`);
      }
      buffer = fs.readFileSync(fullPath);
    }

    let text = "";
    if (filename.toLowerCase().endsWith(".pdf")) {
      // @ts-ignore
      const data = await pdf(buffer);
      text = data.text || "";
    } else {
      text = buffer.toString("utf-8");
    }

    const sanitized = sanitizeContent(text);
    
    // Hallucination Guardrail: 50 character minimum
    if (sanitized.trim().length < 50) {
      throw new Error("INSUFFICIENT_TEXT");
    }

    return sanitized;
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_TEXT") throw error;
    console.error(`Document extraction error for ${filename}:`, error);
    // Fallback to filename so something is returned if it's not a guardrail issue
    return filename;
  }
}

/**
 * Utility to extract text from a File object (e.g., during upload)
 */
export async function getFileText(file: File): Promise<string> {
  try {
    let text = "";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // @ts-ignore
      const data = await pdf(buffer);
      text = data.text || "";
    } else {
      text = buffer.toString("utf-8");
    }

    return sanitizeContent(text);
  } catch (error) {
    console.error(`File extraction error for ${file.name}:`, error);
    return file.name;
  }
}
