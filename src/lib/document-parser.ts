import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Wrapper for file-based uploads
 */
export async function getFileText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractTextWithGemini(buffer, file.type);
}

/**
 * Sends raw document buffers directly to Gemini 1.5 Flash for native parsing
 */
export async function extractTextWithGemini(
  fileBuffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const base64Data = fileBuffer.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      `You are an expert document parser for an educational platform. Analyze the attached document and process its contents according to these rules:

1. IGNORE BOILERPLATE: Strip out exam instructions, candidate details, seat numbers, page footers, total marks, and time limits.
2. EXTRACT CORE CONTENT: Preserve all questions, prompts, passage texts, mathematical formulas, and contextual data intact.
3. FORMATTING: Output clean, structured Markdown. Retain question numbering and logical section hierarchy.
4. QUALITY CONTROL: Do not summarize or alter original question phrasing. Return only the sanitized extracted text.`,
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
