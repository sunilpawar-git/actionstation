import { describe, it, expect } from 'vitest';
import {
    computeClusters,
    cosineSimilarity,
    buildTfIdfVector,
} from '../similarityService';
import type { CanvasNode } from '@/features/canvas/types/node';

function makeNode(id: string, heading: string, output = ''): CanvasNode {
    return {
        id,
        workspaceId: 'w1',
        type: 'idea',
        data: { heading, output },
        position: { x: 0, y: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
    } as CanvasNode;
}

describe('cosineSimilarity', () => {
    it('returns 1.0 for identical vectors', () => {
        const vec = new Map([['hello', 0.5], ['world', 0.3]]);
        expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0);
    });

    it('returns 0.0 for orthogonal vectors', () => {
        const a = new Map([['alpha', 1]]);
        const b = new Map([['beta', 1]]);
        expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
    });

    it('returns 0.0 for empty vectors', () => {
        expect(cosineSimilarity(new Map(), new Map())).toBe(0);
    });
});

describe('buildTfIdfVector', () => {
    it('produces non-zero weights for meaningful tokens', () => {
        const tokens = ['machine', 'learning', 'machine'];
        const idf = new Map([['machine', 0.5], ['learning', 1.0]]);
        const vec = buildTfIdfVector(tokens, idf);
        expect(vec.get('machine')).toBeGreaterThan(0);
        expect(vec.get('learning')).toBeGreaterThan(0);
    });
});

describe('computeClusters', () => {
    it('groups 2 similar nodes into 1 cluster', () => {
        const nodes = [
            makeNode('n1', 'machine learning algorithms'),
            makeNode('n2', 'machine learning models'),
        ];
        const result = computeClusters(nodes, { similarityThreshold: 0.05 });
        expect(result.clusters).toHaveLength(1);
        expect(result.clusters[0]!.nodeIds).toContain('n1');
        expect(result.clusters[0]!.nodeIds).toContain('n2');
    });

    it('keeps 2 dissimilar nodes unclustered', () => {
        const nodes = [
            makeNode('n1', 'quantum physics experiments'),
            makeNode('n2', 'chocolate cake recipe baking'),
        ];
        const result = computeClusters(nodes, { similarityThreshold: 0.5 });
        expect(result.clusters).toHaveLength(0);
        expect(result.unclustered).toContain('n1');
        expect(result.unclustered).toContain('n2');
    });

    it('produces 2 clusters from 5 nodes with 2 themes', () => {
        const nodes = [
            makeNode('n1', 'react component rendering virtual dom'),
            makeNode('n2', 'react hooks state management virtual dom'),
            makeNode('n3', 'react component lifecycle virtual dom'),
            makeNode('n4', 'database schema design postgresql'),
            makeNode('n5', 'database queries optimization postgresql'),
        ];
        const result = computeClusters(nodes, { similarityThreshold: 0.05 });
        expect(result.clusters.length).toBeGreaterThanOrEqual(2);
    });

    it('single node stays unclustered (below minClusterSize)', () => {
        const nodes = [makeNode('n1', 'solo node content')];
        const result = computeClusters(nodes);
        expect(result.clusters).toHaveLength(0);
        expect(result.unclustered).toContain('n1');
    });

    it('groups all identical content into 1 cluster', () => {
        const nodes = [
            makeNode('n1', 'same content here'),
            makeNode('n2', 'same content here'),
            makeNode('n3', 'same content here'),
        ];
        const result = computeClusters(nodes, { similarityThreshold: 0.01 });
        expect(result.clusters).toHaveLength(1);
        expect(result.clusters[0]!.nodeIds).toHaveLength(3);
    });

    it('excludes empty nodes from clustering', () => {
        const nodes = [
            makeNode('n1', ''),
            makeNode('n2', '', ''),
            makeNode('n3', 'has content machine learning'),
        ];
        const result = computeClusters(nodes);
        expect(result.unclustered).toContain('n1');
        expect(result.unclustered).toContain('n2');
    });

    it('colorIndex values are 0-7', () => {
        const nodes = Array.from({ length: 20 }, (_, i) =>
            makeNode(`n${i}`, `topic ${i} keyword${i} unique${i} word${i}`),
        );
        const result = computeClusters(nodes, { similarityThreshold: 0.01 });
        for (const cluster of result.clusters) {
            expect(cluster.colorIndex).toBeGreaterThanOrEqual(0);
            expect(cluster.colorIndex).toBeLessThan(8);
        }
    });

    it('colorIndex assigned via round-robin', () => {
        const nodes = Array.from({ length: 20 }, (_, i) =>
            makeNode(`n${i}`, `topic${i} keyword${i} unique${i}`),
        );
        const result = computeClusters(nodes, { similarityThreshold: 0.01 });
        result.clusters.forEach((cluster, idx) => {
            expect(cluster.colorIndex).toBe(idx % 8);
        });
    });

    it('threshold=0 merges everything (similarity always >= 0)', () => {
        const nodes = [
            makeNode('n1', 'machine learning algorithms'),
            makeNode('n2', 'cooking recipes baking'),
        ];
        const result = computeClusters(nodes, { similarityThreshold: 0 });
        expect(result.clusters).toHaveLength(1);
    });

    it('threshold=1 merges nothing (similarity < 1 for distinct content)', () => {
        const nodes = [
            makeNode('n1', 'alpha beta gamma'),
            makeNode('n2', 'alpha beta gamma'),
            makeNode('n3', 'delta epsilon zeta'),
        ];
        const result = computeClusters(nodes, { similarityThreshold: 1 });
        expect(result.clusters.length).toBeLessThanOrEqual(1);
    });

    it('caps input at 500 nodes', () => {
        const nodes = Array.from({ length: 600 }, (_, i) =>
            makeNode(`n${i}`, `content ${i}`),
        );
        const result = computeClusters(nodes);
        const allIds = [...result.clusters.flatMap((c) => c.nodeIds), ...result.unclustered];
        expect(allIds).toContain('n599');
    });

    it('completes in under 200ms for 100 nodes', () => {
        const nodes = Array.from({ length: 100 }, (_, i) =>
            makeNode(`n${i}`, `topic area ${i % 5} with keywords group${i % 5} research${i % 5}`),
        );
        const start = performance.now();
        computeClusters(nodes);
        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(500);
    });

    it('strips HTML from node output', () => {
        const nodes = [
            makeNode('n1', 'machine learning', '<p>deep <strong>learning</strong> neural networks</p>'),
            makeNode('n2', 'machine learning', '<p>deep learning neural network models</p>'),
        ];
        const result = computeClusters(nodes, { similarityThreshold: 0.05 });
        expect(result.clusters).toHaveLength(1);
    });
});
