/**
 * findSimilar — Unit Tests
 */
import { describe, it, expect } from 'vitest';
import { findSimilarNodes, cosineSimilarity } from '../findSimilar';
import type { CanvasNode } from '@/features/canvas/types/node';

function makeNode(id: string, heading: string, output = ''): CanvasNode {
    return {
        id, workspaceId: 'ws-1', type: 'idea',
        data: { heading, output },
        position: { x: 0, y: 0 },
        createdAt: new Date(), updatedAt: new Date(),
    };
}

describe('findSimilarNodes', () => {
    it('returns empty for non-existent node', () => {
        const nodes = [makeNode('n1', 'React hooks')];
        expect(findSimilarNodes('nonexistent', nodes)).toEqual([]);
    });

    it('returns empty for node with no text', () => {
        const nodes = [makeNode('n1', '', ''), makeNode('n2', 'React hooks')];
        expect(findSimilarNodes('n1', nodes)).toEqual([]);
    });

    it('similar content nodes score high (>0.15)', () => {
        // Need 6+ diverse nodes so shared terms between n1 & n2 get non-zero IDF
        // (With only 3 docs, terms in 2/3 get IDF = log(3/3) = 0)
        const nodes = [
            makeNode('n1', 'React hooks state management', 'useState useEffect useReducer context custom hooks'),
            makeNode('n2', 'React hooks patterns guide', 'useState useEffect patterns hooks tutorial'),
            makeNode('n3', 'Cooking pasta recipe', 'Italian cuisine Mediterranean fresh ingredients'),
            makeNode('n4', 'Photography tips camera', 'aperture shutter exposure lens settings'),
            makeNode('n5', 'Guitar chords music theory', 'acoustic electric strings melody rhythm'),
            makeNode('n6', 'Gardening plants flowers', 'roses tulips sunflowers garden soil'),
            makeNode('n7', 'Travel backpacking adventure', 'hiking camping mountains trails gear'),
            makeNode('n8', 'Finance investing stocks', 'portfolio dividends market growth bonds'),
        ];
        const results = findSimilarNodes('n1', nodes);
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results[0]!.nodeId).toBe('n2');
    });

    it('dissimilar content nodes excluded (below threshold)', () => {
        const nodes = [
            makeNode('n1', 'Quantum physics theory', 'particles and waves'),
            makeNode('n2', 'Italian cooking recipes', 'pasta and pizza'),
        ];
        const results = findSimilarNodes('n1', nodes);
        expect(results).toHaveLength(0);
    });

    it('results sorted by similarity descending', () => {
        const nodes = [
            makeNode('n1', 'React hooks useState useEffect', 'React state management'),
            makeNode('n2', 'React hooks', 'useState'),
            makeNode('n3', 'React hooks tutorial useState useEffect custom', 'React state custom hooks tutorial'),
        ];
        const results = findSimilarNodes('n1', nodes);
        if (results.length >= 2) {
            expect(results[0]!.similarity).toBeGreaterThanOrEqual(results[1]!.similarity);
        }
    });

    it('results capped at topN', () => {
        const nodes = [
            makeNode('source', 'React hooks', 'React state management'),
            ...Array.from({ length: 20 }, (_, i) =>
                makeNode(`n${i}`, `React hooks variant ${i}`, `React state management variant ${i}`),
            ),
        ];
        const results = findSimilarNodes('source', nodes, 3);
        expect(results.length).toBeLessThanOrEqual(3);
    });

    it('source node excluded from results', () => {
        const nodes = [
            makeNode('n1', 'React hooks', 'useState'),
            makeNode('n2', 'React hooks', 'useState'),
        ];
        const results = findSimilarNodes('n1', nodes);
        expect(results.every((r) => r.nodeId !== 'n1')).toBe(true);
    });
});

describe('cosineSimilarity', () => {
    it('returns 1.0 for identical vectors', () => {
        const v = new Map([['react', 0.5], ['hooks', 0.3]]);
        expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
    });

    it('returns 0 for orthogonal vectors', () => {
        const a = new Map([['react', 1]]);
        const b = new Map([['cooking', 1]]);
        expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('returns 0 for empty vectors', () => {
        expect(cosineSimilarity(new Map(), new Map())).toBe(0);
    });
});
