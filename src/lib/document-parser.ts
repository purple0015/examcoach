import mammoth from "mammoth";
import { fetchRemoteFile } from "./fetch-remote-file";
import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MIN_TEXT_LENGTH = 20;

// PDF.js tries to discover a worker relative to the compiled Next.js chunk. That
// path does not exist in a Render production build, so it falls back to a fake
// worker and fails with "Cannot find module .../pdf.worker.mjs". Point it at the
// worker shipped in the installed pdfjs-dist package instead.
const pdfWorkerPath = path.join(
  process.cwd(),
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.worker.mjs"
);
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerPath;

function extensionFor(filename: string): string {
  return path.extname(filename).toLowerCase();
}

function normalizeText(text: string): string {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}

function ensureUsableText(text: string, extension: string): string {
  const normalized = normalizeText(text);
  if (!normalized) {
    throw new Error(extension === ".pdf" ? "NO_SELECTABLE_TEXT" : "INSUFFICIENT_TEXT");
  }
  if (normalized.length < MIN_TEXT_LENGTH) throw new Error("INSUFFICIENT_TEXT");
  return normalized;
}

/**
 * Ask Gemini to OCR a PDF when PDF.js finds no text layer. This handles scanned
 * PDFs without adding a native OCR binary (which is difficult to deploy on
 * Render). The normal, local PDF.js path remains the default and does not use
 * an AI request.
 */
async function extractPdfTextWithOcr(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("NO_SELECTABLE_TEXT");

  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const modelName = !configuredModel || configuredModel.includes("2.5")
    ? "gemini-3.6-flash"
    : configuredModel;
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelName,
    generationConfig: { temperature: 0 },
  });

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: buffer.toString("base64"),
        },
      },
      "OCR this scanned PDF. Return only the readable document text, preserving headings, paragraphs, lists, equations, and page order. Do not describe the PDF or add commentary.",
    ]);
    return ensureUsableText(result.response.text(), ".pdf");
  } catch {
    throw new Error("NO_SELECTABLE_TEXT");
  }
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

  const selectableText = normalizeText(pages.join("\n\n"));
  if (selectableText.length >= MIN_TEXT_LENGTH) return selectableText;

  // A PDF with no text layer is commonly a scan. Try OCR before returning the
  // old NO_SELECTABLE_TEXT error so existing clients still get a useful error
  // when OCR is unavailable or the document is genuinely unreadable.
  return extractPdfTextWithOcr(buffer);
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

// Kept as a compatibility export for existing callers.
export async function extractTextWithGemini(fileBuffer: Buffer, mimeType = "application/pdf"): Promise<string> {
  const extension = mimeType === "application/pdf" ? ".pdf" : mimeType === "text/plain" ? ".txt" : ".docx";
  return extractDocumentText(fileBuffer, `document${extension}`);
}
