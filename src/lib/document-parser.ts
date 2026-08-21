import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchRemoteFile } from "./fetch-remote-file";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Sends raw document buffers directly to Gemini 1.5 Flash for native parsing.
 */
export async function extractTextWithGemini(
  fileBuffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const base64Data = fileBuffer.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      "You are an expert document parser. Extract all core educational content from this file while stripping candidate instructions, metadata, and exam boilerplate. Return clean Markdown.",
    ]);

    const extractedText = result.response.text();

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("INSUFFICIENT_TEXT");
    }

    return extractedText;
  } catch (error) {
    console.error("Gemini Native Extraction Error:", error);
    throw new Error("FAILED_TO_EXTRACT_DOCUMENT_TEXT");
  }
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
