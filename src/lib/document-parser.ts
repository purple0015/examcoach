import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchRemoteFile } from "./fetch-remote-file";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

/**
 * Sends raw document buffers directly to Gemini Flash for native parsing with retry logic.
 */
export async function extractTextWithGemini(
  fileBuffer: Buffer,
  mimeType: string = "application/pdf",
  retries = 3
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const base64Data = fileBuffer.toString("base64");

  const maxRetries = 5; // Increased retries for high-demand scenarios
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        "Extract all educational content from this file. Strip instructions and boilerplate. Return clean Markdown.",
      ]);

      const extractedText = result.response.text();
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error("INSUFFICIENT_TEXT");
      }

      return extractedText;
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const message = error?.message?.toLowerCase() || "";
      const is503 = status === 503 || message.includes("503") || message.includes("high demand");
      const is429 = status === 429 || message.includes("429") || message.includes("quota");
      
      const isRetryable = is503 || is429;
      
      if (isRetryable && attempt < maxRetries) {
        // Longer backoff for 503/High Demand
        const baseDelay = is503 ? 5000 : 2000;
        const backoffMs = Math.pow(2, attempt) * baseDelay + Math.random() * 2000;
        
        console.warn(`[Gemini Extraction] Received ${is503 ? '503 (High Demand)' : '429 (Rate Limit)'}. Retrying (${attempt}/${maxRetries}) in ${Math.round(backoffMs)}ms...`);
        
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      
      if (is503) {
        console.error("Gemini is currently unavailable due to high demand after maximum retries.");
        throw new Error("GEMINI_TEMPORARILY_UNAVAILABLE");
      }

      console.error(`Gemini Extraction failed on attempt ${attempt}:`, error);
      if (error?.message === "INSUFFICIENT_TEXT") throw error;
      throw new Error("FAILED_TO_EXTRACT_DOCUMENT_TEXT");
    }
  }

  throw new Error("FAILED_TO_EXTRACT_DOCUMENT_TEXT");
}

/**
 * Retrieves file contents from URL/local path and delegates parsing to Gemini.
 * Exported to satisfy existing API route imports.
 */
export async function getDocumentText(fileUrl: string, filename: string): Promise<string> {
  try {
    console.log(`[getDocumentText] Requesting file: ${filename} at URL/Path: ${fileUrl}`);
    let buffer: Buffer;

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      const fetchResult = await fetchRemoteFile(fileUrl);
      if (fetchResult.error || !fetchResult.data) {
        console.error(`[getDocumentText] Fetch failed with status ${fetchResult.status} for URL: ${fileUrl}`);
        throw new Error(`DOCUMENT_UNAVAILABLE:${fetchResult.status || 422}`);
      }
      buffer = fetchResult.data;
    } else {
      const relativePath = fileUrl.replace("local://", "");
      const fullPath = path.isAbsolute(relativePath)
        ? relativePath
        : path.join(process.cwd(), "uploads", relativePath);

      if (!fs.existsSync(fullPath)) {
        console.error(`[getDocumentText] File missing on server disk at path: ${fullPath}`);
        throw new Error(`DOCUMENT_REUPLOAD_REQUIRED: Local file not found at ${fullPath}`);
      }
      buffer = fs.readFileSync(fullPath);
    }

    const ext = filename.toLowerCase();
    let mimeType = "application/pdf";
    if (ext.endsWith(".docx")) {
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (ext.endsWith(".txt")) {
      mimeType = "text/plain";
    }

    return await extractTextWithGemini(buffer, mimeType);
  } catch (error) {
    console.error(`Error in getDocumentText for ${filename}:`, error);
    throw error;
  }
}

/**
 * Handles File objects directly during user upload.
 */
export async function getFileText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractTextWithGemini(buffer, file.type || "application/pdf");
}
