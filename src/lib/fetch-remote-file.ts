/**
 * Result of a remote file fetch attempt.
 */
export type FileFetchResult = {
  data?: Buffer;
  error?: "INVALID_FILE_URL" | "REMOTE_FILE_NOT_FOUND" | "FETCH_FAILED";
  status?: number;
};

/**
 * Robustly fetches a remote file with validation and timeout.
 */
export async function fetchRemoteFile(fileUrl: string): Promise<FileFetchResult> {
  if (!fileUrl || !fileUrl.startsWith("http")) {
    return { error: "INVALID_FILE_URL", status: 422 };
  }

  try {
    // 10-second timeout guard
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(fileUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'ExamCoach/1.0',
        ...(process.env.BLOB_READ_WRITE_TOKEN && {
          'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        })
      }
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`Remote file fetch failed: ${res.status} ${res.statusText} for ${fileUrl}`);
      return { error: "REMOTE_FILE_NOT_FOUND", status: res.status || 404 };
    }

    const arrayBuffer = await res.arrayBuffer();
    return { data: Buffer.from(arrayBuffer) };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`Remote file fetch timed out: ${fileUrl}`);
    } else {
      console.error(`Remote file fetch error:`, err);
    }
    return { error: "FETCH_FAILED", status: 502 };
  }
}
