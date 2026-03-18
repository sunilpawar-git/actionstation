/**
 * File Upload Validator Tests
 * Validates magic byte detection, MIME mismatch, zip bomb rejection,
 * polyglot detection, and dangerous extension blocking.
 */
import { describe, it, expect } from 'vitest';
import { validateUpload, detectMimeFromBytes } from '../fileUploadValidator.js';

// ─── Magic bytes ──────────────────────────────────────────────────────────

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(100).fill(0)]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(100).fill(0)]);
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, ...Array(100).fill(0)]); // %PDF-
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Array(100).fill(0)]); // PK
const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46, ...Array(100).fill(0)]); // ELF
const PE_MAGIC = Buffer.from([0x4d, 0x5a, ...Array(100).fill(0)]); // MZ

function plainText(content = 'Hello world'): Buffer {
    return Buffer.from(content, 'utf8');
}

// ─── detectMimeFromBytes ──────────────────────────────────────────────────

describe('detectMimeFromBytes', () => {
    it('detects PNG', () => expect(detectMimeFromBytes(PNG_MAGIC)).toBe('image/png'));
    it('detects JPEG', () => expect(detectMimeFromBytes(JPEG_MAGIC)).toBe('image/jpeg'));
    it('detects PDF', () => expect(detectMimeFromBytes(PDF_MAGIC)).toBe('application/pdf'));
    it('detects ZIP', () => expect(detectMimeFromBytes(ZIP_MAGIC)).toBe('application/zip'));
    it('detects ELF executable', () => expect(detectMimeFromBytes(ELF_MAGIC)).toBe('application/x-executable'));
    it('detects PE/MZ executable', () => expect(detectMimeFromBytes(PE_MAGIC)).toBe('application/x-msdos-program'));
    it('returns null for plain text', () => expect(detectMimeFromBytes(plainText())).toBeNull());
});

// ─── validateUpload ───────────────────────────────────────────────────────

describe('validateUpload — archive blocking', () => {
    it('rejects application/zip regardless of content', () => {
        const result = validateUpload(plainText('contents'), 'application/zip', 'file.zip');
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/archive/i);
    });

    it('rejects application/gzip', () => {
        const result = validateUpload(plainText(), 'application/gzip', 'file.gz');
        expect(result.valid).toBe(false);
    });

    it('rejects application/x-7z-compressed', () => {
        const result = validateUpload(plainText(), 'application/x-7z-compressed', 'file.7z');
        expect(result.valid).toBe(false);
    });
});

describe('validateUpload — allow-list', () => {
    it('rejects unlisted MIME types', () => {
        const result = validateUpload(plainText(), 'application/octet-stream', 'file.bin');
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/not permitted/i);
    });

    it('rejects video/mp4', () => {
        const result = validateUpload(plainText(), 'video/mp4', 'video.mp4');
        expect(result.valid).toBe(false);
    });
});

describe('validateUpload — size limits', () => {
    it('rejects oversized text/plain (> 1 MB)', () => {
        const bigBuf = Buffer.alloc(1 * 1024 * 1024 + 1, 0x41); // just over 1 MB
        const result = validateUpload(bigBuf, 'text/plain', 'big.txt');
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/size/i);
    });
});

describe('validateUpload — polyglot / MIME mismatch', () => {
    it('rejects a ZIP disguised as image/png', () => {
        const result = validateUpload(ZIP_MAGIC, 'image/png', 'photo.png');
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/polyglot/i);
        expect(result.detectedMimeType).toBe('application/zip');
    });

    it('rejects an ELF executable disguised as text/plain', () => {
        const result = validateUpload(ELF_MAGIC, 'text/plain', 'readme.txt');
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/polyglot/i);
    });

    it('rejects a JPEG file claiming to be application/pdf', () => {
        const result = validateUpload(JPEG_MAGIC, 'application/pdf', 'doc.pdf');
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/mismatch/i);
    });
});

describe('validateUpload — dangerous extensions', () => {
    it('rejects .exe regardless of MIME', () => {
        const result = validateUpload(plainText(), 'text/plain', 'malware.exe');
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/extension/i);
    });

    it('rejects .sh files', () => {
        const result = validateUpload(plainText('#!/bin/bash'), 'text/plain', 'setup.sh');
        expect(result.valid).toBe(false);
    });

    it('rejects .php files', () => {
        const result = validateUpload(plainText('<?php'), 'text/plain', 'shell.php');
        expect(result.valid).toBe(false);
    });
});

describe('validateUpload — valid files', () => {
    it('accepts a real PNG', () => {
        const result = validateUpload(PNG_MAGIC, 'image/png', 'photo.png');
        expect(result.valid).toBe(true);
        expect(result.detectedMimeType).toBe('image/png');
    });

    it('accepts a real JPEG', () => {
        const result = validateUpload(JPEG_MAGIC, 'image/jpeg', 'photo.jpg');
        expect(result.valid).toBe(true);
    });

    it('accepts a real PDF', () => {
        const result = validateUpload(PDF_MAGIC, 'application/pdf', 'document.pdf');
        expect(result.valid).toBe(true);
    });

    it('accepts plain text (no magic bytes)', () => {
        const result = validateUpload(plainText('Hello, world!'), 'text/plain', 'notes.txt');
        expect(result.valid).toBe(true);
    });

    it('strips MIME type parameters (e.g. charset)', () => {
        const result = validateUpload(plainText('data'), 'text/plain; charset=utf-8', 'file.txt');
        expect(result.valid).toBe(true);
    });
});
