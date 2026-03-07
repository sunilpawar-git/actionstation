/**
 * ImageFileParser — Handles .png, .jpg, .jpeg files
 * Compresses images via Canvas API, describes with Gemini Vision
 * Marks for Firebase Storage upload
 * Implements FileParser interface (Open/Closed principle)
 */
import type { FileParser, ParseResult } from './types';
import { compressImage } from '../utils/imageCompressor';
import { describeImageWithAI } from '../services/imageDescriptionService';
import { titleFromFilename } from './parserUtils';
import { sanitizeFilename } from '@/shared/utils/sanitize';

const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
const SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg'] as const;

export class ImageFileParser implements FileParser {
    readonly supportedMimeTypes = SUPPORTED_MIME_TYPES;
    readonly supportedExtensions = SUPPORTED_EXTENSIONS;

    canParse(file: File): boolean {
        if (SUPPORTED_MIME_TYPES.some((t) => t === file.type)) return true;
        const name = file.name.toLowerCase();
        return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
    }

    async parse(file: File): Promise<ParseResult> {
        const compressed = await compressImage(file);
        const description = await describeImageWithAI(compressed, sanitizeFilename(file.name));

        return {
            title: titleFromFilename(file.name),
            content: description,
            mimeType: 'image/jpeg', // Always JPEG after compression
            originalFileName: file.name,
            blob: compressed,
            metadata: {
                requiresUpload: true,
            },
        };
    }
}
