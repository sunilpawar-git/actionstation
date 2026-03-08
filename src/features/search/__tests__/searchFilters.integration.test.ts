/**
 * Search Filters — Integration Tests
 */
import { describe, it, expect } from 'vitest';
import { applyFilters } from '../services/searchFilters';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

describe('searchFilters integration', () => {
    const now = new Date('2025-06-15');
    const oldDate = new Date('2024-01-01');

    const nodes: CanvasNode[] = [
        {
            id: 'n1', workspaceId: 'ws-1', type: 'idea',
            data: { heading: 'React hooks', tags: ['react', 'frontend'], output: 'AI output here' },
            position: { x: 0, y: 0 }, createdAt: now, updatedAt: now,
        },
        {
            id: 'n2', workspaceId: 'ws-1', type: 'idea',
            data: { heading: 'TypeScript', tags: ['typescript'], output: '' },
            position: { x: 100, y: 0 }, createdAt: oldDate, updatedAt: oldDate,
        },
        {
            id: 'n3', workspaceId: 'ws-2', type: 'idea',
            data: { heading: 'CSS Grid', tags: ['frontend'], output: 'Grid layout' },
            position: { x: 200, y: 0 }, createdAt: now, updatedAt: now,
        },
    ];

    const edges: CanvasEdge[] = [
        { id: 'e1', workspaceId: 'ws-1', sourceNodeId: 'n1', targetNodeId: 'n2', relationshipType: 'related' },
    ];

    it('applyFilters with real CanvasNode shapes', () => {
        const result = applyFilters(nodes, edges, { tags: ['react'] });
        expect(result).toHaveLength(1);
        expect(result[0]!.id).toBe('n1');
    });

    it('filter composition: tag + date + contentType all applied', () => {
        const result = applyFilters(nodes, edges, {
            tags: ['frontend'],
            dateRange: { from: new Date('2025-01-01'), to: null },
            contentType: 'hasOutput',
        });
        // n1 has tag frontend, after 2025-01-01, has output
        // n3 has tag frontend, after 2025-01-01, has output
        expect(result.map((n: { id: string }) => n.id).sort()).toEqual(['n1', 'n3']);
    });

    it('empty node array returns empty', () => {
        expect(applyFilters([], [], { tags: ['react'] })).toEqual([]);
    });
});
