/**
 * Stream Reader - Safe streaming response body readers
 * Enforces byte limits mid-stream to prevent OOM from adversarial servers
 * that omit Content-Length and stream arbitrarily large responses.
 */

/**
 * Read a Response body as raw bytes, aborting the stream if it exceeds maxBytes.
 * Uses ReadableStream for incremental reading when available (production fetch).
 * Falls back to arrayBuffer() for environments without streaming (test mocks).
 * Returns null if the body exceeds maxBytes.
 */
export async function readBytesWithLimit(
    response: Response,
    maxBytes: number,
): Promise<Buffer | null> {
    if (response.body) {
        return readStreamBytes(response.body, maxBytes);
    }
    // Fallback: test mocks may not provide a streaming body
    const ab = await response.arrayBuffer();
    if (ab.byteLength > maxBytes) return null;
    return Buffer.from(ab);
}

/**
 * Read a Response body as UTF-8 text, aborting the stream if it exceeds maxBytes.
 * Uses ReadableStream for incremental reading when available (production fetch).
 * Falls back to response.text() for environments without streaming (test mocks).
 * Returns null if the body exceeds maxBytes.
 */
export async function readTextWithLimit(
    response: Response,
    maxBytes: number,
): Promise<string | null> {
    if (response.body) {
        const buffer = await readStreamBytes(response.body, maxBytes);
        if (!buffer) return null;
        return new TextDecoder().decode(buffer);
    }
    // Fallback for test mocks
    const text = await response.text();
    if (text.length > maxBytes) return null;
    return text;
}

/**
 * Read a ReadableStream incrementally, stopping and cancelling at maxBytes.
 * Cancels the upstream stream immediately on overflow to release server resources.
 */
async function readStreamBytes(
    body: ReadableStream<Uint8Array>,
    maxBytes: number,
): Promise<Buffer | null> {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > maxBytes) {
                void reader.cancel(); // Release server-side resources immediately
                return null;
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}
