/**
 * Search Filters — Unit Tests
 */
import { describe, it, expect } from 'vitest';
import {
    matchesTags,
    matchesDateRange,
    matchesContentType,
    applyFilters,
} from '../searchFilters';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

function makeNode(overrides: Partial<CanvasNode> = {}): CanvasNode {
    return {
        id: 'n1', workspaceId: 'ws-1', type: 'idea',
        data: { heading: 'Test' }, position: { x: 0, y: 0 },
        createdAt: new Date('2025-06-01'), updatedAt: new Date('2025-06-01'),
        ...overrides,
    };
}

function makeEdge(source: string, target: string): CanvasEdge {
    return { id: 'e1', workspaceId: 'ws-1', sourceNodeId: source, targetNodeId: target, relationshipType: 'related' };
}

describe('matchesTags', () => {
    it('returns true when node has a matching tag', () => {
        expect(matchesTags(makeNode({ data: { tags: ['react', 'hooks'] } }), ['react'])).toBe(true);
    });
    it('returns false when no tags match', () => {
        expect(matchesTags(makeNode({ data: { tags: ['react'] } }), ['vue'])).toBe(false);
    });
    it('handles undefined tags gracefully', () => {
        expect(matchesTags(makeNode({ data: { heading: 'no tags' } }), ['react'])).toBe(false);
    });
});

describe('matchesDateRange', () => {
    const node = makeNode({ updatedAt: new Date('2025-06-15') });

    it('includes nodes within range', () => {
        expect(matchesDateRange(node, new Date('2025-06-01'), new Date('2025-06-30'))).toBe(true);
    });
    it('excludes nodes before from', () => {
        expect(matchesDateRange(node, new Date('2025-07-01'), null)).toBe(false);
    });
    it('excludes nodes after to', () => {
        expect(matchesDateRange(node, null, new Date('2025-05-01'))).toBe(false);
    });
    it('handles null from/to (open-ended)', () => {
        expect(matchesDateRange(node, null, null)).toBe(true);
    });
    it('handles invalid Date (NaN) gracefully — security', () => {
        const badNode = makeNode({ updatedAt: new Date('invalid') });
        expect(matchesDateRange(badNode, new Date('2025-01-01'), null)).toBe(true);
    });
});

describe('matchesContentType', () => {
    it('hasOutput filters correctly', () => {
        expect(matchesContentType(makeNode({ data: { output: 'AI response' } }), 'hasOutput', [])).toBe(true);
        expect(matchesContentType(makeNode({ data: { output: '' } }), 'hasOutput', [])).toBe(false);
    });
    it('hasAttachments filters correctly', () => {
        const withAttach = makeNode({ data: { attachments: [{ id: 'a', fileName: 'f', fileType: 'pdf', storagePath: 'p', fileSize: 1, uploadedAt: new Date() } as never] } });
        expect(matchesContentType(withAttach, 'hasAttachments', [])).toBe(true);
        expect(matchesContentType(makeNode(), 'hasAttachments', [])).toBe(false);
    });
    it('hasConnections checks edges', () => {
        const edges = [makeEdge('n1', 'n2')];
        expect(matchesContentType(makeNode({ id: 'n1' }), 'hasConnections', edges)).toBe(true);
        expect(matchesContentType(makeNode({ id: 'n3' }), 'hasConnections', edges)).toBe(false);
    });
    it('noOutput returns nodes without AI output', () => {
        expect(matchesContentType(makeNode({ data: { output: undefined } }), 'noOutput', [])).toBe(true);
        expect(matchesContentType(makeNode({ data: { output: 'text' } }), 'noOutput', [])).toBe(false);
    });
    it('all returns true', () => {
        expect(matchesContentType(makeNode(), 'all', [])).toBe(true);
    });
});

describe('applyFilters', () => {
    const nodes = [
        makeNode({ id: 'n1', data: { tags: ['react'], output: 'yes' }, workspaceId: 'ws-1' }),
        makeNode({ id: 'n2', data: { tags: ['vue'], output: '' }, workspaceId: 'ws-2' }),
        makeNode({ id: 'n3', data: { tags: ['react', 'hooks'] }, workspaceId: 'ws-1' }),
    ];

    it('composes all predicates (AND logic)', () => {
        const result = applyFilters(nodes, [], { tags: ['react'], contentType: 'hasOutput' });
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('n1');
    });
    it('with no filters returns all nodes', () => {
        expect(applyFilters(nodes, [], {})).toHaveLength(3);
    });
    it('workspace scope limits results', () => {
        const result = applyFilters(nodes, [], { workspaceId: 'ws-2' });
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('n2');
    });
});
