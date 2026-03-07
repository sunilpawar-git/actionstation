/**
 * FileHandler Extension Tests — Validates configuration and MIME type filtering
 */
import { describe, it, expect, vi } from 'vitest';
import { IMAGE_ACCEPTED_MIME_TYPES } from '../../types/image';
import { createFileHandlerExtension } from '../fileHandlerExtension';

describe('createFileHandlerExtension', () => {
    it('returns a configured extension', () => {
        const uploadFn = vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg');
        const ext = createFileHandlerExtension(uploadFn);
        expect(ext).toBeDefined();
        expect(ext.name).toBe('fileHandler');
    });

    it('accepts onAfterImageInsert as third parameter', () => {
        const uploadFn = vi.fn().mockResolvedValue('https://cdn.example.com/img.jpg');
        const afterInsert = vi.fn();
        const ext = createFileHandlerExtension(uploadFn, undefined, afterInsert);
        expect(ext).toBeDefined();
        expect(ext.name).toBe('fileHandler');
    });

    it('allows all accepted image MIME types', () => {
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/jpeg');
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/png');
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/gif');
        expect(IMAGE_ACCEPTED_MIME_TYPES).toContain('image/webp');
    });
});
