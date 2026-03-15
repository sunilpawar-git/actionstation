/**
 * Grid Layout Service — Pinned node exclusion tests
 * Covers: pinned nodes retain position, ordering, and calculateMasonryPosition exclusion
 */
import { describe, it, expect } from 'vitest';
import { calculateMasonryPosition, arrangeMasonry } from '../gridLayoutService';
import type { CanvasNode } from '../../types/node';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../types/node';
import { collidesWithAny } from '../spiralPlacement';

const createMockNode = (id: string, overrides?: Partial<CanvasNode>): CanvasNode => ({
    id,
    workspaceId: 'ws-1',
    type: 'idea',
    position: { x: 0, y: 0 },
    width: 280,
    height: 220,
    data: { prompt: '', output: '', tags: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

describe('Grid Layout Service — Pinned Node Exclusion', () => {
    describe('arrangeMasonry with pinned nodes', () => {
        it('should NOT move pinned nodes — they retain their original position', () => {
            const nodes = [
                createMockNode('n0', {
                    position: { x: 500, y: 500 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-01'),
                }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
                createMockNode('n2', { createdAt: new Date('2024-01-03') }),
            ];

            const arranged = arrangeMasonry(nodes);
            const pinnedNode = arranged.find(n => n.id === 'n0');

            expect(pinnedNode!.position.x).toBe(500);
            expect(pinnedNode!.position.y).toBe(500);
        });

        it('should arrange only unpinned nodes in the grid', () => {
            const nodes = [
                createMockNode('pinned1', {
                    position: { x: 999, y: 999 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-01'),
                }),
                createMockNode('free1', { createdAt: new Date('2024-01-02') }),
                createMockNode('free2', { createdAt: new Date('2024-01-03') }),
                createMockNode('free3', { createdAt: new Date('2024-01-04') }),
            ];

            const arranged = arrangeMasonry(nodes);

            expect(arranged.find(n => n.id === 'pinned1')!.position).toEqual({ x: 999, y: 999 });

            expect(arranged.find(n => n.id === 'free1')!.position).toEqual({ x: 32, y: 32 });
            expect(arranged.find(n => n.id === 'free2')!.position).toEqual({ x: 352, y: 32 });
            expect(arranged.find(n => n.id === 'free3')!.position).toEqual({ x: 672, y: 32 });
        });

        it('should return all nodes (pinned + unpinned) in the result', () => {
            const nodes = [
                createMockNode('pinned1', {
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-01'),
                }),
                createMockNode('free1', { createdAt: new Date('2024-01-02') }),
            ];

            const arranged = arrangeMasonry(nodes);
            expect(arranged).toHaveLength(2);
            expect(arranged.map(n => n.id).sort()).toEqual(['free1', 'pinned1']);
        });

        it('should handle all nodes pinned — no arrangement changes', () => {
            const nodes = [
                createMockNode('p1', {
                    position: { x: 100, y: 200 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-01'),
                }),
                createMockNode('p2', {
                    position: { x: 300, y: 400 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-02'),
                }),
            ];

            const arranged = arrangeMasonry(nodes);

            expect(arranged.find(n => n.id === 'p1')!.position).toEqual({ x: 100, y: 200 });
            expect(arranged.find(n => n.id === 'p2')!.position).toEqual({ x: 300, y: 400 });
        });

        it('should treat isPinned: false same as unpinned', () => {
            const nodes = [
                createMockNode('n0', {
                    data: { prompt: '', output: '', tags: [], isPinned: false },
                    createdAt: new Date('2024-01-01'),
                }),
                createMockNode('n1', {
                    data: { prompt: '', output: '', tags: [], isPinned: false },
                    createdAt: new Date('2024-01-02'),
                }),
            ];

            const arranged = arrangeMasonry(nodes);

            expect(arranged.find(n => n.id === 'n0')!.position.x).toBe(32);
            expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(352);
        });

        it('should treat undefined isPinned same as unpinned', () => {
            const nodes = [
                createMockNode('n0', { createdAt: new Date('2024-01-01') }),
                createMockNode('n1', { createdAt: new Date('2024-01-02') }),
            ];

            const arranged = arrangeMasonry(nodes);

            expect(arranged.find(n => n.id === 'n0')!.position.x).toBe(32);
            expect(arranged.find(n => n.id === 'n1')!.position.x).toBe(352);
        });
    });

    describe('arrangeMasonry array order', () => {
        it('should preserve input array order (pinned nodes stay at original index)', () => {
            const nodes = [
                createMockNode('free1', { createdAt: new Date('2024-01-01') }),
                createMockNode('pinned1', {
                    position: { x: 500, y: 500 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-02'),
                }),
                createMockNode('free2', { createdAt: new Date('2024-01-03') }),
            ];

            const arranged = arrangeMasonry(nodes);
            expect(arranged.map(n => n.id)).toEqual(['free1', 'pinned1', 'free2']);
        });

        it('should preserve order with multiple pinned nodes interspersed', () => {
            const nodes = [
                createMockNode('p1', {
                    position: { x: 100, y: 100 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-01'),
                }),
                createMockNode('f1', { createdAt: new Date('2024-01-02') }),
                createMockNode('p2', {
                    position: { x: 200, y: 200 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-03'),
                }),
                createMockNode('f2', { createdAt: new Date('2024-01-04') }),
            ];

            const arranged = arrangeMasonry(nodes);
            expect(arranged.map(n => n.id)).toEqual(['p1', 'f1', 'p2', 'f2']);
        });
    });

    describe('calculateMasonryPosition with pinned nodes', () => {
        it('should avoid pinned node at grid origin when all nodes are pinned', () => {
            const nodes = [
                createMockNode('pinned', {
                    position: { x: 32, y: 32 },
                    data: { prompt: '', output: '', tags: [], isPinned: true },
                    createdAt: new Date('2024-01-01'),
                }),
            ];

            const result = calculateMasonryPosition(nodes);
            expect(
                collidesWithAny(result.x, result.y, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, nodes),
            ).toBe(false);
        });
    });
});
