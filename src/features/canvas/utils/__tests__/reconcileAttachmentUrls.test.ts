/**
 * reconcileAttachmentUrls — Tests for the blur-during-upload URL fix
 */
import { describe, it, expect } from 'vitest';
import { reconcileAttachmentUrls } from '../reconcileAttachmentUrls';
import type { AttachmentMeta } from '../../types/document';

function makeOutput(url: string, filename: string): string {
    const payload = JSON.stringify({ url, filename, thumbnailUrl: null, mimeType: 'application/pdf' });
    return `<div data-attachment='${payload}'></div>`;
}

const VALID_META: AttachmentMeta = {
    filename: 'doc.pdf',
    url: 'https://storage.example.com/doc.pdf',
    thumbnailUrl: 'https://storage.example.com/doc.thumb.png',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
};

describe('reconcileAttachmentUrls', () => {
    it('patches empty url from matching attachment meta', () => {
        const output = makeOutput('', 'doc.pdf');
        const result = reconcileAttachmentUrls(output, [VALID_META]);

        expect(result).toContain('"url":"https://storage.example.com/doc.pdf"');
        expect(result).toContain('"filename":"doc.pdf"');
    });

    it('preserves existing non-empty urls', () => {
        const output = makeOutput('https://existing.com/file.pdf', 'doc.pdf');
        const result = reconcileAttachmentUrls(output, [VALID_META]);

        expect(result).toBe(output);
    });

    it('returns original when attachments array is undefined', () => {
        const output = makeOutput('', 'doc.pdf');
        expect(reconcileAttachmentUrls(output, undefined)).toBe(output);
    });

    it('returns original when attachments array is empty', () => {
        const output = makeOutput('', 'doc.pdf');
        expect(reconcileAttachmentUrls(output, [])).toBe(output);
    });

    it('returns original when no filename matches', () => {
        const output = makeOutput('', 'other.pdf');
        const result = reconcileAttachmentUrls(output, [VALID_META]);
        expect(result).toBe(output);
    });

    it('patches multiple attachments in one output', () => {
        const output = [
            makeOutput('', 'a.pdf'),
            '<p>some text</p>',
            makeOutput('', 'b.pdf'),
        ].join('\n');

        const metas: AttachmentMeta[] = [
            { ...VALID_META, filename: 'a.pdf', url: 'https://cdn/a.pdf' },
            { ...VALID_META, filename: 'b.pdf', url: 'https://cdn/b.pdf' },
        ];

        const result = reconcileAttachmentUrls(output, metas);
        expect(result).toContain('"url":"https://cdn/a.pdf"');
        expect(result).toContain('"url":"https://cdn/b.pdf"');
    });

    it('skips attachment meta with empty url', () => {
        const output = makeOutput('', 'doc.pdf');
        const brokenMeta = { ...VALID_META, url: '' };
        const result = reconcileAttachmentUrls(output, [brokenMeta]);
        expect(result).toBe(output);
    });

    it('returns empty string unchanged', () => {
        expect(reconcileAttachmentUrls('', [VALID_META])).toBe('');
    });

    it('patches thumbnailUrl from meta when available', () => {
        const output = makeOutput('', 'doc.pdf');
        const result = reconcileAttachmentUrls(output, [VALID_META]);
        expect(result).toContain('"thumbnailUrl":"https://storage.example.com/doc.thumb.png"');
    });
});
