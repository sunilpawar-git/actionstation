/**
 * Node Pool Builder Tests — TDD RED phase
 * Pure function tests for getPooledNodes, nodeToPoolEntry, buildNodePoolContext
 */
import { describe, it, expect } from 'vitest';
import { getPooledNodes, nodeToPoolEntry, buildNodePoolContext } from '../nodePoolBuilder';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { Workspace } from '@/features/workspace/types/workspace';

function makeNode(id: string, overrides: Partial<CanvasNode['data']> = {}): CanvasNode {
    return {
        id,
        workspaceId: 'ws-1',
        type: 'idea',
        data: { heading: `Node ${id}`, output: `Content of ${id}`, ...overrides },
        position: { x: 0, y: 0 },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
    };
}

function makeWorkspace(includeAll = false): Workspace {
    return {
        id: 'ws-1',
        userId: 'u1',
        name: 'Test',
        canvasSettings: { backgroundColor: 'grid' },
        createdAt: new Date(),
        updatedAt: new Date(),
        includeAllNodesInPool: includeAll,
    };
}

describe('getPooledNodes', () => {
    const nodes = [
        makeNode('n1', { includeInAIPool: true }),
        makeNode('n2', { includeInAIPool: false }),
        makeNode('n3', { includeInAIPool: true }),
        makeNode('n4'),
    ];

    it('returns only starred nodes when workspace pool is off', () => {
        const result = getPooledNodes(nodes, makeWorkspace(false), new Set());
        expect(result.map((n) => n.id)).toEqual(['n1', 'n3']);
    });

    it('returns all nodes when workspace pool is on', () => {
        const result = getPooledNodes(nodes, makeWorkspace(true), new Set());
        expect(result.map((n) => n.id)).toEqual(['n1', 'n2', 'n3', 'n4']);
    });

    it('excludes nodes in the exclusion set', () => {
        const result = getPooledNodes(nodes, makeWorkspace(true), new Set(['n1', 'n3']));
        expect(result.map((n) => n.id)).toEqual(['n2', 'n4']);
    });

    it('excludes current node + upstream chain from starred nodes', () => {
        const result = getPooledNodes(nodes, makeWorkspace(false), new Set(['n1']));
        expect(result.map((n) => n.id)).toEqual(['n3']);
    });

    it('returns empty array when no nodes are pooled', () => {
        const unpooled = [makeNode('n1'), makeNode('n2')];
        const result = getPooledNodes(unpooled, makeWorkspace(false), new Set());
        expect(result).toEqual([]);
    });

    it('handles null workspace gracefully', () => {
        const result = getPooledNodes(nodes, null, new Set());
        expect(result.map((n) => n.id)).toEqual(['n1', 'n3']);
    });

    it('deduplicates when workspace pool is on and node is also starred', () => {
        const result = getPooledNodes(nodes, makeWorkspace(true), new Set());
        const ids = result.map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('nodeToPoolEntry', () => {
    it('maps heading to title and output to content', () => {
        const node = makeNode('n1', { heading: 'My Idea', output: 'Some text', tags: ['t1'] });
        const entry = nodeToPoolEntry(node);
        expect(entry).toEqual({
            id: 'n1',
            title: 'My Idea',
            content: 'My Idea\n\nSome text',
            tags: ['t1'],
        });
    });

    it('handles missing heading gracefully', () => {
        const node = makeNode('n1', { heading: undefined, output: 'Just output' });
        const entry = nodeToPoolEntry(node);
        expect(entry.title).toBe('Untitled Node');
        expect(entry.content).toBe('Just output');
    });

    it('handles missing output gracefully', () => {
        const node = makeNode('n1', { heading: 'Title Only', output: undefined });
        const entry = nodeToPoolEntry(node);
        expect(entry.title).toBe('Title Only');
        expect(entry.content).toBe('Title Only');
    });

    it('handles missing tags gracefully', () => {
        const node = makeNode('n1', { tags: undefined });
        const entry = nodeToPoolEntry(node);
        expect(entry.tags).toEqual([]);
    });
});

describe('buildNodePoolContext', () => {
    const nodes = [
        makeNode('n1', { includeInAIPool: true, heading: 'Strategy', output: 'We need a plan' }),
        makeNode('n2', { includeInAIPool: true, heading: 'Vision', output: 'Long term goals' }),
        makeNode('n3', { heading: 'Unstarred', output: 'Not in pool' }),
    ];

    it('returns empty string when no nodes are pooled', () => {
        const unpooled = [makeNode('n1', { heading: 'X', output: 'Y' })];
        const result = buildNodePoolContext(unpooled, makeWorkspace(false), 'test', 'single', new Set());
        expect(result).toBe('');
    });

    it('wraps entries in AI Memory header/footer', () => {
        const result = buildNodePoolContext(nodes, makeWorkspace(false), 'plan', 'single', new Set());
        expect(result).toContain('--- AI Memory ---');
        expect(result).toContain('--- End AI Memory ---');
    });

    it('formats entries as [Memory: Title]', () => {
        const result = buildNodePoolContext(nodes, makeWorkspace(false), 'plan', 'single', new Set());
        expect(result).toContain('[Memory: Strategy]');
        expect(result).toContain('[Memory: Vision]');
    });

    it('does not include unstarred nodes when workspace pool is off', () => {
        const result = buildNodePoolContext(nodes, makeWorkspace(false), 'plan', 'single', new Set());
        expect(result).not.toContain('Unstarred');
    });

    it('includes all nodes when workspace pool is on', () => {
        const result = buildNodePoolContext(nodes, makeWorkspace(true), 'plan', 'single', new Set());
        expect(result).toContain('[Memory: Unstarred]');
    });

    it('excludes nodes in the exclusion set', () => {
        const result = buildNodePoolContext(nodes, makeWorkspace(false), 'plan', 'single', new Set(['n1']));
        expect(result).not.toContain('Strategy');
        expect(result).toContain('Vision');
    });

    it('respects token budget', () => {
        const largeNodes = Array.from({ length: 100 }, (_, i) =>
            makeNode(`n${i}`, {
                includeInAIPool: true,
                heading: `Idea ${i}`,
                output: 'A'.repeat(1000),
            }),
        );
        const result = buildNodePoolContext(largeNodes, makeWorkspace(false), 'test', 'transform', new Set());
        expect(result.length).toBeLessThan(100 * 1000);
    });
});
