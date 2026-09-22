import mammoth from "mammoth";
import { fetchRemoteFile } from "./fetch-remote-file";
import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MIN_TEXT_LENGTH = 20;

function extensionFor(filename: string): string {
  return path.extname(filename).toLowerCase();
}

function ensureUsableText(text: string, extension: string): string {
  const normalized = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new Error(extension === ".pdf" ? "NO_SELECTABLE_TEXT" : "INSUFFICIENT_TEXT");
  }
  if (normalized.length < MIN_TEXT_LENGTH) throw new Error("INSUFFICIENT_TEXT");
  return normalized;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      if (text.trim()) pages.push(text);
    }
  } finally {
    await document.destroy();
  }

  return ensureUsableText(pages.join("\n\n"), ".pdf");
}

async function extractDocumentText(buffer: Buffer, filename: string): Promise<string> {
  if (!buffer.length) throw new Error("EMPTY_DOCUMENT");
  if (buffer.length > MAX_FILE_BYTES) throw new Error("DOCUMENT_TOO_LARGE");

  const extension = extensionFor(filename);
  if (extension === ".pdf") return extractPdfText(buffer);
  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return ensureUsableText(result.value, extension);
  }
  if (extension === ".txt") {
    return ensureUsableText(buffer.toString("utf8").replace(/^\uFEFF/, ""), extension);
  }
  throw new Error("UNSUPPORTED_FILE_TYPE");
}

export async function getDocumentText(fileUrl: string, filename: string): Promise<string> {
  let buffer: Buffer;
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    const fetchResult = await fetchRemoteFile(fileUrl);
    if (fetchResult.error || !fetchResult.data) {
      throw new Error(`DOCUMENT_UNAVAILABLE:${fetchResult.status || 422}`);
    }
    buffer = fetchResult.data;
  } else {
    const relativePath = fileUrl.replace("local://", "");
    const fullPath = path.isAbsolute(relativePath) ? relativePath : path.join(process.cwd(), "uploads", relativePath);
    if (!fs.existsSync(fullPath)) throw new Error(`DOCUMENT_REUPLOAD_REQUIRED: Local file not found at ${fullPath}`);
    buffer = fs.readFileSync(fullPath);
  }
  return extractDocumentText(buffer, filename);
}

export async function getFileText(file: File): Promise<string> {
  return extractDocumentText(Buffer.from(await file.arrayBuffer()), file.name);
}

// Kept as a compatibility export for existing callers; extraction is local and never uses Gemini.
export async function extractTextWithGemini(fileBuffer: Buffer, mimeType = "application/pdf"): Promise<string> {
  const extension = mimeType === "application/pdf" ? ".pdf" : mimeType === "text/plain" ? ".txt" : ".docx";
  return extractDocumentText(fileBuffer, `document${extension}`);
}
