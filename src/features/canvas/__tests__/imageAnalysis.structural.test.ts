/**
 * Image Analysis — Structural safety tests (Phase 5D)
 * Prevents regressions: MIME SSOT, sanitization, no AttachmentMeta for images
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = resolve(__dirname, '../../..');

function readSrc(relPath: string): string {
    return readFileSync(resolve(SRC, relPath), 'utf-8');
}

describe('Image Analysis structural safety', () => {
    it('imageDescriptionService uses blob.type, not hardcoded MIME', () => {
        const src = readSrc('features/knowledgeBank/services/imageDescriptionService.ts');
        expect(src).toContain('blob.type');
        expect(src).not.toContain("buildVisionRequestBody(prompt, base64Data, 'image/jpeg')");
    });

    it('ALLOWED_IMAGE_MIMES derived from IMAGE_ACCEPTED_MIME_TYPES (SSOT)', () => {
        const src = readSrc('features/knowledgeBank/services/imageDescriptionService.ts');
        expect(src).toContain("from '@/features/canvas/types/image'");
        expect(src).toContain('IMAGE_ACCEPTED_MIME_TYPES');
        expect(src).toContain('new Set(IMAGE_ACCEPTED_MIME_TYPES)');
    });

    it('sanitizeFilename used on image filenames in handler', () => {
        const src = readSrc('features/canvas/hooks/useIdeaCardImageHandlers.ts');
        expect(src).toContain('sanitizeFilename');
        expect(src).toContain("import { sanitizeFilename } from '@/shared/utils/sanitize'");
    });

    it('no AttachmentMeta created for images in handler', () => {
        const src = readSrc('features/canvas/hooks/useIdeaCardImageHandlers.ts');
        const afterInsertBlock = src.slice(
            src.indexOf('handleAfterImageInsert'),
            src.indexOf('useImageInsert(editor'),
        );
        expect(afterInsertBlock).not.toContain('AttachmentMeta');
        expect(afterInsertBlock).not.toContain('updateNodeAttachments');
    });

    it('autoAnalyzeDocuments checked BEFORE describeImageWithAI call', () => {
        const src = readSrc('features/canvas/hooks/useIdeaCardImageHandlers.ts');
        const fnStart = src.indexOf('function triggerImageAnalysis');
        expect(fnStart).toBeGreaterThan(-1);
        const body = src.slice(fnStart);
        const autoIdx = body.indexOf('autoAnalyzeDocuments');
        const describeIdx = body.indexOf('describeImageWithAI');
        expect(autoIdx).toBeGreaterThan(-1);
        expect(describeIdx).toBeGreaterThan(-1);
        expect(autoIdx).toBeLessThan(describeIdx);
    });

    it('fileHandlerExtension passes onAfterImageInsert to insertImageIntoEditor', () => {
        const src = readSrc('features/canvas/extensions/fileHandlerExtension.ts');
        expect(src).toContain('onAfterImageInsert?: AfterImageInsertFn');
        expect(src).toContain('imageUploadFn, onAfterImageInsert');
    });

    it('all modified production files under 300 lines', () => {
        const files = [
            'features/knowledgeBank/services/imageDescriptionService.ts',
            'features/canvas/services/imageInsertService.ts',
            'features/canvas/hooks/useIdeaCardImageHandlers.ts',
            'features/canvas/hooks/useImageInsert.ts',
        ];
        for (const f of files) {
            const lines = readSrc(f).split('\n').length;
            expect(lines, `${f} has ${lines} lines`).toBeLessThanOrEqual(300);
        }
    });
});
