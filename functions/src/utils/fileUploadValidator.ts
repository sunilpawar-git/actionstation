/**
 * File Upload Validator — defends against malicious file uploads.
 *
 * Checks performed (in order):
 *  1. MIME type allow-list — reject anything not explicitly permitted
 *  2. Archive types blocked entirely — no zip bombs via content-type spoofing
 *  3. Size limit per MIME type
 *  4. Magic byte detection — determine actual file type from header bytes
 *  5. Polyglot detection — file is a valid archive/executable despite other claim
 *  6. MIME mismatch — claimed type ≠ detected type
 *  7. Dangerous extension — block even if bytes look clean
 *
 * Usage in a Cloud Function:
 *   const buf = Buffer.from(await req.rawBody);   // or multer / busboy
 *   const result = validateUpload(buf, req.headers['content-type'], filename);
 *   if (!result.valid) { res.status(400).json({ error: result.reason }); return; }
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface FileValidationResult {
    valid: boolean;
    reason: string | null;
    /** MIME type inferred from magic bytes (may differ from claimed type) */
    detectedMimeType?: string;
}

// ─── Limits ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZES: Record<string, number> = {
    'image/png': 10 * 1024 * 1024,      // 10 MB
    'image/jpeg': 10 * 1024 * 1024,     // 10 MB
    'image/gif': 5 * 1024 * 1024,       //  5 MB
    'image/webp': 10 * 1024 * 1024,     // 10 MB
    'application/pdf': 20 * 1024 * 1024, // 20 MB
    'text/plain': 1 * 1024 * 1024,      //  1 MB
    'text/markdown': 1 * 1024 * 1024,   //  1 MB
};

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB fallback

// ─── Allow / Block lists ──────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
]);

/** Archives are always blocked — zip bomb and malware delivery vector */
const ARCHIVE_MIME_TYPES = new Set([
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'application/gzip',
    'application/x-gzip',
    'application/x-tar',
    'application/x-bzip2',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
]);

/** File extensions that must be rejected regardless of MIME or magic bytes */
const DANGEROUS_EXTENSIONS = new Set([
    'exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'vbe', 'js', 'jse',
    'jar', 'php', 'php3', 'phtml', 'py', 'rb', 'pl', 'com', 'pif',
    'gadget', 'msi', 'hta', 'cpl', 'msc', 'scr', 'ws', 'wsf', 'wsc',
    'wsh', 'reg', 'inf', 'lnk', 'application',
]);

// ─── Magic byte signatures ────────────────────────────────────────────────

interface MagicSig {
    mime: string;
    bytes: number[];
    offset?: number;
}

const MAGIC_SIGS: MagicSig[] = [
    { mime: 'image/png',  bytes: [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a] },
    { mime: 'image/jpeg', bytes: [0xff,0xd8,0xff] },
    { mime: 'image/gif',  bytes: [0x47,0x49,0x46,0x38] },          // GIF8
    { mime: 'image/webp', bytes: [0x52,0x49,0x46,0x46] },          // RIFF
    { mime: 'application/pdf', bytes: [0x25,0x50,0x44,0x46] },     // %PDF
    { mime: 'application/zip', bytes: [0x50,0x4b,0x03,0x04] },     // PK
    { mime: 'application/zip', bytes: [0x50,0x4b,0x05,0x06] },     // empty zip
    { mime: 'application/gzip', bytes: [0x1f,0x8b] },
    { mime: 'application/x-rar', bytes: [0x52,0x61,0x72,0x21,0x1a,0x07] }, // Rar!
    { mime: 'application/x-7z', bytes: [0x37,0x7a,0xbc,0xaf,0x27,0x1c] },
    { mime: 'application/x-executable', bytes: [0x7f,0x45,0x4c,0x46] },    // ELF
    { mime: 'application/x-msdos-program', bytes: [0x4d,0x5a] },           // MZ / PE
];

// ─── Core helpers ─────────────────────────────────────────────────────────

/**
 * Detect the file's actual MIME type from the first bytes of the buffer.
 * Returns null when no signature matches (e.g. plain text).
 */
export function detectMimeFromBytes(buffer: Buffer): string | null {
    for (const sig of MAGIC_SIGS) {
        const off = sig.offset ?? 0;
        if (buffer.length < off + sig.bytes.length) continue;
        if (sig.bytes.every((b, i) => buffer[off + i] === b)) {
            return sig.mime;
        }
    }
    return null;
}

// ─── Main validator ───────────────────────────────────────────────────────

/**
 * Validate an uploaded file.
 *
 * @param buffer        Raw file bytes
 * @param claimedMime   Content-Type header value (may be spoofed)
 * @param filename      Original filename (used for extension check)
 */
export function validateUpload(
    buffer: Buffer,
    claimedMime: string,
    filename: string,
): FileValidationResult {
    const mime = claimedMime.split(';')[0]?.trim() ?? claimedMime;

    // 1. Block archives regardless of anything else
    if (ARCHIVE_MIME_TYPES.has(mime)) {
        return { valid: false, reason: 'Archive file types are not permitted' };
    }

    // 2. Allow-list
    if (!ALLOWED_MIME_TYPES.has(mime)) {
        return { valid: false, reason: `File type '${mime}' is not permitted` };
    }

    // 3. Size limit
    const maxSize = MAX_FILE_SIZES[mime] ?? DEFAULT_MAX_SIZE;
    if (buffer.length > maxSize) {
        return {
            valid: false,
            reason: `File size (${buffer.length} bytes) exceeds limit of ${maxSize} bytes for type ${mime}`,
        };
    }

    // 4. Magic byte detection
    const detected = detectMimeFromBytes(buffer);

    // 5. Polyglot: file is secretly an archive/executable
    if (detected && (ARCHIVE_MIME_TYPES.has(detected) || detected === 'application/x-executable' || detected === 'application/x-msdos-program')) {
        return {
            valid: false,
            reason: `Polyglot file detected: magic bytes indicate '${detected}' inside file claiming to be '${mime}'`,
            detectedMimeType: detected,
        };
    }

    // 6. MIME mismatch
    if (detected && detected !== mime) {
        return {
            valid: false,
            reason: `MIME type mismatch: claimed '${mime}', magic bytes indicate '${detected}'`,
            detectedMimeType: detected,
        };
    }

    // 7. Dangerous extension
    const ext = filename.toLowerCase().split('.').pop() ?? '';
    if (DANGEROUS_EXTENSIONS.has(ext)) {
        return { valid: false, reason: `Dangerous file extension: .${ext}` };
    }

    return { valid: true, reason: null, detectedMimeType: detected ?? mime };
}
