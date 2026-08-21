import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import { fetchRemoteFile } from "./fetch-remote-file";

/**
 * Dynamically imports pdf-parse to comply with ESM resolution and pass linting.
 */
async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string }> {
  try {
    const pdfModule = await import("pdf-parse");
    const pdfParse = typeof pdfModule === "function" ? pdfModule : (pdfModule as any).default;

    if (typeof pdfParse !== "function") {
      throw new Error("PDF_PARSER_NOT_INITIALIZED");
    }

    return await pdfParse(buffer);
  } catch (error) {
    console.error("Failed to load PDF parser module:", error);
    throw new Error("PDF_PARSER_NOT_INITIALIZED");
  }
}

/**
 * Strips common exam boilerplate to prevent AI from focusing on metadata.
 */
function sanitizeContent(text: string): string {
  if (!text) return "";
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
    if (lowLine.length < 2) return true;
    return !BOILERPLATE_PATTERNS.some((pattern) => lowLine.includes(pattern));
  });

  return filteredLines.join("\n");
}

/**
 * Utility to extract text from a Buffer based on file extension/type
 */
async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase();
  try {
    if (ext.endsWith(".pdf")) {
      const data = await parsePdfBuffer(buffer);
      return data.text || "";
    } else if (ext.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } else {
      return buffer.toString("utf-8");
    }
  } catch (err: any) {
    console.error(`Extraction failed for ${filename}:`, err);
    if (err.message === "PDF_PARSER_NOT_INITIALIZED") {
      throw err;
    }
    throw new Error("FAILED_TO_EXTRACT_DOCUMENT_TEXT");
  }
}

/**
 * Utility to extract text from a file URL (Local vs Remote)
 */
export async function getDocumentText(fileUrl: string, filename: string): Promise<string> {
  try {
    let buffer: Buffer;

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const fetchResult = await fetchRemoteFile(fileUrl);
      if (fetchResult.error || !fetchResult.data) {
        throw new Error(`DOCUMENT_UNAVAILABLE:${fetchResult.status || 422}`);
      }
      buffer = fetchResult.data;
    } else {
      // Handle local:// or relative paths
      const relativePath = fileUrl.replace("local://", "");
      const fullPath = path.isAbsolute(relativePath)
        ? relativePath
        : path.join(process.cwd(), "uploads", relativePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`DOCUMENT_REUPLOAD_REQUIRED: Local file not found at ${fullPath}`);
      }
      buffer = fs.readFileSync(fullPath);
    }

    const text = await extractTextFromBuffer(buffer, filename);
    const sanitized = sanitizeContent(text);

    // Hallucination Guardrail: 50 character minimum
    if (sanitized.trim().length < 50) {
      throw new Error("INSUFFICIENT_TEXT");
    }

    return sanitized;
  } catch (error: any) {
    console.error(`Document extraction error for ${filename}:`, error);
    throw error;
  }
}

/**
 * Utility to extract text from a File object (e.g., during upload)
 */
export async function getFileText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await extractTextFromBuffer(buffer, file.name);
    const sanitized = sanitizeContent(text);

    if (sanitized.trim().length < 50) {
      throw new Error("INSUFFICIENT_TEXT");
    }

    return sanitized;
  } catch (error) {
    console.error(`File extraction error for ${file.name}:`, error);
    throw error;
  }
}
