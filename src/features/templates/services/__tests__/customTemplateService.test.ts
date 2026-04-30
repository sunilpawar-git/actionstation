/**
 * TDD: customTemplateService tests — Firestore-backed custom template CRUD.
 * Write failing tests before implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CanvasNode } from '@/features/canvas/types/node';
import {
    saveTemplate, getCustomTemplates, deleteCustomTemplate,
} from '../customTemplateService';

const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock('@/config/firebase', () => ({ db: {} }));
vi.mock('@/shared/services/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('firebase/firestore', () => ({
    collection: vi.fn((dbOrRef: unknown, ...segments: string[]) => {
        const base = (dbOrRef as { _path?: string })._path ?? '[db]';
        return { _path: `${base}/${segments.join('/')}` };
    }),
    doc: vi.fn((collOrDb: unknown, ...segments: string[]) => {
        const base = (collOrDb as { _path?: string })._path ?? '[db]';
        const fullPath = segments.length ? `${base}/${segments.join('/')}` : base;
        const lastSeg = segments[segments.length - 1];
        return { _path: fullPath, id: lastSeg ?? '' };
    }),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
    query: vi.fn((ref: unknown) => ref),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => 'SERVER_TS'),
}));

const USER_ID = 'user-123';

function makeNode(id: string): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: { heading: `Heading ${id}`, output: `Output ${id}`, colorKey: 'default' },
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function makeFirestoreDoc(data: object) {
    return { id: 'tpl-1', data: () => data };
}

describe('saveTemplate', () => {
    beforeEach(() => { vi.clearAllMocks(); mockGetDocs.mockResolvedValue({ docs: [] }); });

    it('throws ZodError if name is empty string', async () => {
        await expect(saveTemplate(USER_ID, '', [makeNode('n1')], [])).rejects.toThrow();
    });

    it('throws ZodError if name exceeds 50 characters', async () => {
        const longName = 'a'.repeat(51);
        await expect(saveTemplate(USER_ID, longName, [makeNode('n1')], [])).rejects.toThrow();
    });

    it('throws if canvas is empty (zero nodes)', async () => {
        await expect(saveTemplate(USER_ID, 'My Template', [], [])).rejects.toThrow();
    });

    it('throws if already at MAX_CUSTOM_TEMPLATES (10)', async () => {
        const validDoc = makeFirestoreDoc({
            id: 't1', name: 'T', description: '', category: 'custom',
            isCustom: true, nodes: [], edges: [],
        });
        mockGetDocs.mockResolvedValue({ docs: Array.from({ length: 10 }, () => validDoc) });
        await expect(saveTemplate(USER_ID, 'New Template', [makeNode('n1')], [])).rejects.toThrow();
    });

    it('calls setDoc with correct Firestore path and saves the template', async () => {
        mockSetDoc.mockResolvedValue(undefined);
        const result = await saveTemplate(USER_ID, 'My Template', [makeNode('n1')], []);
        expect(mockSetDoc).toHaveBeenCalledOnce();
        expect(result.name).toBe('My Template');
        expect(result.isCustom).toBe(true);
        expect(result.category).toBe('custom');
        expect(result.nodes).toHaveLength(1);
    });

    it('trims whitespace from template name', async () => {
        mockSetDoc.mockResolvedValue(undefined);
        const result = await saveTemplate(USER_ID, '  My Template  ', [makeNode('n1')], []);
        expect(result.name).toBe('My Template');
    });
});

describe('getCustomTemplates', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns an empty array when collection is empty', async () => {
        mockGetDocs.mockResolvedValue({ docs: [] });
        const result = await getCustomTemplates(USER_ID);
        expect(result).toEqual([]);
    });

    it('returns validated templates from Firestore', async () => {
        const validData = {
            id: 'tpl-1', name: 'My Template', description: 'desc',
            category: 'custom', isCustom: true,
            nodes: [{ templateId: 'n1', heading: 'H', output: '', position: { x: 0, y: 0 }, colorKey: 'default' }],
            edges: [],
        };
        mockGetDocs.mockResolvedValue({ docs: [makeFirestoreDoc(validData)] });
        const result = await getCustomTemplates(USER_ID);
        expect(result).toHaveLength(1);
        expect(result[0]!.name).toBe('My Template');
    });

    it('skips and warns on documents that fail Zod validation', async () => {
        const badData = { id: 'x', name: 'X', category: 'invalid-category' };
        mockGetDocs.mockResolvedValue({ docs: [makeFirestoreDoc(badData)] });
        const { logger } = await import('@/shared/services/logger');
        const result = await getCustomTemplates(USER_ID);
        expect(result).toHaveLength(0);
        expect(logger.warn).toHaveBeenCalled();
    });

    it('uses limit() in the Firestore query (query cap rule)', async () => {
        const { limit } = await import('firebase/firestore');
        mockGetDocs.mockResolvedValue({ docs: [] });
        await getCustomTemplates(USER_ID);
        expect(limit).toHaveBeenCalled();
    });
});

describe('deleteCustomTemplate', () => {
    beforeEach(() => vi.clearAllMocks());

    it('calls deleteDoc with the correct path', async () => {
        mockDeleteDoc.mockResolvedValue(undefined);
        await deleteCustomTemplate(USER_ID, 'tpl-abc');
        expect(mockDeleteDoc).toHaveBeenCalledOnce();
        const callArg = mockDeleteDoc.mock.calls[0]![0];
        expect(callArg._path).toContain(USER_ID);
        expect(callArg._path).toContain('tpl-abc');
    });

    it('calls deleteDoc with path including "templates"', async () => {
        mockDeleteDoc.mockResolvedValue(undefined);
        await deleteCustomTemplate(USER_ID, 'tpl-xyz');
        const callArg = mockDeleteDoc.mock.calls[0]![0];
        expect(callArg._path).toContain('templates');
    });
});
