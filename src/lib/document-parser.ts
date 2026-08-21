// @ts-ignore
const pdf = require("pdf-parse");

/**
 * Utility to extract text from a file URL (e.g., Vercel Blob)
 */
export async function getDocumentText(fileUrl: string, filename: string): Promise<string> {
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);

    if (filename.toLowerCase().endsWith(".pdf")) {
      const arrayBuffer = await res.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      // @ts-ignore
      const data = await pdf(pdfBuffer);
      return data.text || "";
    }

    // Default to text extraction for .txt and others
    return await res.text();
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
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);
      // @ts-ignore
      const data = await pdf(pdfBuffer);
      return data.text || "";
    }

    return await file.text();
  } catch (error) {
    console.error(`File extraction error for ${file.name}:`, error);
    return file.name;
  }
}
