/**
 * Unit tests for collidesWithAny — AABB collision detection primitive.
 * Pure function tests: no React, no Zustand, no side effects.
 */
import { describe, it, expect } from 'vitest';
import { collidesWithAny } from '../services/spiralPlacement';
import { createIdeaNode, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../types/node';
import { GRID_GAP } from '../services/gridConstants';

const WS = 'test-ws';
const now = new Date('2024-01-01');

function makeNode(
    id: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
) {
    const node = createIdeaNode(id, WS, { x, y });
    node.createdAt = now;
    if (width !== undefined) node.width = width;
    if (height !== undefined) node.height = height;
    return node;
}

describe('collidesWithAny', () => {
    it('returns false for empty node array', () => {
        expect(collidesWithAny(0, 0, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, [])).toBe(false);
    });

    it('returns false when candidate is fully to the right', () => {
        const nodes = [makeNode('a', 0, 0)];
        const farRight = DEFAULT_NODE_WIDTH + 100;
        expect(collidesWithAny(farRight, 0, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(false);
    });

    it('returns false when candidate is fully below', () => {
        const nodes = [makeNode('a', 0, 0)];
        const farBelow = DEFAULT_NODE_HEIGHT + 100;
        expect(collidesWithAny(0, farBelow, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(false);
    });

    it('returns true for exact overlap', () => {
        const nodes = [makeNode('a', 100, 100)];
        expect(collidesWithAny(100, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(true);
    });

    it('returns true for partial right-edge overlap', () => {
        const nodes = [makeNode('a', 100, 100)];
        const partialX = 100 + DEFAULT_NODE_WIDTH - 10;
        expect(collidesWithAny(partialX, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(true);
    });

    it('returns true for partial bottom-edge overlap', () => {
        const nodes = [makeNode('a', 100, 100)];
        const partialY = 100 + DEFAULT_NODE_HEIGHT - 10;
        expect(collidesWithAny(100, partialY, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(true);
    });

    it('returns true for corner overlap', () => {
        const nodes = [makeNode('a', 100, 100)];
        const cornerX = 100 + DEFAULT_NODE_WIDTH - 1;
        const cornerY = 100 + DEFAULT_NODE_HEIGHT - 1;
        expect(collidesWithAny(cornerX, cornerY, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(true);
    });

    it('returns false for adjacent nodes (touching edges, zero overlap)', () => {
        const nodes = [makeNode('a', 0, 0)];
        const adjacentX = DEFAULT_NODE_WIDTH;
        expect(collidesWithAny(adjacentX, 0, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(false);
    });

    it('returns false for nodes separated by GRID_GAP', () => {
        const nodes = [makeNode('a', 0, 0)];
        const gappedX = DEFAULT_NODE_WIDTH + GRID_GAP;
        expect(collidesWithAny(gappedX, 0, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(false);
    });

    it('handles nodes with custom width/height', () => {
        const wideNode = makeNode('wide', 50, 50, 500, 400);
        const nodes = [wideNode];
        expect(collidesWithAny(200, 200, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(true);
        expect(collidesWithAny(600, 50, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(false);
    });

    it('handles nodes with undefined width/height (uses defaults)', () => {
        const node = makeNode('bare', 100, 100);
        delete (node as unknown as Record<string, unknown>).width;
        delete (node as unknown as Record<string, unknown>).height;
        const nodes = [node];
        expect(collidesWithAny(100, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(true);
        const outsideX = 100 + DEFAULT_NODE_WIDTH + 1;
        expect(collidesWithAny(outsideX, 100, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes)).toBe(false);
    });
});
