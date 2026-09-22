import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchRemoteFile } from "./fetch-remote-file";
import fs from "fs";
import path from "path";

const CONFIGURED_MODEL = process.env.GEMINI_MODEL?.trim();
const PRIMARY_MODEL = !CONFIGURED_MODEL || CONFIGURED_MODEL.includes("2.5")
  ? "gemini-3.6-flash"
  : CONFIGURED_MODEL;
const FALLBACK_MODEL = "gemini-1.5-flash";
const MAX_ATTEMPTS = 3;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(apiKey);
}

function isRetryable(error: unknown): boolean {
  const value = error as { status?: number; code?: number | string; message?: string };
  const status = Number(value?.status ?? value?.code);
  const message = String(value?.message ?? error ?? "").toLowerCase();
  return [404, 429, 500, 503].includes(status) ||
    /model.*(not found|not supported)|overloaded|resource exhausted|rate limit|temporarily unavailable|high demand/.test(message);
}

function mimeTypeFor(filename: string, providedMimeType?: string): string {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === ".doc") return "application/msword";
  if (extension === ".txt") return "text/plain";

  return providedMimeType && [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ].includes(providedMimeType)
    ? providedMimeType
    : "application/octet-stream";
}

function backoff(attempt: number): Promise<void> {
  const delay = 500 * 2 ** attempt + Math.floor(Math.random() * 250);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function extractWithModel(modelName: string, fileBuffer: Buffer, mimeType: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: modelName });
  const base64Data = fileBuffer.toString("base64");
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        "Extract all educational content from this file. Preserve headings, lists, equations, and table content where possible. Strip instructions and boilerplate. Return clean Markdown only.",
      ]);

      const text = result.response.text().trim();
      if (text.length < 20) throw new Error("INSUFFICIENT_TEXT");
      return text;
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message === "INSUFFICIENT_TEXT") throw error;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS - 1) throw error;
      await backoff(attempt);
    }
  }

  throw lastError ?? new Error("FAILED_TO_EXTRACT_DOCUMENT_TEXT");
}

/**
 * Sends a document to Gemini for native parsing, retrying transient failures and
 * falling back when the configured model is unavailable.
 */
export async function extractTextWithGemini(
  fileBuffer: Buffer,
  mimeType = "application/pdf",
  retries = MAX_ATTEMPTS
): Promise<string> {
  if (!fileBuffer.length) throw new Error("EMPTY_DOCUMENT");
  if (fileBuffer.length > MAX_FILE_BYTES) throw new Error("DOCUMENT_TOO_LARGE");

  // Plain text does not need an AI request and is more reliable when the API
  // receives an empty or generic browser MIME type.
  if (mimeType === "text/plain") {
    const text = fileBuffer.toString("utf8").replace(/^\uFEFF/, "").trim();
    if (text.length < 20) throw new Error("INSUFFICIENT_TEXT");
    return text;
  }

  const attempts = Math.max(1, retries);
  let lastError: unknown;
  for (const modelName of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      // Keep the public retries argument useful for callers while ensuring the
      // normal path still gets the bounded retry behavior above.
      return await extractWithModel(modelName, fileBuffer, mimeType);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && ["INSUFFICIENT_TEXT", "EMPTY_DOCUMENT", "DOCUMENT_TOO_LARGE"].includes(error.message)) {
        throw error;
      }
      if (modelName === FALLBACK_MODEL || !isRetryable(error)) break;
    }
  }

  const message = String((lastError as { message?: string })?.message ?? "").toLowerCase();
  if (message.includes("high demand") || message.includes("503")) {
    throw new Error("GEMINI_TEMPORARILY_UNAVAILABLE");
  }
  throw new Error("FAILED_TO_EXTRACT_DOCUMENT_TEXT");
}

/**
 * Retrieves file contents from URL/local path and delegates parsing to Gemini.
 */
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
    const fullPath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(process.cwd(), "uploads", relativePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`DOCUMENT_REUPLOAD_REQUIRED: Local file not found at ${fullPath}`);
    }
    buffer = fs.readFileSync(fullPath);
  }

  return extractTextWithGemini(buffer, mimeTypeFor(filename));
}

/** Handles File objects directly during user upload. */
export async function getFileText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return extractTextWithGemini(buffer, mimeTypeFor(file.name, file.type));
}
