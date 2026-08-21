// @ts-ignore
const pdf = require("pdf-parse");

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
 * Utility to extract text from a file URL (e.g., Vercel Blob)
 */
export async function getDocumentText(fileUrl: string, filename: string): Promise<string> {
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);

    let text = "";
    if (filename.toLowerCase().endsWith(".pdf")) {
      const arrayBuffer = await res.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      // @ts-ignore
      const data = await pdf(pdfBuffer);
      text = data.text || "";
    } else {
      // Default to text extraction for .txt and others
      text = await res.text();
    }

    return sanitizeContent(text);
  } catch (error) {
    console.error(`Document extraction error for ${filename}:`, error);
    // Fallback to filename so something is returned
    return filename;
  }
}

/**
 * Utility to extract text from a File object (e.g., during upload)
 */
export async function getFileText(file: File): Promise<string> {
  try {
    let text = "";
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      // @ts-ignore
      const data = await pdf(pdfBuffer);
      text = data.text || "";
    } else {
      text = await file.text();
    }

    return sanitizeContent(text);
  } catch (error) {
    console.error(`File extraction error for ${file.name}:`, error);
    return file.name;
  }
}
