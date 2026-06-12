/**
 * TDD: templateInstantiator tests — write failing tests before implementation.
 */
import { describe, it, expect } from 'vitest';
import { instantiateTemplate } from '../templateInstantiator';
import type { WorkspaceTemplate } from '../../types/template';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const SIMPLE_TEMPLATE: WorkspaceTemplate = {
    id: 'test-template',
    name: 'Test',
    description: 'A simple test template',
    category: 'research',
    isCustom: false,
    nodes: [
        { templateId: 'n1', heading: 'Node One', output: 'Output one', position: { x: 0, y: 0 }, colorKey: 'default' },
        { templateId: 'n2', heading: 'Node Two', output: 'Output two', position: { x: 350, y: 0 }, colorKey: 'success' },
    ],
    edges: [
        { sourceTemplateId: 'n1', targetTemplateId: 'n2' },
    ],
};

const EMPTY_TEMPLATE: WorkspaceTemplate = {
    id: 'empty',
    name: 'Empty',
    description: '',
    category: 'custom',
    isCustom: true,
    nodes: [],
    edges: [],
};

const ORPHAN_EDGE_TEMPLATE: WorkspaceTemplate = {
    ...SIMPLE_TEMPLATE,
    edges: [
        { sourceTemplateId: 'n1', targetTemplateId: 'n2' },
        { sourceTemplateId: 'n1', targetTemplateId: 'n99' }, // orphaned — n99 does not exist
    ],
};

describe('instantiateTemplate', () => {
    it('all node IDs are replaced with idea-<uuid> format', () => {
        const { nodes } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        for (const node of nodes) {
            expect(node.id).toMatch(/^idea-/);
            expect(node.id.replace('idea-', '')).toMatch(UUID_PATTERN);
        }
    });

    it('no template placeholder IDs remain in output nodes', () => {
        const { nodes } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        const nodeIds = nodes.map((n) => n.id);
        expect(nodeIds).not.toContain('n1');
        expect(nodeIds).not.toContain('n2');
    });

    it('edges reference new node IDs, not placeholder IDs', () => {
        const { nodes, edges } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        const nodeIdSet = new Set(nodes.map((n) => n.id));
        for (const edge of edges) {
            expect(nodeIdSet.has(edge.sourceNodeId)).toBe(true);
            expect(nodeIdSet.has(edge.targetNodeId)).toBe(true);
        }
    });

    it('all nodes have the correct workspaceId', () => {
        const { nodes } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-abc');
        for (const node of nodes) {
            expect(node.workspaceId).toBe('ws-abc');
        }
    });

    it('all nodes have createdAt and updatedAt set as Date instances', () => {
        const { nodes } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        for (const node of nodes) {
            expect(node.createdAt).toBeInstanceOf(Date);
            expect(node.updatedAt).toBeInstanceOf(Date);
        }
    });

    it('node positions match the template positions exactly', () => {
        const { nodes } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        expect(nodes[0]!.position).toEqual({ x: 0, y: 0 });
        expect(nodes[1]!.position).toEqual({ x: 350, y: 0 });
    });

    it('node headings and outputs are copied from the template', () => {
        const { nodes } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        expect(nodes[0]!.data.heading).toBe('Node One');
        expect(nodes[0]!.data.output).toBe('Output one');
        expect(nodes[1]!.data.heading).toBe('Node Two');
        expect(nodes[1]!.data.output).toBe('Output two');
    });

    it('node colorKey is copied from the template', () => {
        const { nodes } = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        expect(nodes[0]!.data.colorKey).toBe('default');
        expect(nodes[1]!.data.colorKey).toBe('success');
    });

    it('empty template (0 nodes, 0 edges) produces empty arrays', () => {
        const { nodes, edges } = instantiateTemplate(EMPTY_TEMPLATE, 'ws-1');
        expect(nodes).toHaveLength(0);
        expect(edges).toHaveLength(0);
    });

    it('orphaned edge (target templateId missing) is silently dropped', () => {
        const { nodes, edges } = instantiateTemplate(ORPHAN_EDGE_TEMPLATE, 'ws-1');
        // n99 does not exist → that edge is dropped; the valid n1→n2 edge is kept
        expect(edges).toHaveLength(1);
        expect(nodes).toHaveLength(2);
    });

    it('two separate instantiations of the same template produce different node IDs', () => {
        const result1 = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        const result2 = instantiateTemplate(SIMPLE_TEMPLATE, 'ws-1');
        const ids1 = result1.nodes.map((n) => n.id);
        const ids2 = result2.nodes.map((n) => n.id);
        expect(ids1).not.toEqual(ids2);
    });
});
